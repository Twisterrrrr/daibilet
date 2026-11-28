import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { cleanImportedDescription } from './dto.js';
import { isSocialPreviewAgent } from './social-preview.js';

const SEARCH_CRAWLERS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Applebot/0.1',
];

const LINK_PREVIEW_CLIENTS = [
  'TelegramBot (like TwitterBot)',
  'facebookexternalhit/1.1',
  'Twitterbot/1.0',
  'Slackbot-LinkExpanding 1.0',
  'WhatsApp/2.23',
  'VKShare',
];

test('search crawlers stay on the full SSR route', () => {
  for (const userAgent of SEARCH_CRAWLERS) {
    assert.equal(isSocialPreviewAgent(userAgent), false, userAgent);
  }
});

test('link unfurl clients use the compact social preview route', () => {
  for (const userAgent of LINK_PREVIEW_CLIENTS) {
    assert.equal(isSocialPreviewAgent(userAgent), true, userAgent);
  }
});

test('legacy public event DTO can clean imported HTML at runtime', () => {
  assert.equal(
    cleanImportedDescription('<p>Первый&nbsp;абзац</p><script>alert(1)</script><div>Второй &amp; третий</div>'),
    'Первый абзац\nВторой & третий',
  );
  assert.equal(cleanImportedDescription('   '), null);
});

test('nginx user-agent map matches the application routing policy', async () => {
  const patch = await readFile(new URL('../../../deploy/nginx/patch-prod-nginx-social-preview.py', import.meta.url), 'utf8');
  assert.match(patch, /telegrambot/);
  assert.match(patch, /facebookexternalhit/);
  assert.doesNotMatch(patch, /googlebot/i);
  assert.doesNotMatch(patch, /yandex/i);
  assert.doesNotMatch(patch, /~\*\(bot\|/i);
});
