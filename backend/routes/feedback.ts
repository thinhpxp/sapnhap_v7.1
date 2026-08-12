import { FastifyInstance } from 'fastify';
import { queryWithCircuitBreaker } from '../db.js';
import { sendTelegramAlert } from '../utils/alert.js';

interface FeedbackBody {
  message?: string;
  context?: Record<string, any>;
  turnstileToken?: string;
}

async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Skip if Turnstile secret is not set in env

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp,
      }),
    });
    const data: any = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('[Turnstile Verification Error]:', err);
    return false;
  }
}

export async function feedbackRoute(fastify: FastifyInstance) {
  // POST /api/feedback — Submit user feedback
  fastify.post<{ Body: FeedbackBody }>('/api/feedback', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Bạn gửi quá nhiều feedback. Vui lòng thử lại sau 1 phút.',
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { message, context, turnstileToken } = request.body || {};

      if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
        return reply.status(400).send({ error: 'Nội dung góp ý không hợp lệ.' });
      }

      // Verify Cloudflare Turnstile token if secret key configured
      if (process.env.TURNSTILE_SECRET_KEY && turnstileToken) {
        const ip = (request.headers['cf-connecting-ip'] as string) ?? request.ip;
        const isValid = await verifyTurnstileToken(turnstileToken, ip);
        if (!isValid) {
          return reply.status(400).send({ error: 'Xác thực CAPTCHA/Turnstile không hợp lệ.' });
        }
      }

      await queryWithCircuitBreaker(
        `INSERT INTO feedback (message, context) VALUES ($1, $2)`,
        [message.trim(), context ? JSON.stringify(context) : null]
      );

      return reply.send({ success: true, message: 'Gửi góp ý thành công!' });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Lỗi máy chủ nội bộ, không thể gửi góp ý.' });
    }
  });

  // GET /api/feedback — Cron job to send weekly/daily unsent feedback to Telegram
  fastify.get('/api/feedback', async (request, reply) => {
    const authHeader = request.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const selectRes = await queryWithCircuitBreaker(
        `SELECT id, message, created_at, context FROM feedback WHERE is_sent_to_telegram = FALSE ORDER BY created_at ASC`
      );

      const messages = selectRes.rows;
      if (messages.length === 0) {
        return reply.send({ message: 'Không có tin nhắn mới để gửi.' });
      }

      let telegramMessage = `*Sapnhap.org: Tổng hợp Góp ý Tuần Này (${messages.length} tin nhắn mới):*\n\n`;
      messages.forEach((msg) => {
        const date = new Date(msg.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        telegramMessage += `*[${date}]:*\n\`\`\`\n${msg.message}\n\`\`\`\n`;
        if (msg.context && Object.keys(msg.context).length > 0) {
          telegramMessage += `*Ngữ cảnh lúc gửi:*\n`;
          if (msg.context.mode) telegramMessage += `- Chế độ: ${msg.context.mode}\n`;
          if (msg.context.province) telegramMessage += `- Tỉnh: ${msg.context.province.name}\n`;
          if (msg.context.district) telegramMessage += `- Huyện: ${msg.context.district.name}\n`;
          if (msg.context.commune) telegramMessage += `- Xã: ${msg.context.commune.name}\n`;
        }
        telegramMessage += `\n---\n\n`;
      });

      await sendTelegramAlert(telegramMessage);

      const ids = messages.map((m) => m.id);
      await queryWithCircuitBreaker(
        `UPDATE feedback SET is_sent_to_telegram = TRUE WHERE id = ANY($1::int[])`,
        [ids]
      );

      return reply.send({ success: true, sent: messages.length });
    } catch (error: any) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Lỗi máy chủ nội bộ.' });
    }
  });
}
