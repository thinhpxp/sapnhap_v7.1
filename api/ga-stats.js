// /api/ga-stats.js
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { createClient } from '@supabase/supabase-js';

// 1. Khởi tạo Google Analytics Client
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
});
const propertyId = process.env.GA4_PROPERTY_ID;

// 2. Khởi tạo Supabase Client (Dùng Service Role để ghi đè RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cấu hình thời gian cache (tính bằng mili giây)
const CACHE_DURATION = {
    events: 15 * 60 * 1000,    // 15 phút cho tổng sự kiện
    realtime: 2 * 60 * 1000    // 2 phút cho realtime
};

const CLICK_EVENTS_TO_SUM = [
    'Event_lookup',
    'Event_Quick_Search_Old',
    'Event_Quick_Search_New',
    'Event_lookup_button_click'
];

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  // Vẫn giữ cache trình duyệt nhẹ để giảm request tới server Vercel
  response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  const { report } = request.query;

  if (report !== 'events' && report !== 'realtime') {
      return response.status(400).json({ error: "Invalid report type" });
  }

  try {
      // --- BƯỚC 1: KIỂM TRA CACHE TỪ SUPABASE ---
      const cacheKey = `ga_${report}`;
      const { data: cacheData, error: cacheError } = await supabase
          .from('api_cache')
          .select('*')
          .eq('key', cacheKey)
          .single();

      const now = new Date();
      let shouldRefresh = true;

      if (cacheData && !cacheError) {
          const lastUpdate = new Date(cacheData.updated_at);
          // Nếu dữ liệu còn mới (chưa quá thời gian cache), dùng luôn
          if (now - lastUpdate < CACHE_DURATION[report]) {
              shouldRefresh = false;
              return response.status(200).json(cacheData.data);
          }
      }

      // --- BƯỚC 2: NẾU CACHE CŨ HOẶC KHÔNG CÓ, GỌI GOOGLE API ---
      if (shouldRefresh) {
          let resultData = {};

          if (report === 'events') {
              resultData = await fetchEventCountFromGA();
          } else {
              resultData = await fetchRealtimeFromGA();
          }

          // --- BƯỚC 3: LƯU KẾT QUẢ MỚI VÀO SUPABASE ---
          // Sử dụng upsert để cập nhật hoặc tạo mới
          await supabase
              .from('api_cache')
              .upsert({
                  key: cacheKey,
                  data: resultData,
                  updated_at: new Date().toISOString()
              });

          return response.status(200).json(resultData);
      }

  } catch (error) {
      console.error('Lỗi Server:', error);
      // Nếu lỗi server, cố gắng trả về dữ liệu cũ nếu có trong DB thay vì báo lỗi 500
      return response.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
}

// --- CÁC HÀM GỌI GA (Tách riêng để gọn code) ---

async function fetchEventCountFromGA() {
    const [gaResponse] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '2025-07-01', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
    });

    let totalClicks = 0;
    let eventCounts = {};

    if (gaResponse && gaResponse.rows) {
        gaResponse.rows.forEach(row => {
            const eventName = row.dimensionValues[0].value;
            const eventCount = parseInt(row.metricValues[0].value, 10);
            eventCounts[eventName] = eventCount;
            if (CLICK_EVENTS_TO_SUM.includes(eventName)) {
                totalClicks += eventCount;
            }
        });
    }
    return { totalClicks, allEvents: eventCounts };
}

async function fetchRealtimeFromGA() {
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: 'city' }, { name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
    });

    const locations = [];
    if (realtimeResponse && realtimeResponse.rows) {
        realtimeResponse.rows.forEach(row => {
            const city = row.dimensionValues[0].value;
            const country = row.dimensionValues[1].value;
            const userCount = parseInt(row.metricValues[0].value, 10);
            if (city && city !== '(not set)' && userCount > 0) {
                locations.push({ city, country, count: userCount });
            }
        });
    }
    locations.sort((a, b) => b.count - a.count);
    const totalActiveUsers = locations.reduce((total, loc) => total + loc.count, 0);

    return { totalActiveUsers, activeLocations: locations };
}