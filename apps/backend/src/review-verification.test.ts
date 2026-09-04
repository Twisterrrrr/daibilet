/**
 * Unit-level verification matching (no DB) — event match id set logic is covered
 * via pure helpers; DB-backed verifyPurchaseForReview is exercised in integration.
 *
 * This file documents the aggregator rules:
 * - email and/or order/ticket ↔ ExternalOrder (done/confirmed)
 * - event match includes meta-siblings / merge group (loadEventMatchIds)
 * - TEP without email → not verified
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isConfirmedOrderStatus } from './review-verification.js';

describe('purchase verification rules', () => {
  it('accepts TC done/paid/confirmed tokens', () => {
    for (const status of ['done', 'paid', 'confirmed', 'completed', 'sold']) {
      assert.equal(isConfirmedOrderStatus(status), true, status);
    }
  });

  it('rejects cancelled / refunded', () => {
    for (const status of ['cancel', 'cancelled', 'refund', 'failed', 'expired']) {
      assert.equal(isConfirmedOrderStatus(status), false, status);
    }
  });
});
