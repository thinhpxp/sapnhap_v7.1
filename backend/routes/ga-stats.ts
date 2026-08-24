import { FastifyInstance } from 'fastify';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getCached, setCached } from '../cache.js';
import { encryptPayload } from '../utils/cipher.js';

const propertyId = process.env.GA4_PROPERTY_ID;

const CACHE_TTL = {
  events: 900,    // 15 minutes
  realtime: 120,  // 2 minutes
};

const CLICK_EVENTS_TO_SUM = [
  'Event_lookup',
  'Event_Quick_Search_Old',
  'Event_Quick_Search_New',
  'Event_lookup_button_click',
];

function getAnalyticsClient(): BetaAnalyticsDataClient | null {
  try {
    let credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
    if (!credsJson) return null;
    if (
      (credsJson.startsWith("'") && credsJson.endsWith("'")) ||
      (credsJson.startsWith('"') && credsJson.endsWith('"'))
    ) {
      credsJson = credsJson.slice(1, -1).trim();
    }
    const credentials = JSON.parse(credsJson);
    return new BetaAnalyticsDataClient({ credentials });
  } catch (error: any) {
    console.error('LỖI CẤU HÌNH GOOGLE CREDENTIALS:', error.message);
    return null;
  }
}

async function fetchEventCountFromGA(client: BetaAnalyticsDataClient) {
  const [gaResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '2025-07-01', endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
  });

  let totalClicks = 0;
  const eventCounts: Record<string, number> = {};

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

async function fetchRealtimeFromGA(client: BetaAnalyticsDataClient) {
  const [realtimeResponse] = await client.runRealtimeReport({
    property: `properties/${propertyId}`,
    dimensions: [{ name: 'city' }, { name: 'country' }],
    metrics: [{ name: 'activeUsers' }],
  });

  const locations: Array<{ city: string; country: string; count: number }> = [];
  if (realtimeResponse && realtimeResponse.rows) {
    realtimeResponse.rows.forEach((row) => {
      const city = row.dimensionValues?.[0]?.value || '';
      const country = row.dimensionValues?.[1]?.value || '';
      const userCount = parseInt(row.metricValues?.[0]?.value || '0', 10);
      if (city && city !== '(not set)' && userCount > 0) {
        locations.push({ city, country, count: userCount });
      }
    });
  }
  locations.sort((a, b) => b.count - a.count);
  const totalActiveUsers = locations.reduce((total, loc) => total + loc.count, 0);

  return { totalActiveUsers, activeLocations: locations };
}

export async function gaStatsRoute(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { report?: 'events' | 'realtime' } }>(
    '/api/ga-stats',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { report } = request.query;

      if (report !== 'events' && report !== 'realtime') {
        return reply.status(400).send({ error: 'Invalid report type' });
      }

      const ttl = CACHE_TTL[report];
      reply.header('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=60`);

      const cacheKey = `ga_${report}`;
      const cached = await getCached<any>(cacheKey);
      if (cached) {
        reply.header('X-Cache', 'HIT');
        return reply.send(encryptPayload(cached));
      }

      const analyticsClient = getAnalyticsClient();
      if (!analyticsClient || !propertyId) {
        return reply.status(503).send(encryptPayload({ error: 'Google Analytics credentials not configured' }));
      }

      try {
        let resultData = {};
        if (report === 'events') {
          resultData = await fetchEventCountFromGA(analyticsClient);
        } else {
          resultData = await fetchRealtimeFromGA(analyticsClient);
        }

        await setCached(cacheKey, resultData, ttl);
        reply.header('X-Cache', 'MISS');
        return reply.send(encryptPayload(resultData));
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send(encryptPayload({ error: error.message || 'Lỗi máy chủ nội bộ.' }));
      }
    }
  );
}
