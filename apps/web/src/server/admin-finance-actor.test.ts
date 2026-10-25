import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminFinanceActorAssertion, verifyAdminFinanceActorAssertion } from './admin-finance-actor.ts';

const secret = 'finance-actor-assertion-test-secret-32-bytes-minimum';
const actor = { id: 'staff-1', displayName: 'Иван Финансов', sessionId: 'session-1', roles: ['FINANCE'] };
const now = Date.parse('2026-10-25T12:00:00.000Z');

test('finance actor assertion is short-lived, audience-bound, and grants only role permissions', () => {
  const assertion = createAdminFinanceActorAssertion(actor, secret, now);
  const verified = verifyAdminFinanceActorAssertion(assertion, secret, 'refunds.execute', now);
  assert.equal(verified?.sub, 'staff-1');
  assert.equal(verified?.sid, 'session-1');
  assert.equal(verifyAdminFinanceActorAssertion(assertion, secret, 'catalog.publish', now), null);
  assert.equal(verifyAdminFinanceActorAssertion(assertion, 'different-secret-which-is-long-enough-000', undefined, now), null);
  assert.equal(verifyAdminFinanceActorAssertion(assertion, secret, undefined, now + 91_000), null);
});

test('finance actor assertion rejects tampering and invalid signing configuration', () => {
  const assertion = createAdminFinanceActorAssertion(actor, secret, now);
  const [encoded, signature] = assertion.split('.');
  assert.equal(verifyAdminFinanceActorAssertion(`${encoded}x.${signature}`, secret, undefined, now), null);
  assert.throws(() => createAdminFinanceActorAssertion(actor, 'short', now), /secret_too_short/u);
  assert.throws(() => createAdminFinanceActorAssertion({ ...actor, sessionId: '' }, secret, now), /actor_invalid/u);
});
