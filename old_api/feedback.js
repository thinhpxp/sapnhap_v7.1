// /api/feedback.js
import { createClient } from '@supabase/supabase-js';

// GHI CHÚ: Chỉ cần khởi tạo MỘT Supabase client.
// Chúng ta sẽ dùng SERVICE_ROLE_KEY cho cả hai hành động vì đây là môi trường backend an toàn.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Hàm nhỏ để gửi tin nhắn đến Telegram (giữ nguyên)
async function sendTelegramMessage(text) {
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
          })
        });
        if (!response.ok) {
            console.error('Lỗi khi gửi tin nhắn Telegram:', await response.json());
        }
    } catch (error) {
        console.error('Lỗi mạng khi cố gắng gửi tin nhắn Telegram:', error);
    }
}

export default async function handler(request, response) {
  // GHI CHÚ: Phân luồng logic dựa trên phương thức HTTP
  switch (request.method) {
    case 'POST':
      await handlePostRequest(request, response);
      break;
    case 'GET':
      await handleGetRequest(request, response);
      break;
    default:
      // Nếu không phải GET hoặc POST, trả về lỗi
      response.setHeader('Allow', ['GET', 'POST']);
      response.status(405).json({ error: `Method ${request.method} Not Allowed` });
  }
}

// ==================================================================
// HÀM XỬ LÝ VIỆC GỬI GÓP Ý (LOGIC TỪ submit-feedback.js)
// ==================================================================
async function handlePostRequest(request, response) {
  try {
    const { message, context } = request.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
      return response.status(400).json({ error: 'Nội dung góp ý không hợp lệ.' });
    }

    const { error } = await supabase
      .from('feedback')
      .insert([{ message: message.trim(), context: context }]);
    if (error) throw error;

    response.status(200).json({ success: true, message: 'Gửi góp ý thành công!' });

  } catch (error) {
    console.error('Lỗi trong handlePostRequest (submit-feedback):', error);
    response.status(500).json({ error: 'Lỗi máy chủ nội bộ, không thể gửi góp ý.' });
  }
}

// ==================================================================
// HÀM XỬ LÝ CRON JOB (LOGIC TỪ send-weekly-feedback.js)
// ==================================================================
async function handleGetRequest(request, response) {
  // Lớp bảo mật cho Cron Job phải được đặt ở đây
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  // Cache kết quả cho Cron Job
  response.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');

  try {
    const { data: messages, error: selectError } = await supabase
      .from('feedback')
      .select('id, message, created_at, context')
      .eq('is_sent_to_telegram', false);
    if (selectError) throw selectError;

    if (messages.length === 0) {
      console.log("Cron Job: Không có tin nhắn mới để gửi.");
      return response.status(200).json({ message: 'Không có tin nhắn mới để gửi.' });
    }

    // Logic định dạng và gửi tin nhắn (giữ nguyên)
    let telegramMessage = `*Sapnhap.org: Tổng hợp Góp ý Tuần Này (${messages.length} tin nhắn mới):*\n\n`;
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      telegramMessage += `*[${date}]:*\n\`\`\`\n${msg.message}\n\`\`\`\n`;
      if (msg.context && Object.keys(msg.context).length > 0) {
        telegramMessage += `*Ngữ cảnh lúc gửi:*\n`;
        if(msg.context.mode) telegramMessage += `- Chế độ: ${msg.context.mode}\n`;
        if(msg.context.province) telegramMessage += `- Tỉnh: ${msg.context.province.name}\n`;
        if(msg.context.district) telegramMessage += `- Huyện: ${msg.context.district.name}\n`;
        if(msg.context.commune) telegramMessage += `- Xã: ${msg.context.commune.name}\n`;
      }
      telegramMessage += `\n---\n\n`;
    });

    await sendTelegramMessage(telegramMessage);

    const messageIds = messages.map(msg => msg.id);
    const { error: updateError } = await supabase
      .from('feedback')
      .update({ is_sent_to_telegram: true })
      .in('id', messageIds);
    if (updateError) throw updateError;

    console.log(`Cron Job: Đã gửi thành công ${messages.length} tin nhắn.`);
    response.status(200).json({ success: true, sent: messages.length });

  } catch (error) {
    console.error('Lỗi trong handleGetRequest (send-weekly-feedback):', error);
    await sendTelegramMessage(`*CRON JOB FAILED:*\n\`\`\`\n${error.message}\n\`\`\``);
    response.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
  }
}
