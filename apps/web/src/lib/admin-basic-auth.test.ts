import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAdminAuthConfigured,
  isAuthorizedAdminBasicAuth,
  readAdminBasicAuthConfig,
} from './admin-basic-auth.ts';

function authHeader(email: string, password: string): string {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

test('requireAuth defaults to true regardless of NODE_ENV', () => {
  // Regression guard. requireAuth used to be derived from NODE_ENV, so any restart
  // with NODE_ENV=development silently exposed /admin - orders and buyer data -
  // to the internet with no password. Now only an explicit '0' turns it off.
  assert.equal(readAdminBasicAuthConfig({ NODE_ENV: 'development' }).requireAuth, true);
  assert.equal(readAdminBasicAuthConfig({ NODE_ENV: 'test' }).requireAuth, true);
  assert.equal(readAdminBasicAuthConfig({ NODE_ENV: 'production' }).requireAuth, true);
  assert.equal(readAdminBasicAuthConfig({}).requireAuth, true);
  assert.equal(readAdminBasicAuthConfig({ DAIBILET_REQUIRE_ADMIN_AUTH: '1' }).requireAuth, true);
  assert.equal(readAdminBasicAuthConfig({ DAIBILET_REQUIRE_ADMIN_AUTH: '0' }).requireAuth, false);
});

test('credentials are read from the documented env keys', () => {
  const byEmail = readAdminBasicAuthConfig({ ADMIN_EMAIL: 'admin@daibilet.ru', ADMIN_PASSWORD: 'secret' });
  assert.equal(byEmail.email, 'admin@daibilet.ru');
  assert.equal(byEmail.password, 'secret');
  assert.equal(isAdminAuthConfigured(byEmail), true);

  // Production keeps only a SHA-256 hash; ADMIN_PASSWORD is empty there.
  const byHash = readAdminBasicAuthConfig({
    ADMIN_EMAIL: 'admin@daibilet.ru',
    ADMIN_PASSWORD_HASH: 'a'.repeat(64),
  });
  assert.equal(byHash.password, '');
  assert.equal(isAdminAuthConfigured(byHash), true);

  const byUser = readAdminBasicAuthConfig({ ADMIN_USER: 'admin', ADMIN_PASSWORD: 'secret' });
  assert.equal(byUser.email, 'admin');
});

test('missing credentials fail closed unless auth is explicitly disabled', async () => {
  const withoutCreds = readAdminBasicAuthConfig({ NODE_ENV: 'production' });
  assert.equal(isAdminAuthConfigured(withoutCreds), false);
  assert.equal(await isAuthorizedAdminBasicAuth(null, withoutCreds), false);
  assert.equal(await isAuthorizedAdminBasicAuth(authHeader('admin@daibilet.ru', 'x'), withoutCreds), false);

  const open = readAdminBasicAuthConfig({ DAIBILET_REQUIRE_ADMIN_AUTH: '0' });
  assert.equal(isAdminAuthConfigured(open), false);
  assert.equal(open.requireAuth, false);
  assert.equal(await isAuthorizedAdminBasicAuth(null, open), true);
});

test('password hash auth accepts the matching secret only', async () => {
  const { createHash } = await import('node:crypto');
  const secret = 'correct-horse';
  const hash = createHash('sha256').update(secret).digest('hex');

  const config = readAdminBasicAuthConfig({
    ADMIN_EMAIL: 'admin@daibilet.ru',
    ADMIN_PASSWORD_HASH: hash,
  });

  assert.equal(await isAuthorizedAdminBasicAuth(authHeader('admin@daibilet.ru', secret), config), true);
  assert.equal(await isAuthorizedAdminBasicAuth(authHeader('admin@daibilet.ru', 'wrong'), config), false);
  assert.equal(await isAuthorizedAdminBasicAuth(authHeader('other@daibilet.ru', secret), config), false);
  assert.equal(await isAuthorizedAdminBasicAuth('Bearer token', config), false);
  assert.equal(await isAuthorizedAdminBasicAuth('Basic not-base64', config), false);
  assert.equal(await isAuthorizedAdminBasicAuth(undefined, config), false);
});