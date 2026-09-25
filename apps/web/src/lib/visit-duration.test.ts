import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatVisitDuration,
  HALF_DAY_VISIT_MINUTES,
  normalizeVisitMinutes,
} from './visit-duration.ts';

test('normalizeVisitMinutes hides empty and junk', () => {
  assert.equal(normalizeVisitMinutes(undefined), null);
  assert.equal(normalizeVisitMinutes(null), null);
  assert.equal(normalizeVisitMinutes(0), null);
  assert.equal(normalizeVisitMinutes(3), null);
  assert.equal(normalizeVisitMinutes(9999), null);
  assert.equal(normalizeVisitMinutes('90'), 90);
});

test('normalizeVisitMinutes parses editorial chip labels', () => {
  assert.equal(normalizeVisitMinutes('полдня'), HALF_DAY_VISIT_MINUTES);
  assert.equal(normalizeVisitMinutes('1-2 ч'), 90);
  assert.equal(normalizeVisitMinutes('20 мин'), 20);
  assert.equal(normalizeVisitMinutes('1,5 ч'), 90);
  assert.equal(normalizeVisitMinutes('2 ч'), 120);
});

test('formatVisitDuration uses compact hub chip copy', () => {
  assert.equal(formatVisitDuration(15), '15 мин');
  assert.equal(formatVisitDuration(21), '21 мин');
  assert.equal(formatVisitDuration(45), '45 мин');
  assert.equal(formatVisitDuration(60), '1 ч');
  assert.equal(formatVisitDuration(90), '1,5 ч');
  assert.equal(formatVisitDuration(120), '2 ч');
  assert.equal(formatVisitDuration(150), '2,5 ч');
  assert.equal(formatVisitDuration(180), '3 ч');
  assert.equal(formatVisitDuration(75), '1 ч 15 мин');
  assert.equal(formatVisitDuration(undefined), null);
});

test('formatVisitDuration keeps editorial labels exact', () => {
  assert.equal(formatVisitDuration('1-2 ч'), '1-2 ч');
  assert.equal(formatVisitDuration('полдня'), 'полдня');
  assert.equal(formatVisitDuration('20 мин'), '20 мин');
  assert.equal(formatVisitDuration('1,5 ч'), '1,5 ч');
  assert.equal(formatVisitDuration('2 ч'), '2 ч');
});
