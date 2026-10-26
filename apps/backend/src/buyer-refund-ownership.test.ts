import assert from 'node:assert/strict';
import test from 'node:test';
import { buyerCheckoutOrderOwnershipWhere } from './purchase-projection.js';

test('buyer refund lookup accepts a direct SiteUser link regardless of email verification', () => {
  assert.deepEqual(buyerCheckoutOrderOwnershipWhere({
    publicCode: ' DB26-784501 ',
    siteUserId: 'buyer-1',
    email: 'buyer@example.com',
    emailVerified: false,
  }), {
    publicCode: 'DB26-784501',
    OR: [{ siteUserId: 'buyer-1' }],
  });
});

test('verified email can claim only a guest order that has no different SiteUser owner', () => {
  assert.deepEqual(buyerCheckoutOrderOwnershipWhere({
    publicCode: 'DB26-784501',
    siteUserId: 'buyer-1',
    email: ' Buyer@Example.com ',
    emailVerified: true,
  }), {
    publicCode: 'DB26-784501',
    OR: [
      { siteUserId: 'buyer-1' },
      { siteUserId: null, buyerEmail: { equals: 'buyer@example.com', mode: 'insensitive' } },
    ],
  });
});

test('unverified email is never used to locate a guest order for refund', () => {
  assert.deepEqual(buyerCheckoutOrderOwnershipWhere({
    publicCode: 'DB26-784501',
    siteUserId: 'buyer-1',
    email: 'buyer@example.com',
    emailVerified: false,
  }).OR, [{ siteUserId: 'buyer-1' }]);
});
