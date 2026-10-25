import assert from 'node:assert/strict';
import test from 'node:test';

import { createSiteUserEmailVerificationToken, verifySiteUserEmail } from './user-auth.js';

test('email verification token is one-time and rejects tampering', async () => {
  let verified = false;
  const db = {
    async query(_sql: string, values: string[]) {
      assert.deepEqual(values, ['user-1']);
      if (verified) return { rows: [] };
      verified = true;
      return { rows: [{ id: 'user-1' }] };
    },
  };
  const token = createSiteUserEmailVerificationToken('user-1');
  assert.deepEqual(await verifySiteUserEmail(db, token), { verified: true });
  await assert.rejects(verifySiteUserEmail(db, token), /уже использована/);
  await assert.rejects(verifySiteUserEmail(db, `${token}tampered`), /недействительна/);
});

test('email verification rejects expired and oversized tokens before database access', async () => {
  const token = createSiteUserEmailVerificationToken('user-2');
  const originalNow = Date.now;
  Date.now = () => originalNow() + 25 * 60 * 60 * 1000;
  try {
    await assert.rejects(verifySiteUserEmail({ query: () => { throw new Error('database called'); } }, token), /истёк/);
  } finally {
    Date.now = originalNow;
  }
  await assert.rejects(verifySiteUserEmail({ query: () => { throw new Error('database called'); } }, 'x'.repeat(4097)), /недействительна/);
});
