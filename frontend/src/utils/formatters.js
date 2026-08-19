// utils/formatters.js
// Utility helper tái sử dụng cho việc chuẩn hóa dữ liệu tra cứu và định dạng hiển thị mã đơn vị hành chính

/**
 * Ghép danh sách mã các cấp đơn vị hành chính thành chuỗi phân cách bởi dấu phẩy
 * @param  {...(number|string)} codes - Danh sách mã (Xã, Huyện, Tỉnh)
 * @returns {string} Chuỗi mã ghép bởi dấu phẩy (VD: "4945, 152, 17")
 */
export function formatUnitCodes(...codes) {
  return codes.filter(Boolean).join(', ');
}

/**
 * Chuẩn hóa dữ liệu response từ API lookup thành cấu trúc resultData thống nhất cho Frontend
 * @param {Object} params
 * @param {'forward'|'reverse'} params.type - Loại tra cứu
 * @param {string} params.queryLabel - Tên địa chỉ tra cứu
 * @param {Object|Array} params.apiData - Response từ API fetchLookup
 * @param {Object} [params.fallbackCodes] - Các mã đơn vị bổ sung
 */
export function normalizeLookupResponse({ type, queryLabel, apiData, fallbackCodes = {} }) {
  if (type === 'forward') {
    const events = apiData.events || [];
    const firstEv = events[0];
    return {
      type: 'forward',
      queryLabel,
      old_ward_code: fallbackCodes.old_ward_code || firstEv?.old_ward_code,
      old_district_code: fallbackCodes.old_district_code || firstEv?.old_district_code,
      old_province_code: fallbackCodes.old_province_code || firstEv?.old_province_code,
      events,
      village_changes: apiData.village_changes || [],
    };
  } else {
    const events = Array.isArray(apiData) ? apiData : (apiData.events || []);
    const villageChanges = Array.isArray(apiData)
      ? apiData.flatMap(e => e.village_changes || [])
      : (apiData.village_changes || []);
    const firstEv = events[0];

    return {
      type: 'reverse',
      queryLabel,
      new_ward_code: fallbackCodes.new_ward_code || firstEv?.new_ward_code,
      new_province_code: fallbackCodes.new_province_code || firstEv?.new_province_code,
      events,
      village_changes: villageChanges,
    };
  }
}
