import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { sendTelegramAlert } from './lib/telegram-alert.mjs';
const env = { TELEGRAM_BOT_TOKEN: '123:test', TELEGRAM_CHAT_ID: '123', TELEGRAM_API_FALLBACK_IP: '149.154.167.220' };
test('connection failure uses configured IP but retains Telegram hostname and TLS verification', async t => {
  const calls = [];
  t.mock.method(https, 'request', (options, callback) => {
    calls.push(options);
    const request = new EventEmitter();
    request.destroy = error => request.emit('error', error);
    request.end = payload => queueMicrotask(() => {
      assert.ok(JSON.parse(payload).text.length <= 3900);
      if (!options.lookup) return request.emit('error', new Error('connect_timeout'));
      options.lookup('api.telegram.org', { all: true }, (error, addresses) => {
        assert.equal(error, null); assert.deepEqual(addresses, [{ address: env.TELEGRAM_API_FALLBACK_IP, family: 4 }]);
      });
      const response = new EventEmitter(); response.statusCode = 200; callback(response);
      response.emit('data', JSON.stringify({ ok: true, result: { message_id: 9 } })); response.emit('end');
    });
    return request;
  });
  assert.deepEqual(await sendTelegramAlert('x'.repeat(5000), env), { delivered: true, messageId: 9, transport: 'fallback_ip' });
  assert.equal(calls.length, 2);
  for (const options of calls) { assert.equal(options.hostname, 'api.telegram.org'); assert.notEqual(options.rejectUnauthorized, false); }
});
test('API rejection does not retry through another address', async t => {
  let calls = 0;
  t.mock.method(https, 'request', (_options, callback) => {
    calls++;
    const request = new EventEmitter(); request.end = () => queueMicrotask(() => {
      const response = new EventEmitter(); response.statusCode = 403; callback(response);
      response.emit('data', '{"ok":false}'); response.emit('end');
    }); return request;
  });
  await assert.rejects(sendTelegramAlert('test', env), /HTTP 403/); assert.equal(calls, 1);
});
