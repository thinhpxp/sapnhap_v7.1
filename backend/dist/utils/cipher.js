// backend/utils/cipher.ts
// Module mã hóa payload dữ liệu API tự động (Zero-dependency, Node.js native crypto)
import crypto from 'crypto';
const SECRET_KEY = 'SapNhap2025@SecureDataKey#VN';
/**
 * Mã hóa đối tượng dữ liệu thành chuỗi payload Base64 bí mật kèm Salt ngẫu nhiên
 * @param data - Dữ liệu JSON cần mã hóa
 * @returns {{ payload: string }} Trả về object chứa duy nhất thuộc tính 'payload'
 */
export function encryptPayload(data) {
    if (data === undefined || data === null) {
        return { payload: '' };
    }
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    // Tạo Salt ngẫu nhiên 4 bytes cho mỗi request -> Output thay đổi 100% mỗi lần gọi
    const salt = crypto.randomBytes(4).toString('hex');
    const fullKey = crypto.createHash('sha256').update(SECRET_KEY + salt).digest();
    const buffer = Buffer.from(jsonStr, 'utf-8');
    const encrypted = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        encrypted[i] = buffer[i] ^ fullKey[i % fullKey.length];
    }
    const combined = `${salt}:${encrypted.toString('base64')}`;
    const finalPayload = Buffer.from(combined, 'utf-8').toString('base64');
    return { payload: finalPayload };
}
