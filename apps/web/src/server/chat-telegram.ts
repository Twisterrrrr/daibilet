/**
 * Minimal Telegram Bot API bridge for the support chat (no SDK).
 * Mirrors the backend helper contract: missing env → warn + skip, no throw.
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
 */
import { buildChatTelegramNotification } from '@/lib/chat';

type SendResult = {
  ok: boolean;
  skipped?: boolean;
  /** Telegram message_id of the sent notification - stored for Reply matching. */
  messageId?: number;
  reason?: string;
};

export async function sendChatTelegramNotification(options: {
  text: string;
  sessionUrl: string;
}): Promise<SendResult> {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) {
    console.warn('[chat-telegram] skip send: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');
    return { ok: false, skipped: true, reason: 'missing_env' };
  }

  const body = buildChatTelegramNotification(options.text, options.sessionUrl);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: body,
        disable_web_page_preview: true,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: { message_id?: number };
    };
    if (!response.ok || !payload.ok) {
      console.warn(`[chat-telegram] sendMessage failed: HTTP ${response.status}`);
      return { ok: false, reason: `http_${response.status}` };
    }
    return { ok: true, messageId: payload.result?.message_id };
  } catch (error) {
    console.warn(`[chat-telegram] sendMessage error: ${error instanceof Error ? error.message : error}`);
    return { ok: false, reason: 'network_error' };
  }
}
