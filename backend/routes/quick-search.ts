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
      let formattedResults: Array<{ code: number; name: string; context: string }> = [];
      const searchTerm = `%${cleanTerm}%`;

      if (type === 'old') {
        const sql = `
          SELECT old_ward_code, old_ward_name, old_district_name, old_province_name
          FROM old_wards
          WHERE old_ward_name ILIKE $1 OR old_district_name ILIKE $1 OR old_province_name ILIKE $1
          ORDER BY 
            CASE WHEN old_ward_name ILIKE $1 THEN 1 ELSE 2 END,
            old_ward_name ASC
          LIMIT 20
        `;
        const res = await queryWithCircuitBreaker(sql, [searchTerm]);
        formattedResults = res.rows.map((r: any) => ({
          code: r.old_ward_code,
          name: r.old_ward_name,
          context: `${r.old_district_name ? r.old_district_name + ', ' : ''}${r.old_province_name || ''}`,
        }));
      } else {
        const sql = `
          SELECT new_ward_code, new_ward_name, new_province_name
          FROM new_wards
          WHERE new_ward_name ILIKE $1 OR new_province_name ILIKE $1
          ORDER BY 
            CASE WHEN new_ward_name ILIKE $1 THEN 1 ELSE 2 END,
            new_ward_name ASC
          LIMIT 20
        `;
        const res = await queryWithCircuitBreaker(sql, [searchTerm]);
        formattedResults = res.rows.map((r: any) => ({
          code: r.new_ward_code,
          name: r.new_ward_name,
          context: r.new_province_name || '',
        }));
      }

      await setCached(cacheKey, formattedResults, 3600); // Cache 1 hour
      reply.header('X-Cache', 'MISS');
      return reply.send(formattedResults);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Lỗi máy chủ.' });
    }
  });
}
