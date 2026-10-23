import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeOrderAccessProof,
  extractOrderAccessProof,
  ORDER_ACCESS_COOKIE_NAME,
  readOrderAccessToken,
} from './order-access-cookie.ts';

const proof = {
  publicCode: '4717674',
  token: `oa1_${'a'.repeat(43)}`,
};

test('removes the finance access proof from the browser response and returns it for HttpOnly storage', () => {
  const source = {
    order: { publicCode: proof.publicCode, status: 'PENDING_PAYMENT', orderAccessToken: proof.token },
  };

  const result = extractOrderAccessProof(source);

  assert.deepEqual(result.proof, proof);
  assert.deepEqual(result.payload, { order: { publicCode: proof.publicCode, status: 'PENDING_PAYMENT' } });
  assert.equal('orderAccessToken' in source.order, true);
});

test('reads proof only for the matching order code', () => {
  const cookie = `${ORDER_ACCESS_COOKIE_NAME}=${encodeOrderAccessProof(proof)}`;
  assert.equal(readOrderAccessToken(cookie, proof.publicCode), proof.token);
  assert.equal(readOrderAccessToken(cookie, '9999999'), null);
});

test('rejects malformed, unrelated and invalid-token cookies', () => {
  assert.equal(readOrderAccessToken(`${ORDER_ACCESS_COOKIE_NAME}=not-base64`, proof.publicCode), null);
  assert.equal(readOrderAccessToken(`other_cookie=${encodeOrderAccessProof(proof)}`, proof.publicCode), null);
  assert.equal(readOrderAccessToken(`${ORDER_ACCESS_COOKIE_NAME}=${encodeOrderAccessProof({ ...proof, token: 'bad' })}`, proof.publicCode), null);
});

test('never exposes malformed access token values in the create response', () => {
  const result = extractOrderAccessProof({
    order: { publicCode: proof.publicCode, orderAccessToken: 'bad-token' },
  });

  assert.equal(result.proof, null);
  assert.deepEqual(result.payload, { order: { publicCode: proof.publicCode } });
});
