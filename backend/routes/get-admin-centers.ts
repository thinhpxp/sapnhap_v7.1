import { FastifyInstance } from 'fastify';
import { queryWithCircuitBreaker } from '../db.js';
import { getCached, setCached } from '../cache.js';

interface AdminCentersQuery {
  ward_code?: string;
  province_code?: string;
}

export async function getAdminCentersRoute(fastify: FastifyInstance) {
  fastify.get<{ Querystring: AdminCentersQuery }>('/api/get-admin-centers', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { ward_code, province_code } = request.query;

    if (!ward_code || !province_code) {
      return reply.status(400).send({ error: 'Thiếu tham số ward_code hoặc province_code.' });
    }

    const wardCode = parseInt(ward_code, 10);
    const provinceCode = parseInt(province_code, 10);

    if (isNaN(wardCode) || isNaN(provinceCode)) {
      return reply.status(400).send({ error: 'Tham số ward_code hoặc province_code không hợp lệ.' });
    }

    const cacheKey = `sapnhap:admin_centers:${wardCode}:${provinceCode}`;
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return reply.send(cached);
    }

    try {
      const [wardRes, provinceRes] = await Promise.all([
        queryWithCircuitBreaker(
          `SELECT agency_type, address FROM ward_admin_centers WHERE new_ward_code = $1`,
          [wardCode]
        ),
        queryWithCircuitBreaker(
          `SELECT agency_type, address FROM province_admin_centers WHERE new_province_code = $1`,
          [provinceCode]
        ),
      ]);

      const combined = [...wardRes.rows, ...provinceRes.rows];

      await setCached(cacheKey, combined, 86400); // Cache 24h
      reply.header('X-Cache', 'MISS');
      reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return reply.send(combined);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Lỗi máy chủ nội bộ khi lấy địa chỉ trung tâm hành chính.' });
    }
  });
}
