// services/api.js — Tầng gọi API tập trung với tự động giải mã Encrypted Payload
import { decryptPayload } from '../utils/crypto.js';

const BASE_URL = '';

async function fetchJson(url) {
  const response = await fetch(BASE_URL + url);
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errObj = await response.json();
      if (errObj.payload) {
        const decryptedErr = await decryptPayload(errObj.payload);
        errorMsg = decryptedErr.error || errorMsg;
      } else {
        errorMsg = errObj.error || errorMsg;
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  // Nếu response được mã hóa dạng { payload: "..." }, thực hiện giải mã tự động
  if (data && typeof data === 'object' && typeof data.payload === 'string') {
    return decryptPayload(data.payload);
  }
  return data;
}

// Tải toàn bộ dữ liệu hành chính CŨ (Tỉnh → Huyện → Xã)
export async function fetchOldData() {
  return fetchJson('/api/get-old-data');
}

// Tải danh sách Tỉnh/Thành MỚI sau sáp nhập
export async function fetchNewProvinces() {
  return fetchJson('/api/new-geo-data');
}

// Tải danh sách Xã/Phường MỚI theo mã tỉnh mới
export async function fetchNewWards(provinceCode) {
  return fetchJson(`/api/new-geo-data?province_code=${encodeURIComponent(provinceCode)}`);
}

// Tra cứu sáp nhập theo mã xã cũ (forward) hoặc mã xã mới (reverse)
export async function fetchLookup(code, type = 'forward') {
  return fetchJson(`/api/lookup?code=${encodeURIComponent(code)}&type=${type}`);
}

// Tải địa chỉ Trung tâm Hành chính
export async function fetchAdminCenters(wardCode, provinceCode) {
  return fetchJson(`/api/get-admin-centers?ward_code=${encodeURIComponent(wardCode)}&province_code=${encodeURIComponent(provinceCode)}`);
}

// Tìm kiếm nhanh theo tên xã (type: 'old' | 'new')
export async function fetchQuickSearch(term, type) {
  if (!term || term.trim().length < 2) return [];
  return fetchJson(`/api/quick-search?term=${encodeURIComponent(term.trim())}&type=${type}`);
}

// Lấy thống kê Google Analytics
export async function fetchGaStats(report = 'events') {
  return fetchJson(`/api/ga-stats?report=${report}`);
}
