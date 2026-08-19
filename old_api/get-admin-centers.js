// /api/get-admin-centers.js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(request, response) {
  // GHI CHÚ THAY ĐỔI: API giờ đây nhận cả ward_code và province_code.
  const { ward_code, province_code } = request.query;

  // Kiểm tra đầu vào
  if (!ward_code || !province_code) {
    return response.status(400).json({ error: 'Thiếu tham số ward_code hoặc province_code.' });
  }

  const wardCode = parseInt(ward_code, 10);
  const provinceCode = parseInt(province_code, 10);

  try {
    // GHI CHÚ THAY ĐỔI: Thực hiện hai truy vấn song song để tăng hiệu suất.
    // Promise.all sẽ đợi cả hai truy vấn hoàn thành.
    const [wardCentersResponse, provinceCentersResponse] = await Promise.all([
      // Truy vấn 1: Lấy dữ liệu từ bảng cấp xã/phường
      supabase
        .from('ward_admin_centers')
        .select('agency_type, address')
        .eq('new_ward_code', wardCode),

      // Truy vấn 2: Lấy dữ liệu từ bảng cấp tỉnh
      supabase
        .from('province_admin_centers')
        .select('agency_type, address')
        .eq('new_province_code', provinceCode)
    ]);

    // Kiểm tra lỗi cho từng truy vấn
    if (wardCentersResponse.error) throw wardCentersResponse.error;
    if (provinceCentersResponse.error) throw provinceCentersResponse.error;

    // GHI CHÚ THAY ĐỔI: Gộp kết quả từ hai truy vấn lại thành một mảng duy nhất.
    const combinedData = [
      ...(wardCentersResponse.data || []),
      ...(provinceCentersResponse.data || [])
    ];

    // Trả về mảng đã được gộp
    response.status(200).json(combinedData);

  } catch (error) {
    console.error('Lỗi API get-admin-centers:', error);
    response.status(500).json({ error: 'Lỗi máy chủ nội bộ khi lấy địa chỉ trung tâm hành chính.' });
  }
}
