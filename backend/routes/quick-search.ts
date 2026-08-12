import { FastifyInstance } from 'fastify';
import { queryWithCircuitBreaker } from '../db.js';
import { getCached, setCached } from '../cache.js';

interface QuickSearchQuery {
  term?: string;
  type?: 'old' | 'new';
}

export async function quickSearchRoute(fastify: FastifyInstance) {
  fastify.get<{ Querystring: QuickSearchQuery }>('/api/quick-search', {
    config: {
      rateLimit: {
        max: 120,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { term, type } = request.query;

    if (!term || term.trim().length < 2) {
      return reply.send([]);
    }
    if (type !== 'old' && type !== 'new') {
      return reply.status(400).send({ error: "Tham số 'type' không hợp lệ." });
    }

    const cleanTerm = term.trim();
    const cacheKey = `sapnhap:search:${type}:${cleanTerm.toLowerCase()}`;

    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      return reply.send(cached);
    }

    try {
      let rows: any[] = [];
      const searchTerm = `%${cleanTerm}%`;

      if (type === 'old') {
        const sql = `
          SELECT old_ward_code, old_ward_name, old_district_name, old_province_name
          FROM old_wards
          WHERE old_ward_name ILIKE $1 OR old_district_name ILIKE $1 OR old_province_name ILIKE $1
          LIMIT 20
        `;
        const res = await queryWithCircuitBreaker(sql, [searchTerm]);
        rows = res.rows;
      } else {
        const sql = `
          SELECT new_ward_code, new_ward_name, new_district_name, new_province_name
          FROM new_wards
          WHERE new_ward_name ILIKE $1 OR new_district_name ILIKE $1 OR new_province_name ILIKE $1
          LIMIT 20
        `;
        const res = await queryWithCircuitBreaker(sql, [searchTerm]);
        rows = res.rows;
      }

      await setCached(cacheKey, rows, 3600); // Cache 1 hour
      reply.header('X-Cache', 'MISS');
      return reply.send(rows);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Lỗi máy chủ.' });
    }
  });
}
