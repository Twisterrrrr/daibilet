import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasUpcomingOrOpenSchedule,
  isOpenDateCatalogRow,
  isPublicSalesStatusBlocked,
  isPublicSessionRowOnSale,
  isSaleableEventForPublic,
  isSaleableForPublicCatalog,
} from './catalog-availability.js';

test('isOpenDateCatalogRow accepts OPEN_DATE kind and open_date status', () => {
  assert.equal(isOpenDateCatalogRow({ kind: 'OPEN_DATE' }), true);
  assert.equal(isOpenDateCatalogRow({ sourceStatus: 'open_date' }), true);
  assert.equal(isOpenDateCatalogRow({ kind: 'SINGLE' }), false);
  assert.equal(isOpenDateCatalogRow({ kind: 'RECURRING', sourceStatus: 'PUBLIC' }), false);
  assert.equal(isOpenDateCatalogRow({ kind: 'SERIES', sourceStatus: 'widget' }), false);
});

test('hasUpcomingOrOpenSchedule rejects past TEP rows without schedule', () => {
  const past = new Date(Date.now() - 20 * 60_000).toISOString();
  assert.equal(hasUpcomingOrOpenSchedule({ kind: 'SINGLE', startsAt: past }), false);
  assert.equal(hasUpcomingOrOpenSchedule({ kind: 'SINGLE', startsAt: null }), false);
});

test('hasUpcomingOrOpenSchedule accepts widget-only purchase rows', () => {
  assert.equal(hasUpcomingOrOpenSchedule({ kind: 'RECURRING', sourceStatus: 'widget', startsAt: null }), true);
});

test('hasUpcomingOrOpenSchedule accepts running session via endsAt', () => {
  const started = new Date(Date.now() - 3_600_000).toISOString();
  const ends = new Date(Date.now() + 3_600_000).toISOString();
  assert.equal(hasUpcomingOrOpenSchedule({ kind: 'RECURRING', startsAt: started, endsAt: ends }), true);
});

test('hasUpcomingOrOpenSchedule rejects stale wide-lifetime rows', () => {
  const started = new Date(Date.now() - 400 * 24 * 3_600_000).toISOString();
  const ends = new Date(Date.now() + 400 * 24 * 3_600_000).toISOString();
  assert.equal(hasUpcomingOrOpenSchedule({ kind: 'SINGLE', startsAt: started, endsAt: ends }), false);
});

test('isPublicSalesStatusBlocked covers TC STAND_BY and closed sales', () => {
  assert.equal(isPublicSalesStatusBlocked('STAND_BY'), true);
  assert.equal(isPublicSalesStatusBlocked('stand_by'), true);
  assert.equal(isPublicSalesStatusBlocked('closed'), true);
  assert.equal(isPublicSalesStatusBlocked('sales_closed'), true);
  assert.equal(isPublicSalesStatusBlocked('paused'), true);
  assert.equal(isPublicSalesStatusBlocked('PUBLIC'), false);
  assert.equal(isPublicSalesStatusBlocked(null), false);
});

test('isPublicSessionRowOnSale hides inactive and cancelled sessions', () => {
  assert.equal(isPublicSessionRowOnSale({ isActive: true, sourceStatus: 'PUBLIC' }), true);
  assert.equal(isPublicSessionRowOnSale({ isActive: false, sourceStatus: 'PUBLIC' }), false);
  assert.equal(isPublicSessionRowOnSale({ isActive: true, cancelledAt: new Date(), sourceStatus: 'PUBLIC' }), false);
  assert.equal(isPublicSessionRowOnSale({ isActive: true, sourceStatus: 'STAND_BY' }), false);
});

test('isSaleableForPublicCatalog requires widget-ready schedule; price optional; blocks closed sales', () => {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  assert.equal(
    isSaleableForPublicCatalog({ kind: 'SINGLE', startsAt: future, purchaseReady: true, priceFrom: 500 }),
    true,
  );
  assert.equal(
    isSaleableForPublicCatalog({ kind: 'SINGLE', startsAt: future, purchaseReady: true, priceFrom: null }),
    true,
  );
  assert.equal(
    isSaleableForPublicCatalog({ kind: 'SINGLE', startsAt: future, purchaseReady: true, priceFrom: 10 }),
    true,
  );
  assert.equal(
    isSaleableForPublicCatalog({ kind: 'SINGLE', startsAt: future, purchaseReady: false, priceFrom: 500 }),
    false,
  );
  assert.equal(
    isSaleableForPublicCatalog({
      kind: 'SINGLE',
      startsAt: future,
      purchaseReady: true,
      priceFrom: 500,
      sourceStatus: 'STAND_BY',
    }),
    false,
  );
  assert.equal(isSaleableEventForPublic, isSaleableForPublicCatalog);
});
