import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REAL_RATING_THRESHOLD,
  shouldEmitAggregateRating,
} from './review-rating.ts';

test('AggregateRating is emitted only from enough real approved reviews', () => {
  assert.equal(REAL_RATING_THRESHOLD, 10);
  assert.equal(shouldEmitAggregateRating(9, 4.8), false);
  assert.equal(shouldEmitAggregateRating(10, 4.8), true);
  assert.equal(shouldEmitAggregateRating(10, 0), false);
});

test('AggregateRating disappears again when the real review count falls below threshold', () => {
  assert.equal(shouldEmitAggregateRating(10, 4.7), true);
  assert.equal(shouldEmitAggregateRating(9, 4.7), false);
});
