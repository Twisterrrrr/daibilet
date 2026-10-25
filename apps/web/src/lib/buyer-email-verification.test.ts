import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBuyerEmailVerification } from './buyer-email-verification.ts';

test('без признака в DTO статус unknown, браузер не угадывает подтверждение email', () => {
  assert.equal(resolveBuyerEmailVerification(undefined), 'unknown');
  assert.equal(resolveBuyerEmailVerification(null), 'unknown');
  assert.equal(resolveBuyerEmailVerification({}), 'unknown');
  assert.equal(resolveBuyerEmailVerification({ total: 0, rows: [] }), 'unknown');
  assert.equal(resolveBuyerEmailVerification({ account: {} }), 'unknown');
  assert.equal(resolveBuyerEmailVerification({ account: null }), 'unknown');
  assert.equal(resolveBuyerEmailVerification({ account: 'verified' }), 'unknown');
  assert.equal(resolveBuyerEmailVerification({ account: { emailVerified: 'yes' } }), 'unknown');
  assert.equal(resolveBuyerEmailVerification({ account: { emailVerified: 1 } }), 'unknown');
});

test('строгий булев признак из DTO переводит статус в verified/unverified', () => {
  assert.equal(resolveBuyerEmailVerification({ account: { emailVerified: true } }), 'verified');
  assert.equal(resolveBuyerEmailVerification({ account: { emailVerified: false } }), 'unverified');
});
