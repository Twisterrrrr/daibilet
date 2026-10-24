import assert from 'node:assert/strict';
import test from 'node:test';

import {
  YANDEX_EVENTS_CLEAN_PARAMS,
  renderPublicRobotsTxt,
  resolveRobotsSiteUrl,
} from './robots-policy.ts';

test('robots keeps public routes crawlable and private flows disallowed', () => {
  const text = renderPublicRobotsTxt('https://daibilet.ru/');
  assert.match(text, /User-agent: \*/);
  assert.match(text, /Disallow: \/checkout\//);
  assert.match(text, /Sitemap: https:\/\/daibilet\.ru\/sitemap\.xml/);
});

test('Clean-param is Yandex-only and excludes result-changing event filters', () => {
  const text = renderPublicRobotsTxt();
  const cleanLine = text.split('\n').find((line) => line.startsWith('Clean-param:')) || '';
  assert.equal(cleanLine, `Clean-param: ${YANDEX_EVENTS_CLEAN_PARAMS.join('&')} /events`);
  for (const key of ['city', 'category', 'date', 'from', 'to', 'sort', 'page', 'limit']) {
    assert.ok(!YANDEX_EVENTS_CLEAN_PARAMS.includes(key as never), `${key} must affect crawl identity`);
  }
  assert.equal(text.indexOf('Clean-param:'), text.lastIndexOf('Clean-param:'));
  assert.ok(text.indexOf('User-agent: Yandex') < text.indexOf('Clean-param:'));
});

test('site URL is normalized from environment', () => {
  assert.equal(
    resolveRobotsSiteUrl({ DAIBILET_SITE_URL: 'https://example.test/' }),
    'https://example.test',
  );
});
