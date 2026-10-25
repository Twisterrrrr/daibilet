import assert from 'node:assert/strict';
import test from 'node:test';

import { internalEventPurchasePath, type InternalEventPurchaseInput } from './internal-event-purchase.js';

const ready: InternalEventPurchaseInput = {
  eventId: 'event-1', slug: 'pilot-museum', kind: 'OPEN_DATE', status: 'READY',
  purchaseFlow: 'PLATFORM', managementMode: 'SUPPLIER_DRAFTS',
  supplierStatus: 'ACTIVE', legalProfileStatus: 'VERIFIED', ticketsVacant: 10,
  salesStartsAt: null, salesEndsAt: null, openDateValidFrom: null, openDateValidTo: null,
  offers: [{ eventId: 'event-1', sourceCode: 'MANUAL', active: true, priceRub: 350 }],
};

test('exposes internal checkout only for a verified ready open-date event', () => {
  assert.equal(internalEventPurchasePath(ready), '/checkout/events/pilot-museum');
  assert.equal(internalEventPurchasePath({ ...ready, status: 'REVIEW' }), null);
  assert.equal(internalEventPurchasePath({ ...ready, legalProfileStatus: 'DRAFT' }), null);
  assert.equal(internalEventPurchasePath({ ...ready, supplierStatus: 'DRAFT' }), null);
  assert.equal(internalEventPurchasePath({ ...ready, ticketsVacant: 0 }), null);
  assert.equal(internalEventPurchasePath({ ...ready, kind: 'RECURRING' }), null);
  assert.equal(internalEventPurchasePath({ ...ready, offers: [] }), null);
});

test('does not expose checkout before sales or open-date validity starts', () => {
  const now = new Date('2026-10-23T12:00:00.000Z');
  assert.equal(internalEventPurchasePath({ ...ready, salesStartsAt: new Date('2026-10-24T00:00:00.000Z') }, now), null);
  assert.equal(internalEventPurchasePath({ ...ready, openDateValidFrom: new Date('2026-10-24T00:00:00.000Z') }, now), null);
  assert.equal(internalEventPurchasePath({ ...ready, salesEndsAt: new Date('2026-10-22T00:00:00.000Z') }, now), null);
});
