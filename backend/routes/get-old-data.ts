import { FastifyInstance } from 'fastify';
// @ts-ignore
import { allProvincesData } from '../../data/old_data.js';

export async function getOldDataRoute(fastify: FastifyInstance) {
  fastify.get('/api/get-old-data', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    try {
      reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return reply.send(allProvincesData);
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Lỗi máy chủ khi lấy dữ liệu hành chính cũ.' });
    }
  });
}
