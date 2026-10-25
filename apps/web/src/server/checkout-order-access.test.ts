import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_ORDER_ACCESS_COOKIE,
  extractCheckoutOrderAccessProof,
  readCheckoutOrderAccessProof,
  serializeCheckoutOrderAccessProof,
  stripCheckoutOrderAccessToken,
} from './checkout-order-access';

const token = `oa1_${'a'.repeat(43)}`;

test('order access proof is accepted only for its matching public code', () => {
  const proof = { publicCode: '1234567', token };
  const header = `other=value; ${CHECKOUT_ORDER_ACCESS_COOKIE}=${serializeCheckoutOrderAccessProof(proof)}`;
  assert.deepEqual(readCheckoutOrderAccessProof(header, '1234567'), proof);
  assert.equal(readCheckoutOrderAccessProof(header, '7654321'), null);
  assert.equal(readCheckoutOrderAccessProof(`${CHECKOUT_ORDER_ACCESS_COOKIE}=1234567.bad`, '1234567'), null);
});

test('proof extraction rejects a different order code and strips secret from client payload', () => {
  const payload = { order: { publicCode: '1234567', orderAccessToken: token, status: 'PENDING' } };
  assert.deepEqual(extractCheckoutOrderAccessProof(payload, '1234567'), { publicCode: '1234567', token });
  assert.equal(extractCheckoutOrderAccessProof(payload, '7654321'), null);
  assert.deepEqual(stripCheckoutOrderAccessToken(payload), { order: { publicCode: '1234567', status: 'PENDING' } });
});
