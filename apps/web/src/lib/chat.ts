/**
 * Pure helpers for the public support chat (widget + admin + Telegram bridge).
 * Kept free of I/O so they stay unit-testable under `web:test:ci`.
 */

export const CHAT_TEXT_MAX_LEN = 4000;

/** Trim + cap user/admin input. Returns null when nothing sendable remains. */
export function sanitizeChatText(value: unknown): string | null {
  const text = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return null;
  return text.slice(0, CHAT_TEXT_MAX_LEN);
}

/** Visitor key = random UUID stored in the widget's localStorage. */
export function isChatVisitorKey(value: unknown): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value ?? ''),
  );
}

/** Notification text for the admin Telegram chat. */
export function buildChatTelegramNotification(text: string, sessionUrl: string): string {
  return [
    'Новое сообщение чата поддержки',
    '',
    text,
    '',
    `Карточка переписки: ${sessionUrl}`,
    'Ответьте через Reply на это сообщение - ответ попадёт в чат.',
  ].join('\n');
}

/** Escape text for Telegram HTML parse_mode. */
export function escapeChatTelegramHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
