import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  hashRecoveryCode,
  totpAtStep,
  verifyTotp,
} from './admin-mfa.js';

const env = { DAIBILET_ADMIN_MFA_ENCRYPTION_KEY: '11'.repeat(32) };

test('TOTP matches RFC 6238 SHA1 test vector for the 6-digit profile', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totpAtStep(secret, 1), '287082'); // 59 seconds / 30-second period
  assert.equal(verifyTotp(secret, '287082', 59_000), 1n);
});

test('TOTP rejects malformed and already consumed codes', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(verifyTotp(secret, '12x456', 59_000), null);
  assert.equal(verifyTotp(secret, '287082', 59_000, 1n), null);
});

test('TOTP secret is authenticated-encrypted and requires a 256-bit key', () => {
  const encrypted = encryptTotpSecret('SENSITIVE-SECRET', env);
  assert.notEqual(encrypted, 'SENSITIVE-SECRET');
  assert.equal(decryptTotpSecret(encrypted, env), 'SENSITIVE-SECRET');
  assert.throws(() => decryptTotpSecret(encrypted, { DAIBILET_ADMIN_MFA_ENCRYPTION_KEY: 'wrong' }));
});

test('recovery code hashing normalizes separators and case', () => {
  assert.equal(hashRecoveryCode('abCD-1234-ef56'), hashRecoveryCode('ABCD1234EF56'));
  assert.notEqual(hashRecoveryCode('ABCD1234EF56'), hashRecoveryCode('ABCD1234EF57'));
});
