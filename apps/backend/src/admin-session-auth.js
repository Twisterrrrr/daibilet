import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
export const ADMIN_SESSION_COOKIE = 'daibilet_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;
const DUMMY_PASSWORD_HASH = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;

const loginBuckets = new Map();

export function hashAdminSessionToken(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

export function parseAdminSessionToken(cookieHeader = '') {
  for (const part of String(cookieHeader).split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName !== ADMIN_SESSION_COOKIE) continue;
    const value = rawValue.join('=');
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function buildAdminSessionCookie(token, maxAgeSeconds, secure = process.env.NODE_ENV === 'production') {
  const securePart = secure ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}; SameSite=Strict${securePart}`;
}

export function buildClearAdminSessionCookie(secure = process.env.NODE_ENV === 'production') {
  return buildAdminSessionCookie('', 0, secure);
}

export async function hashAdminPassword(password) {
  if (String(password || '').length < 12) {
    const error = new Error('Пароль должен содержать не менее 12 символов.');
    error.statusCode = 400;
    throw error;
  }
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyAdminPassword(password, storedHash) {
  const [algorithm, salt, expectedHex] = String(storedHash || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/i.test(expectedHex || '')) return false;
  const actual = await scryptAsync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function assertAdminLoginRateLimit(key, limit = 8, windowMs = 60_000, now = Date.now()) {
  const bucketKey = createHash('sha256').update(String(key || 'unknown')).digest('hex');
  const current = loginBuckets.get(bucketKey);
  const bucket = !current || now >= current.resetAt ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  loginBuckets.set(bucketKey, bucket);
  if (loginBuckets.size > 10_000) {
    for (const [candidate, value] of loginBuckets) {
      if (now >= value.resetAt) loginBuckets.delete(candidate);
    }
  }
  if (bucket.count > limit) {
    const error = new Error('Слишком много попыток входа. Попробуйте позже.');
    error.statusCode = 429;
    throw error;
  }
}

async function appendAdminAudit(db, { actorId = null, action, outcome, correlationId = null }) {
  await db.query(
    `insert into "AdminAuditLog" (id, "actorId", action, outcome, "correlationId", "createdAt")
     values ($1, $2, $3, $4, $5, now())`,
    [`audit_${randomBytes(16).toString('hex')}`, actorId, action, outcome, correlationId],
  );
}

export async function loginAdminUser(db, emailInput, passwordInput, { now = new Date(), correlationId = null } = {}) {
  const email = String(emailInput || '').trim().toLowerCase();
  const password = String(passwordInput || '');
  const result = await db.query(
    `select id, email, "displayName", "passwordHash", state, roles
       from "AdminUser" where lower(email) = $1 order by "createdAt" asc limit 2`,
    [email],
  );
  const user = result.rows.length === 1 ? result.rows[0] : null;
  const passwordMatches = await verifyAdminPassword(password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  const passwordValid = user?.state === 'ACTIVE' && passwordMatches;
  if (!passwordValid) {
    await appendAdminAudit(db, { actorId: user?.id || null, action: 'admin.auth.login', outcome: 'denied', correlationId });
    const error = new Error('Неверный email или пароль.');
    error.statusCode = 401;
    throw error;
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_SECONDS * 1000);
  await db.query(
    `insert into "AdminSession" (id, "userId", "tokenHash", "expiresAt", "createdAt")
     values ($1, $2, $3, $4, now())`,
    [`adm_sess_${randomBytes(16).toString('hex')}`, user.id, hashAdminSessionToken(token), expiresAt],
  );
  await db.query('update "AdminUser" set "lastLoginAt" = now(), "updatedAt" = now() where id = $1', [user.id]);
  await appendAdminAudit(db, { actorId: user.id, action: 'admin.auth.login', outcome: 'success', correlationId });
  return {
    token,
    expiresAt,
    user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles || [] },
  };
}

export async function resolveAdminSession(db, token, { now = new Date() } = {}) {
  if (!token) return null;
  const result = await db.query(
    `select u.id, u.email, u."displayName", u.roles, u.state, s.id as "sessionId", s."expiresAt"
       from "AdminSession" s
       join "AdminUser" u on u.id = s."userId"
      where s."tokenHash" = $1 and s."revokedAt" is null and s."expiresAt" > $2
        and u.state = 'ACTIVE'
      limit 1`,
    [hashAdminSessionToken(token), now],
  );
  const row = result.rows[0];
  if (!row) return null;
  await db.query('update "AdminSession" set "lastSeenAt" = $2 where id = $1', [row.sessionId, now]);
  return { id: row.id, email: row.email, displayName: row.displayName, roles: row.roles || [], sessionId: row.sessionId };
}

export async function revokeAdminSession(db, token, { correlationId = null } = {}) {
  if (!token) return;
  const result = await db.query(
    `update "AdminSession" set "revokedAt" = now()
      where "tokenHash" = $1 and "revokedAt" is null
      returning "userId"`,
    [hashAdminSessionToken(token)],
  );
  const actorId = result.rows[0]?.userId || null;
  if (actorId) await appendAdminAudit(db, { actorId, action: 'admin.auth.logout', outcome: 'success', correlationId });
}
