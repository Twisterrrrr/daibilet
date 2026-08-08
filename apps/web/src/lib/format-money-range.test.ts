import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMoneyRange, formatLandingBuyPrice, formatPriceFrom, moneyRangeStatLabel } from './format.ts';

test('formatMoneyRange shows min-max with hyphen when prices differ', () => {
  assert.equal(formatMoneyRange(990, 2490), `990-${(2490).toLocaleString('ru-RU')} ₽`);
});

test('formatMoneyRange uses от for a single price', () => {
  assert.equal(formatMoneyRange(990, 990), 'от 990 ₽');
  assert.equal(formatMoneyRange(990, null), 'от 990 ₽');
});

test('formatPriceFrom is CTA-only от min (never range)', () => {
  assert.equal(formatPriceFrom(990), 'от 990 ₽');
  assert.notEqual(formatPriceFrom(990), formatMoneyRange(990, 2490));
});

test('formatLandingBuyPrice shows min-max or exact price without от', () => {
  assert.equal(formatLandingBuyPrice(990, 2490), `990-${(2490).toLocaleString('ru-RU')} ₽`);
  assert.equal(formatLandingBuyPrice(2190, 2190), `${(2190).toLocaleString('ru-RU')} ₽`);
  assert.equal(formatLandingBuyPrice(2190, null), `${(2190).toLocaleString('ru-RU')} ₽`);
  assert.ok(!formatLandingBuyPrice(2190, null).startsWith('от'));
});

test('moneyRangeStatLabel is honest for single vs range', () => {
  assert.equal(moneyRangeStatLabel(990, 2490), 'диапазон цен');
  assert.equal(moneyRangeStatLabel(990, 990), 'цена от');
  assert.equal(moneyRangeStatLabel(990, null), 'цена от');
});
