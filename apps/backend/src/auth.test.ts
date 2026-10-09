import assert from 'node:assert/strict';
import test from 'node:test';
import type { IncomingMessage } from 'node:http';

import {
  createAdminAuthConfig,
  isAdminAuthConfigured,
  isAuthorizedAdminRequest,
  isProtectedPath,
  type AdminAuthConfig,
} from './auth';

function mockRequest(authorization?: string): IncomingMessage {
  return { headers: authorization ? { authorization } : {} } as IncomingMessage;
}

function basicAuth(email: string, password: string) {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

test('admin paths are protected', () => {
  assert.equal(isProtectedPath('/api/admin/events'), true);
  assert.equal(isProtectedPath('/api/admin/articles/x'), true);
  assert.equal(isProtectedPath('/api/db/stats'), true);
  assert.equal(isProtectedPath('/api/v1/tc/sync'), true);
  assert.equal(isProtectedPath('/api/public/events'), false);
  assert.equal(isProtectedPath('/api/health'), false);
});

test('production without credentials fails closed', () => {
  const config: AdminAuthConfig = {
    email: '',
    password: '',
    passwordHash: '',
    realm: 'test',
    requireAuth: true,
  };
  assert.equal(isAdminAuthConfigured(config), false);
  assert.equal(isAuthorizedAdminRequest(mockRequest(), config), false);
});

test('createAdminAuthConfig defaults requireAuth to true regardless of NODE_ENV', () => {
  // Regression guard. The API derived requireAuth from NODE_ENV just like the web
  // middleware did, so a restart with NODE_ENV=development opened /api/admin.
  const base = { ADMIN_AUTH_REALM: 'test' };
  assert.equal(createAdminAuthConfig({ ...base, NODE_ENV: 'development' }).requireAuth, true);
  assert.equal(createAdminAuthConfig({ ...base, NODE_ENV: 'production' }).requireAuth, true);
  assert.equal(createAdminAuthConfig(base).requireAuth, true);
  assert.equal(createAdminAuthConfig({ ...base, DAIBILET_REQUIRE_ADMIN_AUTH: '1' }).requireAuth, true);
  // The only supported way to run without auth: explicit opt-out.
  assert.equal(createAdminAuthConfig({ ...base, DAIBILET_REQUIRE_ADMIN_AUTH: '0' }).requireAuth, false);
});

test('missing credentials fail closed unless auth is explicitly disabled', () => {
  const withoutCreds = createAdminAuthConfig({ ADMIN_AUTH_REALM: 'test', NODE_ENV: 'production' });
  assert.equal(isAdminAuthConfigured(withoutCreds), false);
  assert.equal(isAuthorizedAdminRequest(mockRequest(), withoutCreds), false);
  assert.equal(
    isAuthorizedAdminRequest(mockRequest(basicAuth('admin@daibilet.ru', 'x')), withoutCreds),
    false,
  );

  const open = createAdminAuthConfig({ ADMIN_AUTH_REALM: 'test', DAIBILET_REQUIRE_ADMIN_AUTH: '0' });
  assert.equal(open.requireAuth, false);
  assert.equal(isAuthorizedAdminRequest(mockRequest(), open), true);
});

test('valid basic auth passes', () => {
  const config: AdminAuthConfig = {
    email: 'admin@daibilet.ru',
    password: 'secret',
    passwordHash: '',
    realm: 'test',
    requireAuth: true,
  };
  assert.equal(isAuthorizedAdminRequest(mockRequest(basicAuth('admin@daibilet.ru', 'secret')), config), true);
  assert.equal(isAuthorizedAdminRequest(mockRequest(basicAuth('admin@daibilet.ru', 'wrong')), config), false);
  assert.equal(isAuthorizedAdminRequest(mockRequest(), config), false);
});

test('dev without credentials can allow open admin when auth not required', () => {
  const config: AdminAuthConfig = {
    email: '',
    password: '',
    passwordHash: '',
    realm: 'test',
    requireAuth: false,
  };
  assert.equal(isAuthorizedAdminRequest(mockRequest(), config), true);
});
