import assert from 'node:assert/strict';
import test from 'node:test';

import {
  daysUntilLocal,
  formatDaysRu,
  resolveNewYearTarget,
  resolveSaluteMay9Target,
  resolveSeasonalCountdownKind,
} from './seasonal-hero-countdown';

test('resolveSeasonalCountdownKind maps new-year and salute', () => {
  assert.equal(resolveSeasonalCountdownKind('new-year'), 'new-year');
  assert.equal(resolveSeasonalCountdownKind('novyj-god'), 'new-year');
  assert.equal(resolveSeasonalCountdownKind('salute-9-maya'), 'salute-may9');
  assert.equal(resolveSeasonalCountdownKind('planetarium'), null);
});

test('new-year target is next Jan 1 in days (not hours)', () => {
  const from = new Date(2026, 6, 26); // 26 Jul 2026
  const target = resolveNewYearTarget(from);
  assert.equal(target.getFullYear(), 2027);
  assert.equal(target.getMonth(), 0);
  assert.equal(target.getDate(), 1);
  assert.equal(daysUntilLocal(target, from), 159);
});

test('new-year on Jan 1 is today (0 days)', () => {
  const from = new Date(2027, 0, 1);
  assert.equal(daysUntilLocal(resolveNewYearTarget(from), from), 0);
});

test('salute May 9 uses days until holiday', () => {
  const before = new Date(2026, 3, 1); // 1 Apr
  assert.equal(daysUntilLocal(resolveSaluteMay9Target(before), before), 38);
  const after = new Date(2026, 4, 10); // 10 May
  const next = resolveSaluteMay9Target(after);
  assert.equal(next.getFullYear(), 2027);
});

test('formatDaysRu pluralization', () => {
  assert.equal(formatDaysRu(1), '1 день');
  assert.equal(formatDaysRu(2), '2 дня');
  assert.equal(formatDaysRu(5), '5 дней');
  assert.equal(formatDaysRu(21), '21 день');
  assert.equal(formatDaysRu(159), '159 дней');
});
