import assert from 'node:assert/strict';
import test from 'node:test';

import { freshnessMapFromRows, publicFreshnessSlug } from './public-event-freshness.js';

test('Cyrillic database slug matches the Latin sitemap URL', () => {
  const map = freshnessMapFromRows([
    { slug: 'Большой-концерт-29-сентября', updatedAt: '2026-09-27T10:00:00.000Z' },
  ]);
  assert.equal(map.get('bolshoy-koncert-29-sentyabrya')?.toISOString(), '2026-09-27T10:00:00.000Z');
});

test('Latin slug remains unchanged and the newest duplicate wins', () => {
  assert.equal(publicFreshnessSlug('tc-123-planetarii-1'), 'tc-123-planetarii-1');
  const map = freshnessMapFromRows([
    { slug: 'tc-123-planetarii-1', updatedAt: '2026-09-20T00:00:00.000Z' },
    { slug: 'tc-123-planetarii-1', updatedAt: '2026-09-25T00:00:00.000Z' },
  ]);
  assert.equal(map.get('tc-123-planetarii-1')?.toISOString(), '2026-09-25T00:00:00.000Z');
});
