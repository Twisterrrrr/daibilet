/**
 * Minimal Telegram Bot API helper (no SDK).
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
 * Missing env → warn + skip (no throw).
 */

export interface SendTelegramMessageOptions {
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPagePreview?: boolean;
  /** Override env (tests) */
  token?: string | null | undefined;
  chatId?: string | null | undefined;
  fetchImpl?: typeof fetch;
}

export interface SendTelegramResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
  body?: string;
}

export async function sendTelegramMessage(
  options: SendTelegramMessageOptions,
): Promise<SendTelegramResult> {
  const token = String(options.token ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const chatId = String(options.chatId ?? process.env.TELEGRAM_CHAT_ID ?? '').trim();
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (!token || !chatId) {
    console.warn(
      '[telegram] skip send: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set',
    );
    return { ok: false, skipped: true, reason: 'missing_env' };
  }

  if (typeof fetchImpl !== 'function') {
    console.warn('[telegram] skip send: fetch unavailable');
    return { ok: false, skipped: true, reason: 'no_fetch' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: options.text,
      ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
      disable_web_page_preview: options.disableWebPagePreview !== false,
    }),
  });

  const body = await response.text().catch(() => '');
  if (!response.ok) {
    console.warn(`[telegram] sendMessage failed: HTTP ${response.status} ${body.slice(0, 200)}`);
    return { ok: false, status: response.status, body };
  }

  return { ok: true, status: response.status, body };
}

/** Escape text for Telegram HTML parse_mode. */
export function escapeTelegramHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
