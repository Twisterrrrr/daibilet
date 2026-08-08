import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUYER_PURCHASES_SEED_EMAIL,
  listBuyerPurchasesSeedForEmail,
  listBuyerPurchasesSeedRows,
  lookupBuyerPurchasesSeedByPublicCode,
} from './buyer-purchases-seed.ts';

test('buyer purchases seed: 3 museum rows for owner email', () => {
  const rows = listBuyerPurchasesSeedRows();
  assert.equal(rows.length, 3);
  assert.equal(BUYER_PURCHASES_SEED_EMAIL, 'v.butin@yandex.ru');
  assert.deepEqual(
    rows.map((row) => row.publicCode),
    ['DB26-BUTIN01', 'DB26-BUTIN02', 'DB26-BUTIN03'],
  );
  assert.ok(rows.every((row) => row.email === BUYER_PURCHASES_SEED_EMAIL));
  assert.ok(rows.filter((row) => row.status === 'CONFIRMED').length >= 2);
  assert.ok(rows.some((row) => row.status === 'PENDING'));
});

test('buyer purchases seed: email filter + publicCode lookup', () => {
  assert.equal(listBuyerPurchasesSeedForEmail('other@example.com').length, 0);
  assert.equal(listBuyerPurchasesSeedForEmail(' V.Butin@yandex.ru ').length, 3);
  const one = lookupBuyerPurchasesSeedByPublicCode('DB26-BUTIN01');
  assert.ok(one);
  assert.equal(one!.venueTitle, 'Третьяковская галерея');
  assert.ok(one!.ticketNumber);
  assert.notEqual(one!.ticketNumber, one!.publicCode);
  assert.equal(lookupBuyerPurchasesSeedByPublicCode('missing'), null);
});
