import test from 'node:test';
import assert from 'node:assert/strict';
import { requestRewrite, validateRewrite, usageCost } from './lib/event-rewrite.mjs';
const source = 'Пешеходная экскурсия по историческому центру города длится 2 часа. Встреча у ратуши, возрастное ограничение 12+.';
test('review protects numbers, empty, truncated and malformed outputs', () => {
  const result = validateRewrite(source, { rewrittenDescription: source.replace('2 часа', '3 часа'), reviewReasons: [] });
  assert.equal(result.status, 'review');
  assert.ok(result.reasons.includes('numbers_changed'));
  assert.equal(validateRewrite(source, {}).status, 'review');
  assert.ok(validateRewrite(source, { rewrittenDescription: source, reviewReasons: [] }, 'length').reasons.includes('incomplete_output'));
});
test('valid paraphrase can become ready; provider review is retained', () => {
  const rewrittenDescription = 'За 2 часа вы пройдёте по историческому центру города пешком. Группа встречается у ратуши. Возрастное ограничение — 12+.';
  assert.equal(validateRewrite(source, { rewrittenDescription, reviewReasons: [] }).status, 'ready');
  assert.equal(validateRewrite(source, { rewrittenDescription, reviewReasons: ['сомнение'] }).status, 'review');
});
test('usage cost accounts for cached input; absent usage remains unknown', () => {
  assert.equal(usageCost({ prompt_tokens: 1000, prompt_cache_hit_tokens: 200, completion_tokens: 100 }, { input: 1, hit: 0.1, output: 2 }), 0.00102);
  assert.equal(usageCost(null, {}), null);
});
test('429 retries with backoff, authentication failures do not retry', async () => {
  const waits = []; let calls = 0;
  const config = { key: 'test', model: 'test', rates: { input: 1, hit: 1, output: 1 } };
  const event = { eventId: '1', title: 'Тест', originalDescription: source };
  const result = await requestRewrite(event, config, { log() {}, sleep: async ms => waits.push(ms), fetcher: async () => {
    calls++;
    if (calls === 1) return new Response('', { status: 429, headers: { 'retry-after': '2' } });
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{bad' } }], usage: { prompt_tokens: 12, completion_tokens: 1 } });
  } });
  assert.equal(calls, 2); assert.ok(waits[0] >= 2000);
  assert.equal(result.status, 'review'); assert.equal(result.usage.prompt_tokens, 12);
  calls = 0;
  await assert.rejects(requestRewrite(event, config, { log() {}, sleep: async () => {}, fetcher: async () => { calls++; return new Response('', { status: 401 }); } }), /401/);
  assert.equal(calls, 1);
});
