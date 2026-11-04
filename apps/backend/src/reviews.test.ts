import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRatingSummary,
  REAL_RATING_THRESHOLD,
  resolveDisplayedRating,
  resolvePseudoRating45to50,
  shouldEmitAggregateRating,
} from './review-rating.js';
import { formatReviewDisplayName, maskPurchaseRef } from './review-display.js';
import { isConfirmedOrderStatus, normalizeEmail } from './review-verification.js';
import { canAcceptReviews, resolveReviewCapability } from './review-capability.js';

describe('review display', () => {
  it('formats display name as Имя Ф.', () => {
    assert.equal(formatReviewDisplayName('Иван Петров'), 'Иван П.');
    assert.equal(formatReviewDisplayName('Мария'), 'Мария');
    assert.equal(formatReviewDisplayName('  Анна  Сергеевна  Иванова '), 'Анна И.');
  });

  it('masks purchase refs', () => {
    assert.equal(maskPurchaseRef('ABCD1234'), '•••1234');
    assert.equal(maskPurchaseRef('12'), '••12');
  });
});

describe('review rating / pseudo', () => {
  it('keeps pseudo in 4.5–5.0 until threshold', () => {
    const pseudo = resolvePseudoRating45to50('event-abc');
    assert.ok(pseudo >= 4.5 && pseudo <= 5.0);
    assert.equal(resolveDisplayedRating('event-abc', 3.2, 3), pseudo);
    assert.equal(resolveDisplayedRating('event-abc', 4.7, REAL_RATING_THRESHOLD), 4.7);
  });

  it('emits AggregateRating only at ≥10 real reviews', () => {
    assert.equal(shouldEmitAggregateRating(9, 4.8), false);
    assert.equal(shouldEmitAggregateRating(10, 4.8), true);
    assert.equal(shouldEmitAggregateRating(10, 0), false);
  });

  it('builds summary with displayedRating', () => {
    const summary = buildRatingSummary('seed-1', [
      { rating: 5, isVerified: true },
      { rating: 4, isVerified: false },
    ]);
    assert.equal(summary.reviewCount, 2);
    assert.equal(summary.avgRating, 4.5);
    assert.equal(summary.verifiedCount, 1);
    assert.ok(summary.displayedRating >= 4.5);
  });
});

describe('review verification helpers', () => {
  it('normalizes email and confirmed statuses', () => {
    assert.equal(normalizeEmail('  Foo@Bar.RU '), 'foo@bar.ru');
    assert.equal(isConfirmedOrderStatus('done'), true);
    assert.equal(isConfirmedOrderStatus('PAID'), true);
    assert.equal(isConfirmedOrderStatus('cancelled'), false);
    assert.equal(isConfirmedOrderStatus('refunded'), false);
  });
});

describe('review capability (aggregator)', () => {
  it('allows TC / TEP / manual — opposite of SPBBOATS ban', () => {
    assert.equal(resolveReviewCapability({ id: '1', sourceCode: 'ticketscloud' }), 'ENABLED');
    assert.equal(canAcceptReviews({ id: '2', sourceCode: 'teplohod', managementMode: 'SOURCE_MANAGED' }), true);
    assert.equal(canAcceptReviews({ id: '3', purchaseFlow: 'INTERNAL', supplierId: 's1' }), true);
  });
});
