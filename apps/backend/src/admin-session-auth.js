import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ADMIN_ROLES } from '@daibilet/contracts/admin-access/runtime';

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

async function appendAdminAudit(db, { actorId = null, action, outcome, correlationId = null, targetType = null, targetId = null }) {
  await db.query(
    `insert into "AdminAuditLog" (id, "actorId", action, outcome, "correlationId", "targetType", "targetId", "createdAt")
     values ($1, $2, $3, $4, $5, $6, $7, now())`,
    [`audit_${randomBytes(16).toString('hex')}`, actorId, action, outcome, correlationId, targetType, targetId],
  );
}

function adminAuthError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function createAdminInvitation(db, actor, input, { now = new Date(), correlationId = null } = {}) {
  if (!actor?.roles?.includes('SUPERADMIN')) throw adminAuthError('Недостаточно прав для приглашения сотрудника.', 403);
  const email = String(input?.email || '').trim().toLowerCase();
  const displayName = String(input?.displayName || '').trim();
  const roles = Array.isArray(input?.roles) ? [...new Set(input.roles)] : [];
  if (!email.includes('@') || email.length > 254) throw adminAuthError('Укажите корректный email.');
  if (!displayName || displayName.length > 120) throw adminAuthError('Укажите имя сотрудника.');
  if (!roles.length || roles.some((role) => !ADMIN_ROLES.includes(role))) throw adminAuthError('Выберите допустимые роли.');
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  try {
    const created = await db.transaction(async (tx) => {
      await tx.query('select pg_advisory_xact_lock(hashtext($1))', [`admin-invite:${email}`]);
      const existing = await tx.query('select id from "AdminUser" where lower(email) = $1 limit 1', [email]);
      if (existing.rows[0]) throw adminAuthError('Сотрудник с таким email уже существует.', 409);
      const userId = `adm_usr_${randomBytes(16).toString('hex')}`;
      await tx.query(
        `insert into "AdminUser" (id, email, "displayName", state, roles, "createdAt", "updatedAt")
         values ($1, $2, $3, 'INVITED', $4::"AdminRole"[], $5, $5)`,
        [userId, email, displayName, roles, now],
      );
      const invitationId = `adm_inv_${randomBytes(16).toString('hex')}`;
      await tx.query(
        `insert into "AdminInvitation" (id, "userId", "invitedById", "tokenHash", "expiresAt", "createdAt")
         values ($1, $2, $3, $4, $5, $6)`,
        [invitationId, userId, actor.id, hashAdminSessionToken(token), expiresAt, now],
      );
      await appendAdminAudit(tx, { actorId: actor.id, action: 'admin.staff.invite', outcome: 'success', correlationId, targetType: 'AdminUser', targetId: userId });
      return { userId, invitationId };
    });
    return { ...created, token, expiresAt, email, displayName, roles };
  } catch (error) {
    if (error?.code === '23505') throw adminAuthError('Сотрудник с таким email уже существует.', 409);
    throw error;
  }
}

export async function acceptAdminInvitation(db, tokenInput, passwordInput, { now = new Date() } = {}) {
  const token = String(tokenInput || '').trim();
  if (token.length < 32 || token.length > 200) throw adminAuthError('Приглашение недействительно или истекло.');
  const passwordHash = await hashAdminPassword(passwordInput);
  const sessionToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_SECONDS * 1000);

  const accepted = await db.transaction(async (tx) => {
    const invitation = await tx.query(
      `select i.id as "invitationId", i."userId", u.email
         from "AdminInvitation" i join "AdminUser" u on u.id = i."userId"
        where i."tokenHash" = $1 and i."acceptedAt" is null and i."revokedAt" is null
          and i."expiresAt" > $2 and u.state = 'INVITED'
        for update of i, u`,
      [hashAdminSessionToken(token), now],
    );
    const pending = invitation.rows[0];
    if (!pending) throw adminAuthError('Приглашение недействительно или истекло.');
    const userResult = await tx.query(
      `update "AdminUser" set "passwordHash" = $2, state = 'ACTIVE', "emailVerifiedAt" = $3, "updatedAt" = $3
        where id = $1 and state = 'INVITED'
        returning id, email, "displayName", roles`,
      [pending.userId, passwordHash, now],
    );
    const user = userResult.rows[0];
    if (!user) throw adminAuthError('Приглашение недействительно или истекло.');
    await tx.query('update "AdminInvitation" set "acceptedAt" = $2 where id = $1', [pending.invitationId, now]);
    await tx.query(
      `insert into "AdminSession" (id, "userId", "tokenHash", "expiresAt", "createdAt") values ($1, $2, $3, $4, $5)`,
      [`adm_sess_${randomBytes(16).toString('hex')}`, user.id, hashAdminSessionToken(sessionToken), expiresAt, now],
    );
    await appendAdminAudit(tx, { actorId: user.id, action: 'admin.staff.invitation.accept', outcome: 'success', targetType: 'AdminUser', targetId: user.id });
    return user;
  });

  return { token: sessionToken, expiresAt, user: { ...accepted, roles: accepted.roles || [] } };
}

export async function loginAdminUser(db, emailInput, passwordInput, { now = new Date(), correlationId = null } = {}) {
  const email = String(emailInput || '').trim().toLowerCase();
  const password = String(passwordInput || '');
  const result = await db.query(
    `select id, email, "displayName", "passwordHash", state, roles, "mfaEnabledAt"
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
    user: { id: user.id, email: user.email, displayName: user.displayName, roles: user.roles || [], mfaEnabled: Boolean(user.mfaEnabledAt) },
  };
}

export async function resolveAdminSession(db, token, { now = new Date() } = {}) {
  if (!token) return null;
  const result = await db.query(
    `select u.id, u.email, u."displayName", u.roles, u.state, u."mfaEnabledAt", s."mfaVerifiedAt", s.id as "sessionId", s."expiresAt"
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
  return {
    id: row.id, email: row.email, displayName: row.displayName, roles: row.roles || [], sessionId: row.sessionId,
    mfaVerified: Boolean(row.mfaEnabledAt && row.mfaVerifiedAt),
    mfaEnabled: Boolean(row.mfaEnabledAt),
  };
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
