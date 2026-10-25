import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminFinanceActorAssertion } from './admin-finance-actor.ts';

test('finance actor assertion is signed with the active role permission set and short expiry', () => {
  const now = Date.parse('2026-10-25T12:00:00.000Z');
  const assertion = createAdminFinanceActorAssertion({
    id: 'staff-1',
    displayName: 'Иван Финансов',
    sessionId: 'session-1',
    roles: ['FINANCE', 'FINANCE'],
    mfaVerified: true,
  }, 'a-long-enough-finance-actor-secret-for-tests', now);
  const [encoded, signature] = assertion.split('.');
  const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>;
  assert.equal(typeof signature, 'string');
  assert.equal(claims.sub, 'staff-1');
  assert.equal(claims.sid, 'session-1');
  assert.equal(claims.exp as number - (claims.iat as number), 90);
  assert.ok((claims.permissions as string[]).includes('refunds.execute'));
  assert.ok(!(claims.permissions as string[]).includes('catalog.publish'));
});

test('finance rights stay out of the signed assertion until MFA is completed', () => {
  const assertion = createAdminFinanceActorAssertion({
    id: 'staff-1', displayName: 'Иван Финансов', sessionId: 'session-1', roles: ['FINANCE'],
  }, 'a-long-enough-finance-actor-secret-for-tests', Date.parse('2026-10-25T12:00:00.000Z'));
  const [encoded] = assertion.split('.');
  const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { mfaVerified: boolean; permissions: string[] };
  assert.equal(claims.mfaVerified, false);
  assert.ok(claims.permissions.includes('orders.read'));
  assert.ok(!claims.permissions.includes('finance.read'));
  assert.ok(!claims.permissions.includes('refunds.execute'));
});

test('finance actor assertion rejects short secrets and identity gaps', () => {
  const actor = { id: 'staff-1', displayName: 'Иван', sessionId: 'session-1', roles: ['FINANCE'] };
  assert.throws(() => createAdminFinanceActorAssertion(actor, 'too-short'), /secret_too_short/u);
  assert.throws(() => createAdminFinanceActorAssertion({ ...actor, roles: [] }, 'a-long-enough-finance-actor-secret-for-tests'), /actor_invalid/u);
});
