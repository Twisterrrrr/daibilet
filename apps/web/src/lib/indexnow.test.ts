import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getIndexNowKey,
  pathsToAbsoluteUrls,
} from './indexnow.ts';

test('pathsToAbsoluteUrls skips api/admin and absolutizes paths', () => {
  process.env.DAIBILET_SITE_URL = 'https://daibilet.ru';
  const urls = pathsToAbsoluteUrls([
    '/',
    '/blog/hello',
    '/api/public/stats',
    '/admin/events',
    'https://daibilet.ru/events',
    'https://evil.example/x',
  ]);
  assert.deepEqual(urls.sort(), [
    'https://daibilet.ru/',
    'https://daibilet.ru/blog/hello',
    'https://daibilet.ru/events',
  ].sort());
});

test('getIndexNowKey rejects short or invalid keys', () => {
  const prev = process.env.INDEXNOW_KEY;
  process.env.INDEXNOW_KEY = 'abc';
  assert.equal(getIndexNowKey(), null);
  process.env.INDEXNOW_KEY = 'indexnow-key-daibilet-01';
  assert.equal(getIndexNowKey(), 'indexnow-key-daibilet-01');
  if (prev == null) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = prev;
});
