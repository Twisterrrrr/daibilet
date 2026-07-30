import assert from 'node:assert/strict';
import test from 'node:test';
import {
  inferAdmissionProductTypeFromVenueKind,
  resolveAdmissionProductReadiness,
} from './admission-products.js';

const now = new Date('2026-07-30T12:00:00.000Z');
type IssueLike = { code: string };

test('infers broad admission type from venue kind', () => {
  assert.equal(inferAdmissionProductTypeFromVenueKind('MUSEUM_ART_SPACE'), 'MUSEUM_ENTRY');
  assert.equal(inferAdmissionProductTypeFromVenueKind('ATTRACTION'), 'ATTRACTION_ENTRY');
  assert.equal(inferAdmissionProductTypeFromVenueKind('THEATER'), 'OTHER');
});

test('allows an active platform admission product with a valid offer', () => {
  const readiness = resolveAdmissionProductReadiness({
    now,
    venueId: 'ven_1',
    supplierId: 'sup_1',
    supplierStatus: 'ACTIVE',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    validityMode: 'OPEN_DATE',
    validTo: '2026-12-31T23:59:59.000Z',
    ticketsVacant: 50,
    offers: [{ active: true, priceRub: 700 }],
  });

  assert.equal(readiness.canSell, true);
  assert.deepEqual(readiness.blockers, []);
});

test('blocks admission product without supplier and active priced offers', () => {
  const readiness = resolveAdmissionProductReadiness({
    now,
    venueId: 'ven_1',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    validityMode: 'OPEN_DATE',
    offers: [{ active: true, priceRub: 10 }],
  });

  assert.equal(readiness.canSell, false);
  assert.deepEqual(readiness.blockers.map((issue: IssueLike) => issue.code), ['MISSING_SUPPLIER', 'PRICE_TOO_LOW']);
});

test('requires valid-days value for rolling validity tickets', () => {
  const readiness = resolveAdmissionProductReadiness({
    now,
    venueId: 'ven_1',
    supplierId: 'sup_1',
    supplierStatus: 'ACTIVE',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    validityMode: 'VALID_DAYS_AFTER_PURCHASE',
    offers: [{ active: true, priceRub: 700 }],
  });

  assert.equal(readiness.canSell, false);
  assert.deepEqual(readiness.blockers.map((issue: IssueLike) => issue.code), ['MISSING_VALID_DAYS']);
});

test('separates Daibilet management warning from hard checkout blockers', () => {
  const readiness = resolveAdmissionProductReadiness({
    now,
    venueId: 'ven_1',
    supplierId: 'sup_1',
    supplierStatus: 'ACTIVE',
    purchaseFlow: 'PLATFORM',
    managementMode: 'SUPPLIER_DRAFTS',
    validityMode: 'OPEN_DATE',
    offers: [{ active: true, priceRub: 700 }],
  });

  assert.equal(readiness.canSell, true);
  assert.deepEqual(readiness.warnings.map((issue: IssueLike) => issue.code), ['NOT_DAIBILET_MANAGED']);
});
