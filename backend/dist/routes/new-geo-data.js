import { queryWithCircuitBreaker } from '../db.js';
import { getCached, setCached } from '../cache.js';
import { antiScrapingMiddleware } from '../middleware/anti-scrape.js';
export async function newGeoDataRoute(fastify) {
    fastify.get('/api/new-geo-data', {
        preHandler: [antiScrapingMiddleware],
        config: {
            rateLimit: {
                max: 60,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const { province_code } = request.query;
        try {
            if (province_code) {
                const provCodeNum = parseInt(province_code, 10);
                if (isNaN(provCodeNum)) {
                    return reply.status(400).send({ error: 'Mã tỉnh không hợp lệ.' });
                }
                const cacheKey = `sapnhap:geo:wards:${provCodeNum}`;
                const cached = await getCached(cacheKey);
                if (cached) {
                    reply.header('X-Cache', 'HIT');
                    reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
                    return reply.send(cached);
                }
                const sql = `
            SELECT DISTINCT 
              new_ward_code AS ward_code, 
              new_ward_name AS name, 
              new_ward_en_name AS en_name
            FROM merger_events
            WHERE new_province_code = $1 AND new_ward_code IS NOT NULL
            ORDER BY name ASC
          `;
                const res = await queryWithCircuitBreaker(sql, [provCodeNum]);
                await setCached(cacheKey, res.rows, 86400); // Cache 24h
                reply.header('X-Cache', 'MISS');
                reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
                return reply.send(res.rows);
            }
            else {
                const cacheKey = `sapnhap:geo:provinces`;
                const cached = await getCached(cacheKey);
                if (cached) {
                    reply.header('X-Cache', 'HIT');
                    reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
                    return reply.send(cached);
                }
                const sql = `
            SELECT DISTINCT 
              new_province_code AS province_code, 
              new_province_name AS name, 
              new_province_en_name AS en_name
            FROM merger_events
            WHERE new_province_code IS NOT NULL
            ORDER BY name ASC
          `;
                const res = await queryWithCircuitBreaker(sql, []);
                await setCached(cacheKey, res.rows, 86400); // Cache 24h
                reply.header('X-Cache', 'MISS');
                reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
                return reply.send(res.rows);
            }
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: 'Lỗi máy chủ.' });
        }
    });
}
