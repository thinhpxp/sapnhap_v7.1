import { valkey } from '../cache.js';
import { sendTelegramAlert } from '../utils/alert.js';
export async function antiScrapingMiddleware(req, reply) {
    const ip = req.headers['cf-connecting-ip'] ?? req.ip;
    // Check if IP is currently blocked
    const isBlocked = await valkey.get(`sapnhap:blocked:${ip}`);
    if (isBlocked) {
        return reply.status(429).send({
            error: 'Quá nhiều truy vấn tự động.',
            message: 'Địa chỉ IP của bạn tạm thời bị giới hạn trong 24 giờ do nghi vấn cào dữ liệu.',
        });
    }
    const query = req.query;
    const provinceCode = query.province_code;
    if (provinceCode) {
        const trackKey = `sapnhap:scrape:${ip}:provinces`;
        await valkey.sadd(trackKey, provinceCode);
        await valkey.expire(trackKey, 3600); // 1-hour window
        const uniqueCount = await valkey.scard(trackKey);
        if (uniqueCount > 30) {
            // Block IP for 24 hours
            await valkey.setex(`sapnhap:blocked:${ip}`, 86400, '1');
            const msg = `🤖 <b>Scraper Blocked</b>: IP <code>${ip}</code> scanned ${uniqueCount} provinces within 1 hour. Blocked for 24h.`;
            console.warn(msg);
            sendTelegramAlert(msg).catch(() => { });
            return reply.status(429).send({
                error: 'Quá nhiều truy vấn tự động.',
                message: 'Hệ thống phát hiện hành vi tra cứu bất thường.',
            });
        }
    }
}
