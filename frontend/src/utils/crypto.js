// frontend/src/utils/crypto.js
// Module giải mã payload từ API bằng Web Crypto API nguyên bản trình duyệt (Zero-dependency)

const SECRET_KEY = 'SapNhap2025@SecureDataKey#VN';

/**
 * Tính băm SHA-256 sử dụng Web Crypto API nguyên bản của trình duyệt
 * @param {string} str - Ký tự cần băm
 * @returns {Promise<Uint8Array>}
 */
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Giải mã chuỗi payload Base64 từ server thành đối tượng JSON gốc
 * @param {string} encodedPayload - Chuỗi mã hóa Base64
 * @returns {Promise<any>} Dữ liệu JSON đã giải mã
 */
export async function decryptPayload(encodedPayload) {
  if (!encodedPayload) return null;

  try {
    // 1. Giải mã Base64 lớp ngoài
    const decodedOuter = atob(encodedPayload);
    const parts = decodedOuter.split(':');
    if (parts.length < 2) {
      // Fallback nếu dữ liệu không có salt mã hóa
      return JSON.parse(decodedOuter);
    }

    const salt = parts[0];
    const base64Data = parts[1];

    // 2. Tính khóa mã hóa SHA-256 (SECRET_KEY + salt)
    const fullKey = await sha256(SECRET_KEY + salt);

    // 3. Giải mã Base64 dữ liệu & Thực hiện XOR cipher
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i) ^ fullKey[i % fullKey.length];
    }

    // 4. Giải mã chuỗi UTF-8 sang JSON Object
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(bytes);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Lỗi giải mã dữ liệu payload:', err);
    throw new Error('Dữ liệu phản hồi từ máy chủ không hợp lệ hoặc đã bị can thiệp.');
  }
}
