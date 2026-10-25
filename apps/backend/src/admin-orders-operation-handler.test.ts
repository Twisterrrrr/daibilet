import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createAdminOrdersRouteHandler } from './admin-orders-handler.js';
import type { RouteContext } from './routing.js';

const assertionSecret = 'finance-actor-assertion-test-secret-32-bytes-minimum';

function actorAssertion(roles = ['FINANCE'], permissions = ['orders.read', 'orders.pii.read', 'orders.export', 'orders.cancel', 'refunds.request', 'refunds.execute', 'finance.summary.read', 'finance.read', 'payouts.approve', 'documents.read', 'suppliers.read', 'suppliers.bank.read', 'audit.read']) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1, iss: 'daibilet-web-admin', aud: 'daibilet-finance-admin', sub: 'staff-1', name: 'Иван Финансов', sid: 'session-1', mfaVerified: true,
    roles, permissions, iat: now, exp: now + 90, jti: `test-${now}`,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${createHmac('sha256', assertionSecret).update(encoded).digest('base64url')}`;
}

function request(authorization: string | undefined, body: object, assertion?: string) {
  const result = { status: 0, body: '' };
  const response = {
    writeHead(status: number) { result.status = status; return response; },
    end(value: string) { result.body = value; return response; },
  } as unknown as ServerResponse;
  const incoming = Readable.from([JSON.stringify(body)]) as IncomingMessage;
  incoming.headers = { authorization, 'x-daibilet-admin-assertion': assertion };
  const path = '/api/internal/admin/orders/8558943/operation';
  const route: RouteContext = {
    request: incoming,
    response,
    url: new URL(`http://localhost${path}`),
    pathname: path,
    method: 'POST',
    route: `POST ${path}`,
    searchParams: new URLSearchParams(),
  };
  return { route, result };
}

test('internal refund endpoint fails closed and sends validated confirmation to operation', async () => {
  const calls: unknown[] = [];
  const audit: Array<{ actorId: string; action: string; resourceId: string | null; outcome: string }> = [];
  const handler = createAdminOrdersRouteHandler({
    db: {} as never,
    upsertAdminOrderTicket: async () => null,
    internalOperationToken: 'write-secret',
    actorAssertionSecret: assertionSecret,
    auditActorAccess: async (entry) => { audit.push(entry); },
    operateInternalOrder: async (input) => { calls.push(input); return { status: 'REFUNDED' }; },
  });
  const body = { operation: 'refund', confirmCode: '8558943', reason: 'Запрос покупателя' };
  for (const authorization of [undefined, 'Bearer wrong']) {
    const r = request(authorization, body);
    assert.equal(await handler(r.route), true);
    assert.equal(r.result.status, 401);
  }
  const missingAssertion = request('Bearer write-secret', body);
  assert.equal(await handler(missingAssertion.route), true);
  assert.equal(missingAssertion.result.status, 401);
  assert.equal(calls.length, 0);
  const valid = request('Bearer write-secret', body, actorAssertion());
  assert.equal(await handler(valid.route), true);
  assert.equal(valid.result.status, 200);
  assert.deepEqual(calls, [{ orderKey: '8558943', ...body }]);

  const denied = request('Bearer write-secret', body, actorAssertion(['SUPPORT'], ['orders.read', 'orders.pii.read', 'refunds.request', 'support.read', 'support.write', 'catalog.read']));
  assert.equal(await handler(denied.route), true);
  assert.equal(denied.result.status, 403);
  assert.equal(calls.length, 1);
  assert.deepEqual(audit.map(({ actorId, action, resourceId, outcome }) => ({ actorId, action, resourceId, outcome })), [
    { actorId: 'staff-1', action: 'refunds.execute', resourceId: '8558943', outcome: 'allowed' },
    { actorId: 'staff-1', action: 'refunds.execute', resourceId: '8558943', outcome: 'denied' },
  ]);
});
