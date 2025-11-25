// /api/ga-stats.js
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { createClient } from '@supabase/supabase-js';

const propertyId = process.env.GA4_PROPERTY_ID;

// Khởi tạo Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CẤU HÌNH THỜI GIAN (Tính bằng GIÂY để dùng cho Header Cache-Control)
const CACHE_TTL = {
    events: 900,    // 15 phút (900 giây) - Tổng số liệu không cần cập nhật nhanh
    realtime: 120   // 2 phút (120 giây) - Realtime cập nhật nhanh hơn
};

// Cấu hình thời gian check database (tính bằng mili giây)
const DB_CACHE_DURATION = {
    events: CACHE_TTL.events * 1000,
    realtime: CACHE_TTL.realtime * 1000
};

const CLICK_EVENTS_TO_SUM = [
    'Event_lookup',
    'Event_Quick_Search_Old',
    'Event_Quick_Search_New',
    'Event_lookup_button_click'
];

// --- HÀM KHỞI TẠO GA CLIENT AN TOÀN ---
function getAnalyticsClient() {
    try {
        // Cố gắng parse JSON, nếu lỗi (do format biến môi trường) sẽ catch ngay
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        return new BetaAnalyticsDataClient({ credentials });
    } catch (error) {
        console.error("LỖI CẤU HÌNH GOOGLE CREDENTIALS:", error.message);
        throw new Error("Lỗi cấu hình server: Không thể đọc thông tin xác thực Google.");
    }
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');

  const { report } = request.query;

  if (report !== 'events' && report !== 'realtime') {
      return response.status(400).json({ error: "Invalid report type" });
  }

  // === TỐI ƯU QUAN TRỌNG NHẤT ===
  // Thiết lập Cache-Control dựa trên loại báo cáo.
  // s-maxage: Thời gian Vercel CDN lưu kết quả (trong thời gian này Supabase sẽ KHÔNG bị gọi).
  // stale-while-revalidate: Cho phép dùng bản cũ thêm 1 khoảng thời gian trong lúc Vercel update bản mới ngầm.
  const ttl = CACHE_TTL[report];
  response.setHeader('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=60`);

  try {
      // 1. KIỂM TRA CACHE TỪ SUPABASE (Chỉ chạy khi Vercel Cache hết hạn)
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
          if (now - lastUpdate < DB_CACHE_DURATION[report]) {
              shouldRefresh = false;
              return response.status(200).json(cacheData.data);
          }
      }

      // 2. NẾU CẦN LÀM MỚI, GỌI GOOGLE API
      if (shouldRefresh) {
          const analyticsClient = getAnalyticsClient();

          let resultData = {};

          if (report === 'events') {
              resultData = await fetchEventCountFromGA(analyticsClient);
          } else {
              resultData = await fetchRealtimeFromGA(analyticsClient);
          }

          // 3. LƯU CACHE VÀO SUPABASE
          // Lưu ý: Đừng dùng 'await' ở đây nếu muốn phản hồi nhanh hơn cho user (Fire and Forget)
          // Nhưng để đảm bảo dữ liệu nhất quán, dùng await cũng ổn vì tần suất thấp.
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
      console.error('Lỗi API ga-stats:', error);
      return response.status(500).json({ error: error.message || 'Lỗi máy chủ nội bộ.' });
  }
}

// --- CÁC HÀM GỌI GA (Giữ nguyên logic cũ) ---

async function fetchEventCountFromGA(client) {
    const [gaResponse] = await client.runReport({
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

async function fetchRealtimeFromGA(client) {
    const [realtimeResponse] = await client.runRealtimeReport({
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