export async function sendTelegramAlert(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        console.warn('[TelegramAlert] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.');
        return;
    }
    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `🚨 [sapnhap.org Alert]\n\n${message}`,
                parse_mode: 'HTML',
            }),
        });
        if (!response.ok) {
            console.error('[TelegramAlert] Failed to send telegram message:', await response.text());
        }
    }
    catch (error) {
        console.error('[TelegramAlert] Network error while sending telegram alert:', error);
    }
}
