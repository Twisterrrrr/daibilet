/**
 * Minimal Telegram Bot API bridge for the support chat (no SDK).
 * Mirrors the backend helper contract: missing env → warn + skip, no throw.
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
 * Optional: TELEGRAM_API_FALLBACK_IP — api.telegram.org is not directly
 * reachable from this host (DNS gives an unreachable edge), so requests are
 * pinned to this working edge IP; SNI/cert stay api.telegram.org. Same idea
 * as the curl --resolve workaround used for setWebhook.
 */
import https from 'node:https';

import { buildChatTelegramNotification } from '@/lib/chat';

type SendResult = {
  ok: boolean;
  skipped?: boolean;
  /** Telegram message_id of the sent notification - stored for Reply matching. */
  messageId?: number;
  reason?: string;
};

type TelegramApiResponse = {
  ok?: boolean;
  result?: { message_id?: number };
};

type RequestLookup = NonNullable<import('node:https').RequestOptions['lookup']>;

/** Resolve the host to the fallback edge IP (handles both lookup call shapes). */
function pinnedLookup(ip: string): RequestLookup {
  return (hostname, options, callback) => {
    const cb = callback as (
      err: NodeJS.ErrnoException | null,
      address: string | { address: string; family: number }[],
      family?: number,
    ) => void;
    if (options && typeof options === 'object' && 'all' in options && options.all) {
      cb(null, [{ address: ip, family: 4 }]);
    } else {
      cb(null, ip, 4);
    }
  };
}

async function postTelegramJson(
  path: string,
  jsonBody: string,
): Promise<{ status: number; payload: TelegramApiResponse }> {
  const fallbackIp = String(process.env.TELEGRAM_API_FALLBACK_IP || '').trim();
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.telegram.org${path}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        lookup: fallbackIp ? pinnedLookup(fallbackIp) : undefined,
        timeout: 5_000,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          let payload: TelegramApiResponse = {};
          try {
            payload = JSON.parse(data) as TelegramApiResponse;
          } catch {
            // keep empty payload - caller treats it as a failed send
          }
          resolve({ status: res.statusCode ?? 0, payload });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy(new Error('telegram request timeout'));
    });
    req.on('error', reject);
    req.write(jsonBody);
    req.end();
  });
}

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
    const { status, payload } = await postTelegramJson(
      `/bot${token}/sendMessage`,
      JSON.stringify({
        chat_id: chatId,
        text: body,
        disable_web_page_preview: true,
      }),
    );
    if (status < 200 || status > 299 || !payload.ok) {
      console.warn(`[chat-telegram] sendMessage failed: HTTP ${status}`);
      return { ok: false, reason: `http_${status}` };
    }
    return { ok: true, messageId: payload.result?.message_id };
  } catch (error) {
    console.warn(`[chat-telegram] sendMessage error: ${error instanceof Error ? error.message : error}`);
    return { ok: false, reason: 'network_error' };
  }
}
