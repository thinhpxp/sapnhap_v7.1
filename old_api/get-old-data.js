// /api/get-old-data.js
// GHI CHÚ: Import dữ liệu trực tiếp từ tệp cục bộ trong /api
import { allProvincesData } from './_data/old_data.js';

/**
 * API endpoint này có nhiệm vụ duy nhất là đọc và trả về
 * dữ liệu hành chính cũ cho việc khởi tạo dropdown ở client.
 */
export default async function handler(request, response) {
  try {
    // Dữ liệu đã được import, không cần sắp xếp lại vì client sẽ xử lý

    // GHI CHÚ: Thêm header Cache-Control để trình duyệt và CDN của Vercel
    // lưu lại kết quả này trong 1 ngày, giảm tải cho server.
    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

    response.status(200).json(allProvincesData);

  } catch (error) {
    console.error('Lỗi trong API get-old-data:', error);
    response.status(500).json({ error: 'Lỗi máy chủ khi lấy dữ liệu hành chính cũ.' });
  }
}
