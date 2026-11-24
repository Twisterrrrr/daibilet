import assert from 'node:assert/strict';
import test from 'node:test';

import { isExcludedFromNewYearLanding } from './new-year-preview-relevance';

test('stand-up events are excluded from the New Year selection even when the title mentions Christmas', () => {
  assert.equal(isExcludedFromNewYearLanding({ title: 'Stand Up на Рождественской' }), true);
  assert.equal(isExcludedFromNewYearLanding({ title: 'New Year Stand-up Special' }), true);
  assert.equal(isExcludedFromNewYearLanding({ title: 'Новогодняя ёлка для самых маленьких' }), false);
  assert.equal(isExcludedFromNewYearLanding({ title: 'Новогодний концерт', category: 'Концерты' }), false);
});
