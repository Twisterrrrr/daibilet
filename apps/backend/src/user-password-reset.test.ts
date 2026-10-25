import assert from 'node:assert/strict';
import test from 'node:test';
import { createSiteUserPasswordResetToken, requestSiteUserPasswordReset, resetSiteUserPassword } from './user-password-reset.js';

test('password reset is one-time, invalidates refresh token and verifies email', async () => {
  let passwordHash = 'old-password-hash';
  let refreshCleared = false;
  const db = { async query(sql: string, args: string[]) {
    if (sql.startsWith('select id, email')) return { rows: [{ id: 'user-1', email: 'a@example.com', passwordHash }] };
    if (sql.startsWith('select "passwordHash"')) return { rows: [{ passwordHash }] };
    assert.match(sql, /"refreshTokenHash" = null/);
    assert.match(sql, /"emailVerifiedAt" = coalesce/);
    if (args[2] !== passwordHash) return { rows: [] };
    passwordHash = args[1]!; refreshCleared = true;
    return { rows: [{ id: 'user-1' }] };
  } };
  const user = await requestSiteUserPasswordReset(db, ' A@EXAMPLE.COM ');
  const token = createSiteUserPasswordResetToken(user);
  assert.deepEqual(await resetSiteUserPassword(db, token, 'new-strong-password'), { reset: true });
  assert.equal(refreshCleared, true);
  await assert.rejects(resetSiteUserPassword(db, token, 'another-strong-password'), /уже использована/);
  await assert.rejects(resetSiteUserPassword(db, `${token}x`, 'another-strong-password'), /недействительна/);
});

test('password reset rejects short password and expired token', async () => {
  const token = createSiteUserPasswordResetToken({ id: 'user-2', passwordHash: 'hash' });
  await assert.rejects(resetSiteUserPassword({}, token, 'short'), /от 10/);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 2 * 60 * 60 * 1000;
  try { await assert.rejects(resetSiteUserPassword({}, token, 'long-enough-password'), /недействительна/); }
  finally { Date.now = originalNow; }
});

test('pending supplier invitation cannot be turned into a login through password reset', async () => {
  const db = { async query() { return { rows: [{ id: 'invited', email: 'invited@example.com', passwordHash: 'invite:pending' }] }; } };
  assert.equal(await requestSiteUserPasswordReset(db, 'invited@example.com'), null);
});
