import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getCached, setCached } from '../cache.js';
const propertyId = process.env.GA4_PROPERTY_ID;
const CACHE_TTL = {
    events: 900, // 15 minutes
    realtime: 120, // 2 minutes
    all: 120, // 2 minutes (bounded by realtime)
};
const CLICK_EVENTS_TO_SUM = [
    'Event_lookup',
    'Event_Quick_Search_Old',
    'Event_Quick_Search_New',
    'Event_lookup_button_click',
];
function getAnalyticsClient() {
    try {
        let credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
        if (!credsJson)
            return null;
        if ((credsJson.startsWith("'") && credsJson.endsWith("'")) ||
            (credsJson.startsWith('"') && credsJson.endsWith('"'))) {
            credsJson = credsJson.slice(1, -1).trim();
        }
        const credentials = JSON.parse(credsJson);
        return new BetaAnalyticsDataClient({ credentials });
    }
    catch (error) {
        console.error('LỖI CẤU HÌNH GOOGLE CREDENTIALS:', error.message);
        return null;
    }
}
async function fetchEventCountFromGA(client) {
    const [gaResponse] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '2025-07-01', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
    });
    let totalClicks = 0;
    const eventCounts = {};
    if (gaResponse && gaResponse.rows) {
        gaResponse.rows.forEach((row) => {
            const eventName = row.dimensionValues?.[0]?.value || '';
            const eventCount = parseInt(row.metricValues?.[0]?.value || '0', 10);
            eventCounts[eventName] = eventCount;
            if (CLICK_EVENTS_TO_SUM.includes(eventName)) {
                totalClicks += eventCount;
            }
        });
    }
    return { totalClicks, allEvents: eventCounts };
}
async function fetchRealtimeFromGA(client) {
    const [realtimeResponse] = await client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: 'city' }, { name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
    });
    let totalActiveUsers = 0;
    const locationMap = new Map();
    if (realtimeResponse && realtimeResponse.rows) {
        realtimeResponse.rows.forEach((row) => {
            const city = row.dimensionValues?.[0]?.value || '';
            const country = row.dimensionValues?.[1]?.value || '';
            const userCount = parseInt(row.metricValues?.[0]?.value || '0', 10);
            // Tính tổng tất cả active users từ GA4
            totalActiveUsers += userCount;
            if (userCount > 0) {
                const displayCity = (city && city !== '(not set)') ? city : (country && country !== '(not set)' ? country : 'Khác');
                const existing = locationMap.get(displayCity);
                if (existing) {
                    existing.count += userCount;
                }
                else {
                    locationMap.set(displayCity, { city: displayCity, country: country || '', count: userCount });
                }
            }
        });
    }
    const locations = Array.from(locationMap.values()).sort((a, b) => b.count - a.count);
    return { totalActiveUsers, activeLocations: locations };
}
export async function gaStatsRoute(fastify) {
    fastify.get('/api/ga-stats', {
        config: {
            rateLimit: {
                max: 60,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const { report = 'all' } = request.query;
        if (report !== 'events' && report !== 'realtime' && report !== 'all') {
            return reply.status(400).send({ error: 'Invalid report type' });
        }
        const analyticsClient = getAnalyticsClient();
        if (!analyticsClient || !propertyId) {
            return reply.status(503).send({ error: 'Google Analytics credentials not configured' });
        }
        try {
            if (report === 'all') {
                reply.header('Cache-Control', `public, s-maxage=${CACHE_TTL.all}, stale-while-revalidate=60`);
                const cacheKeyAll = 'ga_all';
                const cachedAll = await getCached(cacheKeyAll);
                if (cachedAll) {
                    reply.header('X-Cache', 'HIT');
                    return reply.send(cachedAll);
                }
                // 1. Get or fetch Events (15m TTL)
                const eventsKey = 'ga_events';
                let eventsData = await getCached(eventsKey);
                if (!eventsData) {
                    eventsData = await fetchEventCountFromGA(analyticsClient);
                    await setCached(eventsKey, eventsData, CACHE_TTL.events);
                }
                // 2. Get or fetch Realtime (2m TTL)
                const realtimeKey = 'ga_realtime';
                let realtimeData = await getCached(realtimeKey);
                if (!realtimeData) {
                    realtimeData = await fetchRealtimeFromGA(analyticsClient);
                    await setCached(realtimeKey, realtimeData, CACHE_TTL.realtime);
                }
                const combinedData = {
                    ...eventsData,
                    ...realtimeData,
                };
                await setCached(cacheKeyAll, combinedData, CACHE_TTL.all);
                reply.header('X-Cache', 'MISS');
                return reply.send(combinedData);
            }
            const ttl = CACHE_TTL[report];
            reply.header('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=60`);
            const cacheKey = `ga_${report}`;
            const cached = await getCached(cacheKey);
            if (cached) {
                reply.header('X-Cache', 'HIT');
                return reply.send(cached);
            }
            let resultData = {};
            if (report === 'events') {
                resultData = await fetchEventCountFromGA(analyticsClient);
            }
            else {
                resultData = await fetchRealtimeFromGA(analyticsClient);
            }
            await setCached(cacheKey, resultData, ttl);
            reply.header('X-Cache', 'MISS');
            return reply.send(resultData);
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({ error: error.message || 'Lỗi máy chủ nội bộ.' });
        }
    });
}
