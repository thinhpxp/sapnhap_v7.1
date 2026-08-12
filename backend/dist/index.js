import dotenv from 'dotenv';
dotenv.config();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { valkey } from './cache.js';
import { lookupRoute } from './routes/lookup.js';
import { quickSearchRoute } from './routes/quick-search.js';
import { newGeoDataRoute } from './routes/new-geo-data.js';
import { getAdminCentersRoute } from './routes/get-admin-centers.js';
import { getOldDataRoute } from './routes/get-old-data.js';
import { feedbackRoute } from './routes/feedback.js';
import { gaStatsRoute } from './routes/ga-stats.js';
const fastify = Fastify({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
});
// Register CORS
await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
});
// Register Global Rate Limiter with Valkey store
await fastify.register(rateLimit, {
    global: false, // Per-route configuration
    redis: valkey,
    keyGenerator: (req) => req.headers['cf-connecting-ip'] ??
        req.headers['x-real-ip'] ??
        req.ip,
});
// Health check endpoint
fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});
// Register routes
await fastify.register(lookupRoute);
await fastify.register(quickSearchRoute);
await fastify.register(newGeoDataRoute);
await fastify.register(getAdminCentersRoute);
await fastify.register(getOldDataRoute);
await fastify.register(feedbackRoute);
await fastify.register(gaStatsRoute);
const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';
try {
    await fastify.listen({ port, host });
    console.log(`🚀 Fastify Server listening on http://${host}:${port}`);
}
catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
