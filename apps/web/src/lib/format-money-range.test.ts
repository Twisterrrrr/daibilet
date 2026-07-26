import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMoneyRange, moneyRangeStatLabel } from './format';

test('formatMoneyRange shows min-max with hyphen when prices differ', () => {
  assert.equal(formatMoneyRange(990, 2490), `990-${(2490).toLocaleString('ru-RU')} ₽`);
});

test('formatMoneyRange uses от for a single price', () => {
  assert.equal(formatMoneyRange(990, 990), 'от 990 ₽');
  assert.equal(formatMoneyRange(990, null), 'от 990 ₽');
});

test('moneyRangeStatLabel is honest for single vs range', () => {
  assert.equal(moneyRangeStatLabel(990, 2490), 'диапазон цен');
  assert.equal(moneyRangeStatLabel(990, 990), 'цена от');
  assert.equal(moneyRangeStatLabel(990, null), 'цена от');
});
