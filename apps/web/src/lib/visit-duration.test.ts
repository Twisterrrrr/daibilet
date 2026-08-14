import assert from 'node:assert/strict';
import test from 'node:test';

import { formatVisitDuration, normalizeVisitMinutes } from './visit-duration.ts';

test('normalizeVisitMinutes hides empty and junk', () => {
  assert.equal(normalizeVisitMinutes(undefined), null);
  assert.equal(normalizeVisitMinutes(null), null);
  assert.equal(normalizeVisitMinutes(0), null);
  assert.equal(normalizeVisitMinutes(3), null);
  assert.equal(normalizeVisitMinutes(9999), null);
  assert.equal(normalizeVisitMinutes('90'), 90);
});

test('formatVisitDuration uses Russian hub copy', () => {
  assert.equal(formatVisitDuration(15), '15 минут');
  assert.equal(formatVisitDuration(21), '21 минута');
  assert.equal(formatVisitDuration(45), '45 минут');
  assert.equal(formatVisitDuration(60), '1 час');
  assert.equal(formatVisitDuration(90), '1,5 часа');
  assert.equal(formatVisitDuration(120), '2 часа');
  assert.equal(formatVisitDuration(150), '2,5 часа');
  assert.equal(formatVisitDuration(180), '3 часа');
  assert.equal(formatVisitDuration(75), '1 час 15 минут');
  assert.equal(formatVisitDuration(undefined), null);
});
