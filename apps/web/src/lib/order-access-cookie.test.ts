import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeOrderAccessProof,
  extractOrderAccessProof,
  ORDER_ACCESS_COOKIE_NAME,
  readOrderAccessToken,
} from './order-access-cookie';

const proof = { publicCode: '4717674', token: `oa1_${'a'.repeat(43)}` };

test('extracts only a well-formed finance order access proof', () => {
  assert.deepEqual(
    extractOrderAccessProof({ order: { publicCode: proof.publicCode, orderAccessToken: proof.token } }),
    proof,
  );
  assert.equal(extractOrderAccessProof({ order: { publicCode: '4717674', orderAccessToken: 'bad' } }), null);
  assert.equal(extractOrderAccessProof({ order: { publicCode: '471767', orderAccessToken: proof.token } }), null);
});

test('reads the HttpOnly cookie proof only for its exact order code', () => {
  const cookie = `${ORDER_ACCESS_COOKIE_NAME}=${encodeOrderAccessProof(proof)}`;
  assert.equal(readOrderAccessToken(cookie, proof.publicCode), proof.token);
  assert.equal(readOrderAccessToken(cookie, '9999999'), null);
});

test('rejects malformed and unrelated cookies', () => {
  assert.equal(readOrderAccessToken(`${ORDER_ACCESS_COOKIE_NAME}=bad`, proof.publicCode), null);
  assert.equal(readOrderAccessToken(`other=${encodeOrderAccessProof(proof)}`, proof.publicCode), null);
});
