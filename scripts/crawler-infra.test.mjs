import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reserveIndexNowUrls } from '../apps/backend/src/indexnow-budget.js';
import { sitemapUrls } from './indexnow-sitemaps.mjs';
import { botFailure, referenceFailure } from './crawler-log-monitor.mjs';

test('IndexNow durable daily budget covers repeated runs and fails closed on corruption/lock', () => {
  const dir = mkdtempSync(join(tmpdir(), 'crawler-test-'));
  const file = join(dir, 'budget.json');
  try {
    const today = new Date('2026-09-22T12:00:00Z');
    assert.equal(reserveIndexNowUrls(9990, file, today), 9990);
    assert.equal(reserveIndexNowUrls(50, file, today), 10);
    assert.equal(reserveIndexNowUrls(50, file, today), 0);
    assert.equal(reserveIndexNowUrls(50, file, new Date('2026-09-23T00:00:00Z')), 50);
    writeFileSync(`${file}.lock`, '');
    assert.throws(() => reserveIndexNowUrls(50, file, today));
    rmSync(`${file}.lock`);
    writeFileSync(file, '{broken');
    assert.throws(() => reserveIndexNowUrls(50, file, today));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('sitemaps decode XML and dedupe but reject foreign or empty payloads', () => {
  assert.deepEqual(sitemapUrls('<urlset><url><loc>https://daibilet.ru/events/a?a=1&amp;b=2</loc></url></urlset>', 'https://daibilet.ru'), ['https://daibilet.ru/events/a?a=1&b=2']);
  assert.throws(() => sitemapUrls('<urlset></urlset>', 'https://daibilet.ru'));
  assert.throws(() => sitemapUrls('<urlset><loc>https://evil.test/a</loc></urlset>', 'https://daibilet.ru'));
  assert.throws(() => sitemapUrls('<html>Error</html>', 'https://daibilet.ru'));
});

test('bot 5xx uses actual UA and status, never a user-supplied URL/referrer', () => {
  const line = '1.2.3.4 - - [22/Sep/2026:15:00:00 +0000] "GET /events/a HTTP/1.1" 502 123 "-" "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"';
  assert.deepEqual(botFailure(line), { time: Date.parse('2026-09-22T15:00:00Z'), status: 502, agent: 'Googlebot' });
  assert.equal(botFailure(line.replace('502 123', '200 123')), null);
  assert.equal(botFailure(line.replace('Googlebot/2.1', 'YandexBot/3.0'))?.agent, 'YandexBot');
  assert.equal(botFailure('1.2.3.4 - - [22/Sep/2026:15:00:00 +0000] "GET /Googlebot HTTP/1.1" 500 123 "YandexBot" "Mozilla"'), null);
  assert.equal(referenceFailure('ReferenceError: somethingElse is not defined'), true);
  assert.equal(referenceFailure('ReferenceError: cleanImportedDescription is not defined'), true);
  assert.equal(referenceFailure('cleanImportedDescription done'), false);
});
