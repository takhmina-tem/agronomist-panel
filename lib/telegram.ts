/**
 * lib/telegram.ts
 * Server-side Telegram Bot API client.
 *
 * Only sendTelegramMessage is exported.
 * TELEGRAM_BOT_TOKEN is read from env — never logged.
 */

/**
 * Send a plain-text message to a single Telegram chat.
 * Throws on network error or non-2xx response.
 * Caller is responsible for catching and continuing to other recipients.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Telegram sendMessage HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}
