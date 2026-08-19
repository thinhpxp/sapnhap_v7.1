// /api/quick-search.js
//KHI USER NHẬP TÊN ĐỊA DANH VÀO INPUT, API NÀY SẼ TRẢ VỀ KẾT QUẢ TÌM KIẾM NHANH DỰA TRÊN TÊN ĐỊA DANH ẤY
//DỮ LIÊU ĐƯỢC LẤY TỪ BẢNG 'old_wards' VÀ 'new_wards' TRONG CSDL SUPABASE
//API NÀY SỬ DỤNG RPC FUNCTION 'search_old_wards' VÀ 'search_new_wards' NẰM TRÊN SUPABASE ĐỂ THỰC HIỆN TÌM KIẾM
//KHI USER CLICK VÀO KẾT QUẢ TÌM KIẾM, HỆ THỐNG SẼ LẤY 'ward_code' TỪ KẾT QUẢ VÀ GỬI ĐẾN API lookup.js ĐỂ LẤY THÔNG TIN CHI TIẾT VỀ ĐỊA DANH ẤY
import { createClient } from '@supabase/supabase-js';

// Khởi tạo Supabase client một lần duy nhất
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { db: { schema: 'api' } }
);

export default async function handler(request, response) {
  // GHI CHÚ QUAN TRỌNG: Lấy cả 'term' và 'type' từ query
  const { term, type } = request.query;

  // --- VALIDATION ---
  if (!term || term.trim().length < 2) {
    return response.status(200).json([]);
  }
  // Đảm bảo 'type' là 'old' hoặc 'new'
  if (type !== 'old' && type !== 'new') {
    return response.status(400).json({ error: "Tham số 'type' không hợp lệ." });
  }

  try {
    // GHI CHÚ CỐT LÕI: Dựa vào tham số 'type' để quyết định gọi RPC function nào
    const rpcFunctionName = type === 'old' ? 'search_old_wards' : 'search_new_wards';

    const { data, error } = await supabase.rpc(rpcFunctionName, {
      p_search_term: term.trim()
    });

    if (error) throw error;

    response.status(200).json(data);

  } catch (error) {
    console.error(`Lỗi API Quick Search (type: ${type}):`, error);
    response.status(500).json({ error: 'Lỗi máy chủ.' });
  }
}
