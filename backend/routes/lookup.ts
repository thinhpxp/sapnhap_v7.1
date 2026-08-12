import { FastifyInstance } from 'fastify';
import { queryWithCircuitBreaker } from '../db.js';
import { getCached, setCached } from '../cache.js';

interface LookupQuery {
  code?: string;
  type?: 'forward' | 'reverse';
}

export async function lookupRoute(fastify: FastifyInstance) {
  fastify.get<{ Querystring: LookupQuery }>('/api/lookup', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { code, type } = request.query;

    if (!code) {
      return reply.status(400).send({ error: 'Thiếu tham số code.' });
    }
    if (type !== 'forward' && type !== 'reverse') {
      return reply.status(400).send({ error: "Tham số 'type' phải là 'forward' hoặc 'reverse'." });
    }

    const wardCode = parseInt(code, 10);
    if (isNaN(wardCode)) {
      return reply.status(400).send({ error: 'Tham số code không hợp lệ.' });
    }

    const cacheKey = `sapnhap:lookup:${type}:${wardCode}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      reply.header('X-Cache', 'HIT');
      reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return reply.send(cached);
    }

    try {
      if (type === 'forward') {
        const eventsRes = await queryWithCircuitBreaker(
          `SELECT * FROM merger_events WHERE old_ward_code = $1`,
          [wardCode]
        );
        const villagesRes = await queryWithCircuitBreaker(
          `SELECT * FROM village_changes WHERE old_ward_code = $1`,
          [wardCode]
        );

        const result = {
          events: eventsRes.rows,
          village_changes: villagesRes.rows,
        };

        await setCached(cacheKey, result, 86400); // Cache 24h
        reply.header('X-Cache', 'MISS');
        reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return reply.send(result);
      } else {
        // Reverse lookup: list events by new_ward_code and attach village_changes
        const eventsRes = await queryWithCircuitBreaker(
          `SELECT * FROM merger_events WHERE new_ward_code = $1`,
          [wardCode]
        );

        const events = eventsRes.rows;
        const result = await Promise.all(
          events.map(async (event) => {
            const villagesRes = await queryWithCircuitBreaker(
              `SELECT * FROM village_changes WHERE old_ward_code = $1`,
              [event.old_ward_code]
            );
            return {
              ...event,
              village_changes: villagesRes.rows,
            };
          })
        );

        await setCached(cacheKey, result, 86400); // Cache 24h
        reply.header('X-Cache', 'MISS');
        reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return reply.send(result);
      }
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({
        error: 'Lỗi máy chủ.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  });
}
