import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createAdminFinanceAuditRouteHandler } from './admin-finance-audit-handler.js';
import type { RouteContext } from './routing.js';

const secret = 'finance-actor-assertion-test-secret-32-bytes-minimum';

function assertion(roles: string[], permissions: string[]) {
  const iat = Math.floor(Date.now() / 1000);
  const claims = {
    v: 1, iss: 'daibilet-web-admin', aud: 'daibilet-finance-admin', sub: 'staff-1', name: 'Иван Финансов', sid: 'session-1',
    roles, permissions, iat, exp: iat + 60, jti: 'audit-test-1',
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

function context(token?: string, actor?: string, query = '') {
  const result = { status: 0, body: '' };
  const response = {
    writeHead(status: number) { result.status = status; return response; },
    end(body: string) { result.body = body; return response; },
  } as unknown as ServerResponse;
  const request = Readable.from([]) as IncomingMessage;
  request.method = 'GET';
  request.url = `/api/internal/admin/audit${query}`;
  request.headers = {
    authorization: token ? `Bearer ${token}` : undefined,
    'x-daibilet-admin-assertion': actor,
  };
  const url = new URL(request.url, 'http://localhost');
  const route: RouteContext = {
    request, response, url, pathname: url.pathname, method: 'GET', route: 'GET /api/internal/admin/audit',
    searchParams: url.searchParams,
  };
  return { route, result };
}

const token = 'read-secret';
const auditorPermissions = ['orders.read', 'finance.read', 'documents.read', 'suppliers.read', 'catalog.read', 'content.read', 'seo.read', 'integrations.read', 'audit.read'];

test('finance audit endpoint requires read token, valid actor and audit.read', async () => {
  let listed = false;
  const calls: Array<{ action: string; outcome: string }> = [];
  const handler = createAdminFinanceAuditRouteHandler({
    db: { async query(sql: string) { listed = true; return { rows: sql.includes('count(*)') ? [{ total: 0 }] : [] }; } } as never,
    internalReadToken: token,
    actorAssertionSecret: secret,
    auditActorAccess: async (entry) => { calls.push({ action: entry.action, outcome: entry.outcome }); },
  });

  const unauthenticated = context();
  assert.equal(await handler(unauthenticated.route), true);
  assert.equal(unauthenticated.result.status, 401);
  assert.equal(listed, false);

  const forbidden = context(token, assertion(['SEO'], ['catalog.read', 'content.read', 'seo.read', 'seo.edit', 'integrations.read']));
  assert.equal(await handler(forbidden.route), true);
  assert.equal(forbidden.result.status, 403);
  assert.equal(listed, false);
  assert.deepEqual(calls, [{ action: 'audit.read', outcome: 'denied' }]);

  const allowed = context(token, assertion(['AUDITOR'], auditorPermissions), '?actorId=staff-1&outcome=denied&page=2&limit=25');
  assert.equal(await handler(allowed.route), true);
  assert.equal(allowed.result.status, 200);
  assert.equal(listed, true);
  assert.deepEqual(JSON.parse(allowed.result.body), { items: [], page: 2, limit: 25, total: 0, pages: 0 });
  assert.deepEqual(calls[1], { action: 'audit.read', outcome: 'allowed' });
});

test('finance audit endpoint rejects invalid query bounds and fails closed on audit failure', async () => {
  let queryCalls = 0;
  const handler = createAdminFinanceAuditRouteHandler({
    db: { async query(sql: string) { queryCalls += 1; return { rows: sql.includes('count(*)') ? [{ total: 0 }] : [] }; } } as never,
    internalReadToken: token,
    actorAssertionSecret: secret,
    auditActorAccess: async () => {},
  });
  const invalid = context(token, assertion(['AUDITOR'], auditorPermissions), '?limit=101');
  assert.equal(await handler(invalid.route), true);
  assert.equal(invalid.result.status, 400);
  const hugePage = context(token, assertion(['AUDITOR'], auditorPermissions), '?page=100000000000000000000');
  assert.equal(await handler(hugePage.route), true);
  assert.equal(hugePage.result.status, 400);
  assert.equal(queryCalls, 0);

  const unavailable = createAdminFinanceAuditRouteHandler({
    db: { async query(sql: string) { queryCalls += 1; return { rows: sql.includes('count(*)') ? [{ total: 0 }] : [] }; } } as never,
    internalReadToken: token,
    actorAssertionSecret: secret,
    auditActorAccess: async () => { throw new Error('database unavailable'); },
  });
  const failed = context(token, assertion(['AUDITOR'], auditorPermissions));
  assert.equal(await unavailable(failed.route), true);
  assert.equal(failed.result.status, 503);
  assert.equal(queryCalls, 0);
});
