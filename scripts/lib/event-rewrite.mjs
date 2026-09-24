import { setTimeout as delay } from 'node:timers/promises';
import { systemPrompt } from './event-rewrite-prompt.mjs';

export function validateRewrite(source, payload, finishReason = 'stop') {
  const text = typeof payload?.rewrittenDescription === 'string' ? payload.rewrittenDescription.trim() : '';
  const reasons = Array.isArray(payload?.reviewReasons) && payload.reviewReasons.every(x => typeof x === 'string') ? [...payload.reviewReasons] : ['invalid_review_reasons'];
  if (!text) reasons.push('empty_output');
  if (finishReason !== 'stop') reasons.push('incomplete_output');
  const plain = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length < 80) reasons.push('short_source');
  if (text === plain) reasons.push('unchanged');
  if (text.length > Math.max(500, plain.length * 2) || text.length < plain.length * 0.4) reasons.push('length_ratio');
  if (/<[^>]+>|https?:\/\//i.test(text)) reasons.push('markup_or_link');
  const numbers = value => new Set(value.match(/\d+(?:[.,:]\d+)*(?:\+)?/g) || []);
  const before = numbers(plain), after = numbers(text);
  if ([...before].some(n => !after.has(n)) || [...after].some(n => !before.has(n))) reasons.push('numbers_changed');
  return { text, status: reasons.length ? 'review' : 'ready', reasons: [...new Set(reasons)] };
}

export function usageCost(usage, rates) {
  if (!usage || !Number.isFinite(usage.prompt_tokens) || !Number.isFinite(usage.completion_tokens)) return null;
  const hit = Number(usage.prompt_cache_hit_tokens || 0);
  return (hit * rates.hit + Math.max(0, usage.prompt_tokens - hit) * rates.input + usage.completion_tokens * rates.output) / 1e6;
}

export async function requestRewrite(event, config, { fetcher = fetch, sleep = delay, log = console.log } = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetcher('https://api.deepseek.com/chat/completions', {
        method: 'POST', headers: { authorization: `Bearer ${config.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: config.model, thinking: { type: 'disabled' }, max_tokens: 4096,
          response_format: { type: 'json_object' }, messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({ title: event.title, originalDescription: event.originalDescription }) },
          ] }), signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) {
        const error = new Error(`DeepSeek HTTP ${response.status}`);
        error.retryable = response.status === 429 || response.status >= 500;
        const retryAfter = response.headers.get('retry-after');
        error.retryMs = retryAfter ? (Number(retryAfter) * 1000 || Date.parse(retryAfter) - Date.now()) : 0;
        await response.body?.cancel();
        throw error;
      }
      const data = await response.json();
      const usage = data.usage || null;
      // Log billed usage even when the model returned malformed JSON.
      log(JSON.stringify({ eventId: event.eventId, attempt, usage, costUsd: usageCost(usage, config.rates), model: config.model }));
      let payload;
      try { payload = JSON.parse(data.choices?.[0]?.message?.content || ''); }
      catch { return { text: null, status: 'review', reasons: ['invalid_json'], usage }; }
      return { ...validateRewrite(event.originalDescription, payload, data.choices?.[0]?.finish_reason ?? 'missing'), usage };
    } catch (error) {
      if (error.retryable === false || attempt === 4) throw error;
      const waitMs = Math.min(60_000, Math.max(error.retryMs || 0, 1000 * 2 ** (attempt - 1) + Math.random() * 500));
      log(JSON.stringify({ eventId: event.eventId, attempt, retryMs: waitMs, error: error.message }));
      await sleep(waitMs);
    }
  }
}
