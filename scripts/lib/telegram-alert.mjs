import https from 'node:https';
import { isIP } from 'node:net';

// Optional alternate Telegram address for hosts where the DNS-selected edge times out.
// Hostname/SNI and certificate validation remain api.telegram.org; no proxy sees the token.
export async function sendTelegramAlert(text, env = process.env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new Error('Telegram credentials missing');
  const payload = JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: text.slice(0, 3900) });
  const send = (address) => new Promise((resolve, reject) => {
    const family = address ? isIP(address) : 0;
    if (address && !family) { reject(new Error('Invalid TELEGRAM_API_FALLBACK_IP')); return; }
    const request = https.request({
      hostname: 'api.telegram.org', port: 443,
      path: `/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) },
      ...(address ? { lookup: (_hostname, options, callback) => options.all
        ? callback(null, [{ address, family }]) : callback(null, address, family) } : {}),
    }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; if (body.length > 128000) request.destroy(new Error('response_too_large')); });
      response.on('end', () => {
        clearTimeout(timer);
        try {
          const result = JSON.parse(body);
          if (response.statusCode !== 200 || result.ok !== true) {
            reject(new Error(`Telegram rejected alert (HTTP ${response.statusCode})`));
          } else resolve({ delivered: true, messageId: result.result?.message_id, transport: address ? 'fallback_ip' : 'dns' });
        } catch { reject(new Error('Invalid Telegram response')); }
      });
      response.on('error', () => { clearTimeout(timer); reject(new Error('Telegram response failed')); });
    });
    const timer = setTimeout(() => request.destroy(new Error('timeout')), 10000);
    request.on('error', () => { clearTimeout(timer); reject(new Error('Telegram connection failed')); });
    request.end(payload);
  });
  try { return await send(); }
  catch (error) {
    // Retry only connection failures, never an explicit API rejection.
    if (!env.TELEGRAM_API_FALLBACK_IP || error.message !== 'Telegram connection failed') throw error;
    return send(env.TELEGRAM_API_FALLBACK_IP);
  }
}
