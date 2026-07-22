import assert from 'node:assert/strict';
import test from 'node:test';
import type { IncomingMessage } from 'node:http';

import {
  isAdminAuthConfigured,
  isAuthorizedAdminRequest,
  isProtectedPath,
  type AdminAuthConfig,
} from './auth.js';

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
  assert.equal(isProtectedPath('/api/supplier/dashboard'), true);
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
