import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  financeAdminActorHasPermission,
  projectInternalAdminOrderDetail,
  projectInternalAdminOrdersList,
  verifyFinanceAdminActorAssertion,
} from './admin-finance-actor.js';
import { resolveAdminSessionPermissions } from '@daibilet/contracts/admin-access/runtime';

const secret = 'finance-actor-assertion-test-secret-32-bytes-minimum';
const now = Date.parse('2026-10-25T12:00:00.000Z');

function sign(overrides: Record<string, unknown> = {}, key = secret) {
  const claims = {
    v: 1,
    iss: 'daibilet-web-admin',
    aud: 'daibilet-finance-admin',
    sub: 'staff-1',
    name: 'Иван Финансов',
    sid: 'session-1',
    roles: ['FINANCE'],
    mfaVerified: true,
    permissions: ['orders.read', 'orders.pii.read', 'orders.export', 'orders.cancel', 'refunds.request', 'refunds.execute', 'finance.summary.read', 'finance.read', 'payouts.approve', 'documents.read', 'suppliers.read', 'suppliers.bank.read', 'audit.read'],
    iat: Math.floor(now / 1000),
    exp: Math.floor(now / 1000) + 90,
    jti: 'assertion-1',
    ...overrides,
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', key).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

test('finance service verifies short-lived actor assertions and permission claims', () => {
  const actor = verifyFinanceAdminActorAssertion(sign(), secret, now);
  assert.equal(actor?.id, 'staff-1');
  assert.equal(actor?.displayName, 'Иван Финансов');
  assert.equal(actor?.sessionId, 'session-1');
  assert.equal(actor ? financeAdminActorHasPermission(actor, 'refunds.execute') : false, true);
  assert.equal(actor ? financeAdminActorHasPermission(actor, 'finance.read') : false, true);
});

test('finance service rejects unsigned, expired, overlong, wrong-audience, and unknown-right assertions', () => {
  assert.equal(verifyFinanceAdminActorAssertion(sign(), undefined, now), null);
  assert.equal(verifyFinanceAdminActorAssertion(sign(), 'wrong-secret-that-is-long-enough-to-test-000', now), null);
  assert.equal(verifyFinanceAdminActorAssertion(sign({ exp: Math.floor(now / 1000) }), secret, now), null);
  assert.equal(verifyFinanceAdminActorAssertion(sign({ exp: Math.floor(now / 1000) + 91 }), secret, now), null);
  assert.equal(verifyFinanceAdminActorAssertion(sign({ aud: 'other-service' }), secret, now), null);
  assert.equal(verifyFinanceAdminActorAssertion(sign({ permissions: ['orders.read', 'root.access'] }), secret, now), null);
  assert.equal(verifyFinanceAdminActorAssertion(sign(), secret, now + 91_000), null);
});

test('actor without MFA can read orders but cannot assert finance, bank, cancellation or payout permissions', () => {
  const roles = ['FINANCE'];
  const permissions = [...resolveAdminSessionPermissions(roles, false)];
  const actor = verifyFinanceAdminActorAssertion(sign({ roles, permissions, mfaVerified: false }), secret, now);
  assert.ok(actor);
  assert.equal(financeAdminActorHasPermission(actor, 'orders.read'), true);
  assert.equal(financeAdminActorHasPermission(actor, 'finance.read'), false);
  assert.equal(financeAdminActorHasPermission(actor, 'refunds.execute'), false);
  assert.equal(financeAdminActorHasPermission(actor, 'payouts.approve'), false);
  assert.equal(verifyFinanceAdminActorAssertion(sign({ roles, mfaVerified: false }), secret, now), null);
});

test('internal order projections independently mask buyer details and omit finance blocks', () => {
  const piiLimited = verifyFinanceAdminActorAssertion(sign({ roles: ['AUDITOR'], permissions: ['orders.read', 'finance.read', 'documents.read', 'suppliers.read', 'catalog.read', 'content.read', 'seo.read', 'integrations.read', 'audit.read'] }), secret, now)!;
  const financeLimited = verifyFinanceAdminActorAssertion(sign({ roles: ['SUPPORT'], permissions: ['orders.read', 'orders.pii.read', 'refunds.request', 'support.read', 'support.write', 'catalog.read'] }), secret, now)!;
  const detail = {
    publicCode: '1234567',
    buyer: { name: 'Анна Константинова', email: 'anna@example.com', phone: '+7 999 123-45-67', notes: 'private' },
    buyerSnapshot: { email: 'anna@example.com', phone: '+7 999 123-45-67' },
    amountRub: 350,
    finance: { payments: [{ status: 'SUCCEEDED' }], ledger: [{ amountKopecks: 1 }] },
    unexpectedSensitiveField: 'should never cross this boundary',
  };

  const maskedWithFinance = projectInternalAdminOrderDetail(detail, piiLimited) as typeof detail;
  assert.deepEqual(maskedWithFinance.buyer, { name: 'А. К.', email: 'an**@example.com', phone: '+7 ****** 4567', notes: null });
  assert.deepEqual(maskedWithFinance.finance, detail.finance);
  assert.equal('buyerSnapshot' in maskedWithFinance, false);
  assert.equal('unexpectedSensitiveField' in maskedWithFinance, false);
  assert.equal(maskedWithFinance.amountRub, 350);

  const fullPiiWithoutFinance = projectInternalAdminOrderDetail(detail, financeLimited) as typeof detail;
  assert.deepEqual(fullPiiWithoutFinance.buyer, detail.buyer);
  assert.equal('buyerSnapshot' in fullPiiWithoutFinance, false);
  assert.equal(fullPiiWithoutFinance.amountRub, null);
  assert.equal(fullPiiWithoutFinance.finance, null);

  const list = projectInternalAdminOrdersList({ rows: [detail] }, piiLimited) as { rows: Array<typeof detail> };
  assert.equal(list.rows[0]?.buyer.email, 'an**@example.com');
});
