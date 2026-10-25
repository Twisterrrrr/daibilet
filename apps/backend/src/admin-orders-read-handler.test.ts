import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import test from 'node:test';
import { createAdminOrdersReadRouteHandler } from './admin-orders-read-handler.js';
import type { RouteContext } from './routing.js';

const assertionSecret = 'finance-actor-assertion-test-secret-32-bytes-minimum';

function actorAssertion(permissions = ['orders.read', 'orders.pii.read', 'orders.export', 'orders.cancel', 'refunds.request', 'refunds.execute', 'finance.summary.read', 'finance.read', 'payouts.approve', 'documents.read', 'suppliers.read', 'suppliers.bank.read', 'audit.read'], roles = ['FINANCE']) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1, iss: 'daibilet-web-admin', aud: 'daibilet-finance-admin', sub: 'staff-1', name: 'Иван Финансов', sid: 'session-1',
    roles, permissions, iat: now, exp: now + 90, jti: `test-${now}`,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${createHmac('sha256', assertionSecret).update(encoded).digest('base64url')}`;
}

function context(authorization?: string, assertion?: string): { route: RouteContext; result: { status: number; body: string } } {
  const result = { status: 0, body: '' };
  const response = {
    writeHead(status: number) { result.status = status; return response; },
    end(body: string) { result.body = body; return response; },
  } as unknown as ServerResponse;
  return {
    route: {
      request: { headers: { authorization, 'x-daibilet-admin-assertion': assertion } } as unknown as IncomingMessage,
      response,
      url: new URL('http://localhost/api/internal/admin/orders?provider=MANUAL'),
      pathname: '/api/internal/admin/orders',
      method: 'GET',
      route: 'GET /api/internal/admin/orders',
      searchParams: new URLSearchParams('provider=MANUAL'),
    },
    result,
  };
}

test('internal admin order feed fails closed and accepts only its read token', async () => {
  let calls = 0;
  const audit: Array<{ actorId: string; action: string; outcome: string }> = [];
  const handler = createAdminOrdersReadRouteHandler({
    enabled: true,
    internalReadToken: 'read-secret',
    actorAssertionSecret: assertionSecret,
    auditActorAccess: async (entry) => { audit.push(entry); },
    buildOrdersList: async () => { calls += 1; return { rows: [{ publicCode: '8558943' }] }; },
    buildOrderDetail: async () => null,
  });
  for (const authorization of [undefined, 'Bearer wrong']) {
    const request = context(authorization);
    assert.equal(await handler(request.route), true);
    assert.equal(request.result.status, 401);
  }
  const missingAssertion = context('Bearer read-secret');
  assert.equal(await handler(missingAssertion.route), true);
  assert.equal(missingAssertion.result.status, 401);
  const noReadPermission = context('Bearer read-secret', actorAssertion(['catalog.read', 'content.read', 'seo.read', 'seo.edit', 'integrations.read'], ['SEO']));
  assert.equal(await handler(noReadPermission.route), true);
  assert.equal(noReadPermission.result.status, 403);
  assert.equal(calls, 0);
  const request = context('Bearer read-secret', actorAssertion());
  assert.equal(await handler(request.route), true);
  assert.equal(request.result.status, 200);
  assert.equal(JSON.parse(request.result.body).rows[0].publicCode, '8558943');
  assert.equal(calls, 1);
  assert.deepEqual(audit.map(({ actorId, action, outcome }) => ({ actorId, action, outcome })), [
    { actorId: 'staff-1', action: 'orders.read', outcome: 'denied' },
    { actorId: 'staff-1', action: 'orders.read', outcome: 'allowed' },
    { actorId: 'staff-1', action: 'orders.pii.read', outcome: 'allowed' },
  ]);
});

test('internal admin detail requires the same read token', async () => {
  const handler = createAdminOrdersReadRouteHandler({
    enabled: true,
    internalReadToken: 'read-secret',
    actorAssertionSecret: assertionSecret,
    auditActorAccess: async () => {},
    buildOrdersList: async () => ({}),
    buildOrderDetail: async (key) => ({ sourceKind: 'internal', publicCode: key }),
  });
  const denied = context();
  denied.route.pathname = '/api/internal/admin/orders/8558943';
  assert.equal(await handler(denied.route), true);
  assert.equal(denied.result.status, 401);
  const allowed = context('Bearer read-secret', actorAssertion());
  allowed.route.pathname = '/api/internal/admin/orders/8558943';
  assert.equal(await handler(allowed.route), true);
  assert.equal(allowed.result.status, 200);
  assert.equal(JSON.parse(allowed.result.body).publicCode, '8558943');
});

test('internal order contact search requires the PII permission', async () => {
  let calls = 0;
  const handler = createAdminOrdersReadRouteHandler({
    enabled: true,
    internalReadToken: 'read-secret',
    actorAssertionSecret: assertionSecret,
    auditActorAccess: async () => {},
    buildOrdersList: async () => { calls += 1; return { rows: [] }; },
    buildOrderDetail: async () => null,
  });
  const request = context('Bearer read-secret', actorAssertion(['orders.read', 'finance.read', 'documents.read', 'suppliers.read', 'catalog.read', 'content.read', 'seo.read', 'integrations.read', 'audit.read'], ['AUDITOR']));
  request.route.searchParams = new URLSearchParams('q=anna@example.com');
  assert.equal(await handler(request.route), true);
  assert.equal(request.result.status, 403);
  assert.equal(calls, 0);
});

test('internal finance reads fail closed when the audit store is unavailable', async () => {
  const handler = createAdminOrdersReadRouteHandler({
    enabled: true,
    internalReadToken: 'read-secret',
    actorAssertionSecret: assertionSecret,
    buildOrdersList: async () => { throw new Error('must not read without audit'); },
    buildOrderDetail: async () => null,
  });
  const request = context('Bearer read-secret', actorAssertion());
  assert.equal(await handler(request.route), true);
  assert.equal(request.result.status, 503);
  assert.equal(JSON.parse(request.result.body).error, 'admin_audit_unavailable');
});

test('external admin order API masks PII and excludes contact fields from search for roles without PII permission', async () => {
  let includePiiSearch: boolean | undefined;
  const handler = createAdminOrdersReadRouteHandler({
    enabled: true,
    buildOrdersList: async (_params, options) => {
      includePiiSearch = options?.includePiiSearch;
      return { rows: [{ buyer: { name: 'Анна Константинова', email: 'anna@example.com', phone: '+79991234567', notes: 'call me' }, buyerSnapshot: { email: 'anna@example.com' } }] };
    },
    buildOrderDetail: async () => null,
  });
  const fixture = context();
  const request = fixture.route;
  request.pathname = '/api/admin/orders';
  request.route = 'GET /api/admin/orders';
  request.url = new URL('http://localhost/api/admin/orders');
  request.searchParams = new URLSearchParams();
  Object.assign(request.request, { adminSessionUser: { roles: ['AUDITOR'] } });

  assert.equal(await handler(request), true);
  const body = JSON.parse(fixture.result.body);
  assert.equal(includePiiSearch, false);
  assert.equal(body.rows[0].buyer.name, 'А. К.');
  assert.equal(body.rows[0].buyerSnapshot, null);
  assert.equal(JSON.stringify(body).includes('anna@example.com'), false);
});
