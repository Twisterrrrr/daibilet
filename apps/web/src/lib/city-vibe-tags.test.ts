import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCityVibeTags } from './city-vibe-tags.ts';

test('vibe tags: major cities return 2-4 tags', () => {
  for (const slug of ['moscow', 'saint-petersburg', 'kazan', 'sochi', 'kaliningrad']) {
    const tags = resolveCityVibeTags(slug);
    assert.ok(tags.length >= 2 && tags.length <= 4, slug);
    assert.ok(tags.every((t) => t.icon && t.label));
  }
});

test('vibe tags: aliases resolve to canon', () => {
  const a = resolveCityVibeTags('sankt-peterburg');
  const b = resolveCityVibeTags('saint-petersburg');
  assert.deepEqual(a, b);
  assert.ok(a.some((t) => t.label.includes('Мосты') || t.label.includes('Эрмитаж')));
});

test('vibe tags: unknown slug returns empty', () => {
  assert.deepEqual(resolveCityVibeTags('no-such-city'), []);
});

test('vibe tags: copy uses hyphen not emdash', () => {
  const tags = resolveCityVibeTags('kazan');
  for (const tag of tags) {
    assert.equal(tag.label.includes('—'), false);
    assert.equal(tag.label.includes('–'), false);
  }
});
