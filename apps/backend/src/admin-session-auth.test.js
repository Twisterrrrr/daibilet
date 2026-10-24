import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  assertAdminLoginRateLimit,
  buildAdminSessionCookie,
  buildClearAdminSessionCookie,
  hashAdminPassword,
  loginAdminUser,
  parseAdminSessionToken,
  resolveAdminSession,
  revokeAdminSession,
  verifyAdminPassword,
} from './admin-session-auth.js';

function fakeDb(user) {
  const state = { user, session: null, revokedAt: null, audit: [] };
  return {
    state,
    async query(sql, params = []) {
      if (sql.includes('from "AdminUser" where lower(email)')) {
        return { rows: state.user && state.user.email.toLowerCase() === params[0] ? [state.user] : [] };
      }
      if (sql.includes('insert into "AdminSession"')) {
        state.session = { id: params[0], userId: params[1], tokenHash: params[2], expiresAt: params[3] };
        return { rows: [] };
      }
      if (sql.includes('update "AdminUser" set "lastLoginAt"')) return { rows: [] };
      if (sql.includes('insert into "AdminAuditLog"')) {
        state.audit.push({ actorId: params[1], action: params[2], outcome: params[3] });
        return { rows: [] };
      }
      if (sql.includes('from "AdminSession" s')) {
        if (!state.session || state.session.tokenHash !== params[0] || state.revokedAt || state.session.expiresAt <= params[1] || state.user.state !== 'ACTIVE') {
          return { rows: [] };
        }
        return { rows: [{
          id: state.user.id,
          email: state.user.email,
          displayName: state.user.displayName,
          roles: state.user.roles,
          sessionId: state.session.id,
          expiresAt: state.session.expiresAt,
        }] };
      }
      if (sql.includes('update "AdminSession" set "lastSeenAt"')) return { rows: [] };
      if (sql.includes('update "AdminSession" set "revokedAt"')) {
        if (!state.session || state.session.tokenHash !== params[0] || state.revokedAt) return { rows: [] };
        state.revokedAt = new Date();
        return { rows: [{ userId: state.user.id }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

test('staff password hashes use scrypt and verify without accepting malformed values', async () => {
  const hash = await hashAdminPassword('long test password');
  assert.match(hash, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal(await verifyAdminPassword('long test password', hash), true);
  assert.equal(await verifyAdminPassword('wrong', hash), false);
  assert.equal(await verifyAdminPassword('x', 'sha256:old-format'), false);
  await assert.rejects(hashAdminPassword('short'), { statusCode: 400 });
});

test('active staff login creates an opaque hashed session and audit trail', async () => {
  const hash = await hashAdminPassword('safe password');
  const db = fakeDb({ id: 'staff-1', email: 'staff@example.com', displayName: 'Staff', passwordHash: hash, state: 'ACTIVE', roles: ['CATALOG_EDITOR'] });
  const result = await loginAdminUser(db, ' STAFF@example.com ', 'safe password', { now: new Date('2026-10-24T00:00:00Z') });
  assert.ok(result.token);
  assert.equal(result.user.id, 'staff-1');
  assert.deepEqual(result.user.roles, ['CATALOG_EDITOR']);
  assert.notEqual(db.state.session.tokenHash, result.token);
  assert.equal(db.state.session.expiresAt.toISOString(), new Date(Date.parse('2026-10-24T00:00:00Z') + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString());
  assert.deepEqual(db.state.audit.map((entry) => entry.outcome), ['success']);
});

test('bad password and non-active users receive the same denial', async () => {
  const hash = await hashAdminPassword('safe password');
  for (const state of ['ACTIVE', 'INVITED', 'SUSPENDED']) {
    const db = fakeDb({ id: `staff-${state}`, email: `${state}@example.com`, displayName: 'Staff', passwordHash: hash, state, roles: [] });
    await assert.rejects(loginAdminUser(db, `${state}@example.com`, 'wrong', { now: new Date() }), { statusCode: 401, message: 'Неверный email или пароль.' });
    assert.equal(db.state.session, null);
    assert.deepEqual(db.state.audit.map((entry) => entry.outcome), ['denied']);
  }
});

test('session resolution rejects revoked, expired, and suspended identities', async () => {
  const hash = await hashAdminPassword('safe password');
  const db = fakeDb({ id: 'staff-1', email: 'staff@example.com', displayName: 'Staff', passwordHash: hash, state: 'ACTIVE', roles: ['FINANCE'] });
  const login = await loginAdminUser(db, 'staff@example.com', 'safe password');
  assert.equal((await resolveAdminSession(db, login.token))?.id, 'staff-1');
  assert.equal(await resolveAdminSession(db, login.token, { now: new Date(login.expiresAt.getTime() + 1) }), null);
  db.state.revokedAt = new Date();
  assert.equal(await resolveAdminSession(db, login.token), null);
  db.state.revokedAt = null;
  db.state.user.state = 'SUSPENDED';
  assert.equal(await resolveAdminSession(db, login.token), null);
});

test('session cookies are HttpOnly, strict, and parse safely', () => {
  const cookie = buildAdminSessionCookie('token with space', 300, true);
  assert.match(cookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /; Secure$/);
  assert.equal(parseAdminSessionToken(`other=x; ${cookie.split(';')[0]}`), 'token with space');
  assert.equal(parseAdminSessionToken(`${ADMIN_SESSION_COOKIE}=%E0%A4%A`), null);
  assert.match(buildClearAdminSessionCookie(false), /Max-Age=0/);
});

test('logout revokes the session and can be repeated safely', async () => {
  const hash = await hashAdminPassword('safe password');
  const db = fakeDb({ id: 'staff-1', email: 'staff@example.com', displayName: 'Staff', passwordHash: hash, state: 'ACTIVE', roles: ['SUPPORT'] });
  const login = await loginAdminUser(db, 'staff@example.com', 'safe password');
  await revokeAdminSession(db, login.token);
  assert.equal(await resolveAdminSession(db, login.token), null);
  await revokeAdminSession(db, login.token);
  assert.deepEqual(db.state.audit.map((entry) => entry.action), ['admin.auth.login', 'admin.auth.logout']);
});

test('login throttling is keyed without retaining raw identifiers', () => {
  const key = `admin-login-test-${Math.random()}`;
  for (let i = 0; i < 8; i += 1) assertAdminLoginRateLimit(key, 8, 60_000, 1_000);
  assert.throws(() => assertAdminLoginRateLimit(key, 8, 60_000, 1_000), { statusCode: 429 });
});
