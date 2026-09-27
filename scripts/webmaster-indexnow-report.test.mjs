import assert from 'node:assert/strict';
import test from 'node:test';
import { summarize, fetchSamples } from './webmaster-indexnow-report.mjs';
test('old samples and missing URLs do not count as post-submission crawl evidence', () => {
  const report = summarize(['/a', '/b', '/c'], [
    { url: 'https://daibilet.ru/a', access_date: '2026-09-22T00:00:00,000+0300', http_code: 200 },
    { url: 'https://daibilet.ru/b', access_date: '2026-09-01T00:00:00Z', http_code: 200 },
  ], '2026-09-21T00:00:00Z');
  assert.equal(report.crawled, 1); assert.equal(report.unknown, 1); assert.equal(report.total, 3);
});
test('pagination includes later pages and API failure is never a zero-crawl report', async () => {
  let calls = 0;
  const result = await fetchSamples('https://api.webmaster.yandex.net/test', 'test', async () => {
    calls++; return Response.json({ count: 101, samples: Array(calls === 1 ? 100 : 1).fill({ url: 'https://daibilet.ru/a' }) });
  });
  assert.equal(calls, 2); assert.equal(result.samples.length, 101);
  await assert.rejects(fetchSamples('https://api.webmaster.yandex.net/test', 'test', async () => new Response('', { status: 403 })), /403/);
});
