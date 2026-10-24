import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeAdminSessionRequest } from './admin-rbac-guard.js';
import { buildAdminSessionCookie } from './admin-session-auth.js';

function request(url, method = 'GET', token = 'test-session') {
  return {
    url,
    method,
    headers: { cookie: buildAdminSessionCookie(token, 60, false) },
  };
}

test('session guard rejects missing and invalid identities', async () => {
  const db = { query: async () => ({ rows: [] }) };
  assert.deepEqual(await authorizeAdminSessionRequest(request('/api/admin/events', 'GET', ''), db), {
    authorized: false,
    statusCode: 401,
    error: 'admin_session_required',
  });
});

test('session guard allows a mapped route for an authorized role', async () => {
  const db = { query: async (sql) => sql.includes('from "AdminSession" s')
    ? { rows: [{ id: 'staff-1', email: 'editor@example.com', displayName: 'Editor', roles: ['CATALOG_EDITOR'], sessionId: 'sess-1' }] }
    : { rows: [] } };
  const result = await authorizeAdminSessionRequest(request('/api/admin/events', 'GET'), db);
  assert.equal(result.authorized, true);
  assert.equal(result.actor.id, 'staff-1');
});

test('session guard rejects role violations and unknown routes even for SUPERADMIN', async () => {
  const db = { query: async () => ({ rows: [{ id: 'staff-1', email: 'owner@example.com', displayName: 'Owner', roles: ['SUPERADMIN'], sessionId: 'sess-1' }] }) };
  assert.equal((await authorizeAdminSessionRequest(request('/api/admin/events/ev-1/moderation'), db)).statusCode, 403);
  assert.equal((await authorizeAdminSessionRequest(request('/api/admin/unmapped'), db)).statusCode, 403);
});

test('auditor can read server-masked orders without PII permission', async () => {
  const db = { query: async () => ({ rows: [{ id: 'staff-1', email: 'auditor@example.com', displayName: 'Auditor', roles: ['AUDITOR'], sessionId: 'sess-1' }] }) };
  assert.equal((await authorizeAdminSessionRequest(request('/api/admin/orders'), db)).authorized, true);
  assert.equal((await authorizeAdminSessionRequest(request('/api/admin/orders/order-1'), db)).authorized, true);
});
