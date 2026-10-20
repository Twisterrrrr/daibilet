import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_SESSION_COOKIE,
  attachAdminActor,
  buildAdminSessionCookie,
  buildClearAdminSessionCookie,
  generateSessionToken,
  hasAnyRole,
  hashAdminPassword,
  hashSessionToken,
  issueAdminSession,
  loginAdminUser,
  readAdminActor,
  readAdminSessionToken,
  REWRITE_APPROVE_ROLES,
  REWRITE_PUBLISH_ROLES,
  resolveAdminSession,
  revokeAdminSession,
  revokeAllAdminSessions,
  SESSION_ABSOLUTE_TTL_SECONDS,
  SESSION_IDLE_TTL_SECONDS,
  statusForSessionFailure,
  verifyAdminPassword,
  verifyAdminPasswordSafe,
} from './admin-session.js';

import type { DbClient } from './types/db.js';

type SqlCall = { sql: string; params: unknown[] };

function createMockDb(handler: (sql: string, params: unknown[]) => { rows: unknown[] }): DbClient & { calls: SqlCall[] } {
  const calls: SqlCall[] = [];
  const client = {
    calls,
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });
      return handler(sql, params);
    },
    async stats() {
      return {} as Record<string, number>;
    },
    async recentEvents() {
      return [];
    },
  };
  return client as unknown as DbClient & { calls: SqlCall[] };
}

const emptyDb = () => createMockDb(() => ({ rows: [] }));

/** `db.calls[0]` is `SqlCall | undefined` under strict indexing; narrow it once. */
function firstCall(db: { calls: SqlCall[] }): SqlCall {
  const call = db.calls[0];
  assert.ok(call, 'expected at least one SQL statement');
  return call;
}

/** Offsets from now, shaped like the diagnostic SELECT's timestamps. */
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const HOUR = 60 * 60 * 1000;

test('session token is opaque, high entropy and unique', () => {
  const a = generateSessionToken();
  const b = generateSessionToken();
  assert.notEqual(a, b);
  // 32 bytes -> 43 base64url characters, with no padding to leak length.
  assert.equal(a.length, 43);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

test('only the token hash is ever stored', () => {
  const token = generateSessionToken();
  const hash = hashSessionToken(token);
  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
  assert.equal(hashSessionToken(token), hash, 'hashing must be deterministic to look a session up');
  assert.ok(!hash.includes(token));
});

test('admin password hashes round-trip and reject a wrong password', async () => {
  const stored = await hashAdminPassword('correct horse battery staple');
  assert.match(stored, /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/, 'must match the buyer-auth scrypt format');
  assert.equal(await verifyAdminPassword('correct horse battery staple', stored), true);
  assert.equal(await verifyAdminPassword('wrong', stored), false);
});

test('password verification refuses malformed and absent hashes', async () => {
  assert.equal(await verifyAdminPassword('x', null), false);
  assert.equal(await verifyAdminPassword('x', ''), false);
  assert.equal(await verifyAdminPassword('x', 'plaintext-password'), false);
  assert.equal(await verifyAdminPassword('x', 'bcrypt:aa:bb'), false, 'a foreign scheme must not verify');
});

test('a missing account still pays the scrypt cost and fails', async () => {
  assert.equal(await verifyAdminPasswordSafe('whatever', null), false);
});

test('the session cookie is HttpOnly, Lax and scoped to /admin', () => {
  const cookie = buildAdminSessionCookie('tok_123', { maxAgeSeconds: SESSION_ABSOLUTE_TTL_SECONDS, secure: true });
  assert.ok(cookie.startsWith(`${ADMIN_SESSION_COOKIE}=tok_123;`));
  assert.ok(cookie.includes('HttpOnly'), 'readable by script means an XSS can steal the staff session');
  assert.ok(cookie.includes('SameSite=Lax'));
  assert.ok(cookie.includes('Path=/admin'), 'the staff token must not ride along on public routes');
  assert.ok(cookie.includes('Secure'));
  assert.ok(cookie.includes(`Max-Age=${SESSION_ABSOLUTE_TTL_SECONDS}`));
});

test('the session cookie omits Secure off production so local http still works', () => {
  const cookie = buildAdminSessionCookie('tok', { maxAgeSeconds: 60, secure: false });
  assert.ok(!cookie.includes('Secure'));
});

test('the clear cookie expires immediately and keeps the same scope', () => {
  const cleared = buildClearAdminSessionCookie({ secure: true });
  assert.ok(cleared.includes('Max-Age=0'));
  assert.ok(cleared.includes('Path=/admin'), 'a mismatched path would leave the cookie behind');
  assert.ok(cleared.includes('HttpOnly'));
});

test('the session token is read from a mixed cookie header', () => {
  assert.equal(readAdminSessionToken(`other=1; ${ADMIN_SESSION_COOKIE}=abc; third=2`), 'abc');
  assert.equal(readAdminSessionToken(`${ADMIN_SESSION_COOKIE}=abc`), 'abc');
  assert.equal(readAdminSessionToken('other=1'), null);
  assert.equal(readAdminSessionToken(''), null);
  assert.equal(readAdminSessionToken(undefined), null);
  assert.equal(readAdminSessionToken(`${ADMIN_SESSION_COOKIE}=%zz`), null, 'a malformed value must not throw');
});

test('session failures map to 401 or 403, never 409', () => {
  // Re-authenticate: nothing valid was presented.
  assert.equal(statusForSessionFailure('missing_token'), 401);
  assert.equal(statusForSessionFailure('unknown_token'), 401);
  assert.equal(statusForSessionFailure('revoked'), 401);
  assert.equal(statusForSessionFailure('idle_expired'), 401);
  assert.equal(statusForSessionFailure('absolute_expired'), 401);
  // Authenticated, but this actor may not act.
  assert.equal(statusForSessionFailure('user_not_active'), 403);
});

test('issue stores the hash, not the token, and sets an absolute expiry', async () => {
  const db = emptyDb();
  const issued = await issueAdminSession(db, { userId: 'usr_1' });

  assert.equal(db.calls.length, 1);
  const insert = firstCall(db);
  assert.match(insert.sql, /insert into "AdminSession"/);
  assert.equal(insert.params[1], 'usr_1');
  assert.equal(insert.params[2], hashSessionToken(issued.token), 'the plaintext token must never reach the table');
  assert.notEqual(insert.params[2], issued.token);
  assert.equal(insert.params[3], SESSION_ABSOLUTE_TTL_SECONDS);
  assert.match(insert.sql, /now\(\) \+ make_interval/, 'expiry is set by the database clock, not the app clock');
});

test('resolve keeps every gate inside the SQL condition of one statement', async () => {
  const db = createMockDb((sql) => {
    if (sql.includes('update "AdminSession" as s')) {
      return {
        rows: [
          {
            id: 'asess_1',
            userId: 'usr_1',
            displayName: 'Редактор',
            email: 'editor@daibilet.ru',
            roles: ['CATALOG_EDITOR'],
            permissionEpoch: 3,
          },
        ],
      };
    }
    return { rows: [] };
  });

  const result = await resolveAdminSession(db, 'tok');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.userId, 'usr_1');
  assert.equal(result.roles[0], 'CATALOG_EDITOR');
  assert.equal(result.permissionEpoch, 3);

  // One statement: the sliding write happens only to a row that already passed.
  assert.equal(db.calls.length, 1, 'a happy resolve must not need a second round trip');
  const resolveCall = firstCall(db);
  const sql = resolveCall.sql;
  assert.match(sql, /set "lastSeenAt" = now\(\)/);
  assert.match(sql, /and s\."revokedAt" is null/, 'a revoked session must not resolve');
  assert.match(sql, /and s\."expiresAt" > now\(\)/, 'absolute expiry must be enforced in SQL');
  assert.match(sql, /coalesce\(s\."lastSeenAt", s\."createdAt"\) > now\(\) - make_interval/, 'idle expiry');
  assert.match(sql, /and u\.state = 'ACTIVE'/, 'a suspended account must not resolve');
  assert.equal(resolveCall.params[0], hashSessionToken('tok'));
  assert.equal(resolveCall.params[1], SESSION_IDLE_TTL_SECONDS);
});

test('resolve refuses without touching the database when no token was presented', async () => {
  const db = emptyDb();
  const result = await resolveAdminSession(db, null);
  assert.deepEqual(result, { ok: false, reason: 'missing_token' });
  assert.equal(db.calls.length, 0);
});

/** Build a db whose guarded UPDATE matches nothing, so the diagnostic decides. */
function failingResolveDb(diagnosticRow: Record<string, unknown> | null) {
  return createMockDb((sql) => {
    if (sql.includes('update "AdminSession" as s')) return { rows: [] };
    return { rows: diagnosticRow ? [diagnosticRow] : [] };
  });
}

const liveDiagnostic = (overrides: Record<string, unknown> = {}) => ({
  revokedAt: null,
  expiresAt: iso(24 * HOUR),
  seenAt: iso(-1),
  idleBoundary: iso(-SESSION_IDLE_TTL_SECONDS * 1000),
  dbNow: iso(0),
  state: 'ACTIVE',
  ...overrides,
});

test('resolve classifies an unknown token as 401', async () => {
  const result = await resolveAdminSession(failingResolveDb(null), 'tok');
  assert.deepEqual(result, { ok: false, reason: 'unknown_token' });
  assert.equal(statusForSessionFailure('unknown_token'), 401);
});

test('resolve classifies a revoked session as 401', async () => {
  const result = await resolveAdminSession(failingResolveDb(liveDiagnostic({ revokedAt: iso(-HOUR) })), 'tok');
  assert.deepEqual(result, { ok: false, reason: 'revoked' });
});

test('resolve classifies an absolutely expired session as 401', async () => {
  const result = await resolveAdminSession(failingResolveDb(liveDiagnostic({ expiresAt: iso(-HOUR) })), 'tok');
  assert.deepEqual(result, { ok: false, reason: 'absolute_expired' });
});

test('resolve classifies an idle-expired session as 401', async () => {
  // Seen 13 hours ago, idle limit 12: seenAt is older than the idle boundary.
  const result = await resolveAdminSession(failingResolveDb(liveDiagnostic({ seenAt: iso(-13 * HOUR) })), 'tok');
  assert.deepEqual(result, { ok: false, reason: 'idle_expired' });
});

test('resolve classifies a suspended account as 403, not 401', async () => {
  // The session itself is perfectly valid: this is an authorization answer.
  const result = await resolveAdminSession(failingResolveDb(liveDiagnostic({ state: 'SUSPENDED' })), 'tok');
  assert.deepEqual(result, { ok: false, reason: 'user_not_active' });
  assert.equal(statusForSessionFailure('user_not_active'), 403);
});

test('absolute expiry wins over idle when both have passed', async () => {
  const result = await resolveAdminSession(
    failingResolveDb(liveDiagnostic({ expiresAt: iso(-2 * HOUR), seenAt: iso(-40 * HOUR) })),
    'tok',
  );
  assert.deepEqual(result, { ok: false, reason: 'absolute_expired' });
});

test('logout revokes only this session and only while it is live', async () => {
  const db = createMockDb(() => ({ rows: [{ id: 'asess_1' }] }));
  assert.equal(await revokeAdminSession(db, 'tok'), true);
  const revokeCall = firstCall(db);
  assert.match(revokeCall.sql, /set "revokedAt" = now\(\)/);
  assert.match(revokeCall.sql, /and "revokedAt" is null/, 'revoking twice must not move the original timestamp');
  assert.equal(revokeCall.params[0], hashSessionToken('tok'));
});

test('logout with no token is a no-op that touches nothing', async () => {
  const db = emptyDb();
  assert.equal(await revokeAdminSession(db, null), false);
  assert.equal(db.calls.length, 0);
});

test('logout of an already revoked session reports nothing changed', async () => {
  const db = createMockDb(() => ({ rows: [] }));
  assert.equal(await revokeAdminSession(db, 'tok'), false);
});

test('revoking every session of a user reports how many died', async () => {
  const db = createMockDb(() => ({ rows: [{ id: 'a' }, { id: 'b' }] }));
  assert.equal(await revokeAllAdminSessions(db, 'usr_1'), 2);
  const revokeAllCall = firstCall(db);
  assert.match(revokeAllCall.sql, /where "userId" = \$1/);
  assert.match(revokeAllCall.sql, /and "revokedAt" is null/);
});

test('the middleware-attached actor is read back per request', () => {
  const request = {};
  assert.equal(readAdminActor(request), null, 'no actor attached yet');

  const actor = {
    userId: 'usr_1',
    displayName: 'Редактор',
    email: 'editor@daibilet.ru',
    roles: ['CATALOG_EDITOR'],
    permissionEpoch: 1,
    sessionId: 'asess_1',
  };
  attachAdminActor(request, actor);
  assert.deepEqual(readAdminActor(request), actor);

  // Isolated per request object: one request must never inherit another's actor.
  assert.equal(readAdminActor({}), null);
  assert.equal(readAdminActor(null), null);
});

test('the role map matches the decision recorded before the code was written', () => {
  // decision-log 2026-10-20, ADMIN.REWRITE-ROLE: no EDITOR/PUBLISHER in AdminRole.
  assert.deepEqual([...REWRITE_APPROVE_ROLES], ['CATALOG_EDITOR', 'COPYWRITER', 'SUPERADMIN']);
  assert.deepEqual([...REWRITE_PUBLISH_ROLES], ['CATALOG_EDITOR', 'SUPERADMIN']);
});

test('publish is strictly narrower than approve', () => {
  for (const role of REWRITE_PUBLISH_ROLES) {
    assert.ok(REWRITE_APPROVE_ROLES.includes(role), `${role} may publish but not approve - inconsistent map`);
  }
  assert.ok(
    REWRITE_APPROVE_ROLES.length > REWRITE_PUBLISH_ROLES.length,
    'COPYWRITER may approve but must not publish',
  );
});

test('hasAnyRole ignores case and rejects an empty role set', () => {
  assert.equal(hasAnyRole(['catalog_editor'], REWRITE_APPROVE_ROLES), true);
  assert.equal(hasAnyRole(['SUPERADMIN'], REWRITE_PUBLISH_ROLES), true);
  assert.equal(hasAnyRole(['COPYWRITER'], REWRITE_PUBLISH_ROLES), false);
  assert.equal(hasAnyRole(['SEO', 'AUDITOR'], REWRITE_APPROVE_ROLES), false);
  assert.equal(hasAnyRole([], REWRITE_APPROVE_ROLES), false, 'an account with no roles may do nothing');
});

/** A db serving one AdminUser row for the login SELECT and nothing else. */
function loginDb(userRow: Record<string, unknown> | null) {
  return createMockDb((sql) => {
    if (sql.includes('from "AdminUser"') && sql.includes('where lower(email)')) {
      return { rows: userRow ? [userRow] : [] };
    }
    return { rows: [] };
  });
}

test('login issues a session and stamps lastLoginAt', async () => {
  const password = 'correct horse battery staple';
  const db = loginDb({
    id: 'usr_1',
    email: 'editor@daibilet.ru',
    displayName: 'Редактор',
    passwordHash: await hashAdminPassword(password),
    state: 'ACTIVE',
    roles: ['CATALOG_EDITOR'],
  });

  const result = await loginAdminUser(db, '  EDITOR@daibilet.ru  ', password);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.userId, 'usr_1');
  assert.deepEqual(result.roles, ['CATALOG_EDITOR']);
  assert.equal(typeof result.token, 'string');

  const insert = db.calls.find((call) => call.sql.includes('insert into "AdminSession"'));
  assert.ok(insert, 'a successful login must create a session row');
  assert.equal(insert.params[2], hashSessionToken(result.token), 'stores the hash, never the token');

  const stamp = db.calls.find((call) => call.sql.includes('"lastLoginAt"'));
  assert.ok(stamp, 'lastLoginAt is the audit trail for the login itself');

  // Email is matched case-insensitively and trimmed.
  const select = firstCall(db);
  assert.match(select.sql, /where lower\(email\) = \$1/);
  assert.equal(select.params[0], 'editor@daibilet.ru');
});

test('login refuses a wrong password and issues no session', async () => {
  const db = loginDb({
    id: 'usr_1',
    email: 'editor@daibilet.ru',
    displayName: 'Редактор',
    passwordHash: await hashAdminPassword('right-password'),
    state: 'ACTIVE',
    roles: ['CATALOG_EDITOR'],
  });

  const result = await loginAdminUser(db, 'editor@daibilet.ru', 'wrong-password');

  assert.deepEqual(result, { ok: false, reason: 'invalid_credentials' });
  assert.ok(!db.calls.some((call) => call.sql.includes('insert into "AdminSession"')));
});

test('login refuses an unknown account with the same answer as a wrong password', async () => {
  const db = loginDb(null);
  const result = await loginAdminUser(db, 'nobody@daibilet.ru', 'whatever');
  assert.deepEqual(result, { ok: false, reason: 'invalid_credentials' }, 'must not reveal that the account is absent');
  assert.ok(!db.calls.some((call) => call.sql.includes('insert into "AdminSession"')));
});

test('login refuses a suspended account as an authorization failure', async () => {
  const password = 'correct horse battery staple';
  const db = loginDb({
    id: 'usr_1',
    email: 'editor@daibilet.ru',
    displayName: 'Редактор',
    passwordHash: await hashAdminPassword(password),
    state: 'SUSPENDED',
    roles: ['CATALOG_EDITOR'],
  });

  const result = await loginAdminUser(db, 'editor@daibilet.ru', password);

  // The password WAS right, so this is not "invalid credentials": the account is
  // known and authenticated but may not act.
  assert.deepEqual(result, { ok: false, reason: 'not_active' });
  assert.ok(!db.calls.some((call) => call.sql.includes('insert into "AdminSession"')));
});

test('login refuses an account that has no password set yet', async () => {
  const db = loginDb({
    id: 'usr_1',
    email: 'invited@daibilet.ru',
    displayName: 'Новый',
    passwordHash: null,
    state: 'INVITED',
    roles: [],
  });

  const result = await loginAdminUser(db, 'invited@daibilet.ru', 'anything');
  assert.equal(result.ok, false);
  assert.ok(!db.calls.some((call) => call.sql.includes('insert into "AdminSession"')));
});

test('login refuses empty credentials without a database round trip', async () => {
  const db = emptyDb();
  assert.deepEqual(await loginAdminUser(db, '', 'x'), { ok: false, reason: 'invalid_credentials' });
  assert.deepEqual(await loginAdminUser(db, 'a@b.c', ''), { ok: false, reason: 'invalid_credentials' });
  assert.equal(db.calls.length, 0);
});
