import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOrderAccessToken,
  isOrderAccessSecretUsable,
  verifyOrderAccessToken,
} from './order-access.js';

const secret = 'test-order-access-secret-that-is-long-enough';

test('creates a stable opaque access token for an order code', () => {
  const first = createOrderAccessToken(secret, '4717674');
  const replay = createOrderAccessToken(secret, '4717674');

  assert.match(first || '', /^oa1_[A-Za-z0-9_-]{43}$/);
  assert.equal(replay, first);
  assert.equal(first?.includes('4717674'), false);
});

test('verifies only the matching order code and secret', () => {
  const token = createOrderAccessToken(secret, '4717674');

  assert.equal(verifyOrderAccessToken({ secret, publicCode: '4717674', token }), true);
  assert.equal(verifyOrderAccessToken({ secret, publicCode: '4717675', token }), false);
  assert.equal(verifyOrderAccessToken({ secret: `${secret}-other`, publicCode: '4717674', token }), false);
  assert.equal(verifyOrderAccessToken({ secret, publicCode: '4717674', token: `${token}x` }), false);
});

test('refuses missing and weak secrets', () => {
  assert.equal(isOrderAccessSecretUsable('short'), false);
  assert.equal(createOrderAccessToken('short', '4717674'), null);
  assert.equal(verifyOrderAccessToken({ secret: null, publicCode: '4717674', token: 'oa1_x' }), false);
});
