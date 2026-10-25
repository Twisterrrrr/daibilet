import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveAdmissionProductListingHealth,
  resolveEventListingHealth,
  resolveVenueListingHealth,
} from './listing-health.js';

test('blocks an event without purchase entry, price and future sessions', () => {
  const health = resolveEventListingHealth({
    now: new Date('2026-07-30T12:00:00.000Z'),
    title: 'Экскурсия',
    status: 'PUBLISHED',
    kind: 'RECURRING',
    categoryId: 'cat',
    primarySubcategoryId: 'sub',
    cityId: 'city',
    venueId: 'venue',
    offersCount: 0,
    hasPurchaseEntry: false,
    priceFromRub: null,
  });

  assert.equal(health.status, 'blocked');
  assert.equal(health.canSell, false);
  assert.deepEqual(
    health.blockers.map((issue) => issue.code),
    ['MISSING_OFFER', 'MISSING_PRICE', 'MISSING_PURCHASE_ENTRY', 'NO_FUTURE_SESSIONS'],
  );
});

test('keeps venue in review when only soft content issues remain', () => {
  const health = resolveVenueListingHealth({
    title: 'Музей',
    cityId: 'city',
    address: 'Невский проспект',
    heroImageUrl: null,
    eventsCount: 3,
  });

  assert.equal(health.status, 'review');
  assert.equal(health.canPublish, true);
  assert.deepEqual(health.warnings.map((issue) => issue.code), ['MISSING_IMAGE']);
});

test('uses admission readiness blockers in admission listing health', () => {
  const health = resolveAdmissionProductListingHealth({
    title: 'Входной билет',
    status: 'PUBLISHED',
    readiness: {
      canSell: false,
      blockers: [{ code: 'MISSING_PRICE', label: 'Нет цены', severity: 'high' }],
      warnings: [{ code: 'NOT_DAIBILET_MANAGED', label: 'Не вручную', severity: 'medium' }],
    },
  });

  assert.equal(health.entityType, 'ADMISSION_PRODUCT');
  assert.equal(health.status, 'blocked');
  assert.deepEqual(health.blockers.map((issue) => issue.code), ['MISSING_PRICE']);
  assert.deepEqual(health.warnings.map((issue) => issue.code), ['MISSING_IMAGE', 'NOT_DAIBILET_MANAGED']);
});
