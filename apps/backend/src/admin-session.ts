import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import type { DbClient } from './types/db.js';

const scryptAsync = promisify(scrypt);

/**
 * Staff sessions (Option B from docs/staff-session-plan-2026-10-20.md).
 *
 * The schema was already designed for this shape, so no migration is needed:
 * `AdminSession.tokenHash` is unique and stores a HASH of an opaque token, never
 * the token itself, and `(userId, revokedAt)` / `(expiresAt)` are indexed.
 *
 * Two independent expiry clocks, both enforced inside the SQL condition so there
 * is no window between checking and writing:
 *   - absolute: `expiresAt`, 30 days from issue, never extended;
 *   - idle: `lastSeenAt`, 12 hours, slid forward on every successful resolve.
 */

export const ADMIN_SESSION_COOKIE = 'daibilet_admin_session';

/** Absolute lifetime. Deliberately NOT extended by activity. */
export const SESSION_ABSOLUTE_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Idle lifetime, measured from `lastSeenAt` (or `createdAt` when never seen). */
export const SESSION_IDLE_TTL_SECONDS = 12 * 60 * 60;

/** 32 random bytes, base64url: opaque, high entropy, no structure to forge. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Only this digest is stored. A database dump must not yield usable sessions,
 * which is the whole reason `tokenHash` exists instead of a session id column.
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function generateSessionId(): string {
  return `asess_${randomBytes(12).toString('hex')}`;
}

/**
 * Same format as the buyer auth in `user-auth.js` (`scrypt:<salt>:<hex>`), so the
 * codebase keeps ONE password encoding instead of two competing schemes.
 */
export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(String(password), salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyAdminPassword(password: string, storedHash: string | null): Promise<boolean> {
  const [algo, salt, hash] = String(storedHash || '').split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const derived = (await scryptAsync(String(password), salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

/**
 * A constant-cost stand-in used when the account does not exist, so a missing
 * user does not answer faster than a wrong password (enumeration by timing).
 */
const DUMMY_PASSWORD_HASH = 'scrypt:00000000000000000000000000000000:' + '00'.repeat(64);

export async function verifyAdminPasswordSafe(password: string, storedHash: string | null): Promise<boolean> {
  return verifyAdminPassword(password, storedHash || DUMMY_PASSWORD_HASH);
}

export interface SessionCookieOptions {
  /** Absolute seconds the browser may keep the cookie. 0 clears it. */
  maxAgeSeconds: number;
  /** Production adds `Secure`; local http must not, or the cookie is dropped. */
  secure: boolean;
  /**
   * Scoped to /admin so the staff token is never sent to public catalogue routes.
   */
  path?: string | undefined;
}

export function buildAdminSessionCookie(token: string, options: SessionCookieOptions): string {
  const path = options.path || '/admin';
  const secure = options.secure ? '; Secure' : '';
  return (
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=${path}; ` +
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}; SameSite=Lax${secure}`
  );
}

export function buildClearAdminSessionCookie(options: Pick<SessionCookieOptions, 'secure' | 'path'>): string {
  return buildAdminSessionCookie('', { maxAgeSeconds: 0, secure: options.secure, path: options.path });
}

/** Read the staff session token from the request cookie header. */
export function readAdminSessionToken(cookieHeader: string | undefined | null): string | null {
  for (const part of String(cookieHeader || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    if (trimmed.slice(0, separator) !== ADMIN_SESSION_COOKIE) continue;
    let value = '';
    try {
      value = decodeURIComponent(trimmed.slice(separator + 1));
    } catch {
      return null;
    }
    return value || null;
  }
  return null;
}

/**
 * Why a session could not be resolved. The split matters for HTTP semantics:
 * a missing/expired/revoked session is 401 (authenticate again), while an account
 * that is not ACTIVE is 403 (authenticated, but this actor may not act).
 */
export type AdminSessionFailure =
  | 'missing_token'
  | 'unknown_token'
  | 'revoked'
  | 'idle_expired'
  | 'absolute_expired'
  | 'user_not_active';

export type AdminSessionLookup =
  | {
      ok: true;
      sessionId: string;
      userId: string;
      displayName: string;
      email: string;
      roles: string[];
      permissionEpoch: number;
    }
  | { ok: false; reason: AdminSessionFailure };

/** 401 = authenticate; 403 = authenticated but not permitted. Never 409. */
export function statusForSessionFailure(reason: AdminSessionFailure): 401 | 403 {
  return reason === 'user_not_active' ? 403 : 401;
}

export interface IssueSessionInput {
  userId: string;
  /** Absolute seconds; defaults to SESSION_ABSOLUTE_TTL_SECONDS. */
  absoluteTtlSeconds?: number;
}

export interface IssuedSession {
  sessionId: string;
  /** The ONLY place the plaintext token exists. Store the hash, send this. */
  token: string;
}

export async function issueAdminSession(db: DbClient, input: IssueSessionInput): Promise<IssuedSession> {
  const token = generateSessionToken();
  const sessionId = generateSessionId();
  const ttl = input.absoluteTtlSeconds ?? SESSION_ABSOLUTE_TTL_SECONDS;
  await db.query(
    `
      insert into "AdminSession" (id, "userId", "tokenHash", "expiresAt", "createdAt")
      values ($1, $2, $3, now() + make_interval(secs => $4), now())
    `,
    [sessionId, input.userId, hashSessionToken(token), ttl],
  );
  return { sessionId, token };
}

/**
 * Resolve a session token to an actor.
 *
 * Every gate lives in the SQL condition of a single UPDATE ... RETURNING, not in a
 * pre-check before it: the project already learned that a check followed by a
 * separate write leaves a window (ADMIN.REWRITE-ROLE). Sliding `lastSeenAt` is the
 * write, and it can only happen to a row that is unrevoked, unexpired and owned by
 * an ACTIVE user, so a session cannot be extended while it is dying.
 */
export async function resolveAdminSession(
  db: DbClient,
  token: string | null,
  idleTtlSeconds: number = SESSION_IDLE_TTL_SECONDS,
): Promise<AdminSessionLookup> {
  if (!token) return { ok: false, reason: 'missing_token' };

  const matched = await db.query<{
    id: string;
    userId: string;
    displayName: string;
    email: string;
    roles: string[] | null;
    permissionEpoch: number;
  }>(
    `
      update "AdminSession" as s
         set "lastSeenAt" = now()
        from "AdminUser" as u
       where s."tokenHash" = $1
         and s."revokedAt" is null
         and s."expiresAt" > now()
         and coalesce(s."lastSeenAt", s."createdAt") > now() - make_interval(secs => $2)
         and u.id = s."userId"
         and u.state = 'ACTIVE'
      returning s.id, u.id as "userId", u."displayName", u.email,
                u.roles::text[] as roles, u."permissionEpoch"
    `,
    [hashSessionToken(token), idleTtlSeconds],
  );

  const row = matched.rows[0];
  if (row) {
    return {
      ok: true,
      sessionId: row.id,
      userId: row.userId,
      displayName: row.displayName,
      email: row.email,
      roles: Array.isArray(row.roles) ? row.roles : [],
      permissionEpoch: Number(row.permissionEpoch) || 0,
    };
  }

  return { ok: false, reason: await diagnoseSessionFailure(db, token, idleTtlSeconds) };
}

/**
 * Classify a failed resolve so the caller can answer 401 or 403 correctly.
 * Runs only on the failure path. `now()` is read from the database, not from the
 * application clock, so app/DB clock skew cannot misclassify an expiry.
 */
async function diagnoseSessionFailure(
  db: DbClient,
  token: string,
  idleTtlSeconds: number,
): Promise<AdminSessionFailure> {
  const found = await db.query<{
    revokedAt: string | Date | null;
    expiresAt: string | Date;
    seenAt: string | Date;
    idleBoundary: string | Date;
    dbNow: string | Date;
    state: string | null;
  }>(
    `
      select s."revokedAt",
             s."expiresAt",
             coalesce(s."lastSeenAt", s."createdAt") as "seenAt",
             now() - make_interval(secs => $2) as "idleBoundary",
             now() as "dbNow",
             u.state::text as state
        from "AdminSession" as s
        left join "AdminUser" as u on u.id = s."userId"
       where s."tokenHash" = $1
    `,
    [hashSessionToken(token), idleTtlSeconds],
  );

  const row = found.rows[0];
  if (!row) return 'unknown_token';
  if (row.revokedAt) return 'revoked';

  const nowMs = new Date(row.dbNow).getTime();
  if (new Date(row.expiresAt).getTime() <= nowMs) return 'absolute_expired';
  if (new Date(row.seenAt).getTime() <= new Date(row.idleBoundary).getTime()) return 'idle_expired';
  if (row.state !== 'ACTIVE') return 'user_not_active';

  // Every gate passed yet the guarded UPDATE matched nothing: the row changed
  // between the two statements. Report the strictest safe answer rather than
  // guessing a reason, and let the caller re-authenticate.
  return 'unknown_token';
}

/** Logout: revoke this session only. Other sessions of the same user survive. */
export async function revokeAdminSession(db: DbClient, token: string | null): Promise<boolean> {
  if (!token) return false;
  const result = await db.query<{ id: string }>(
    `
      update "AdminSession"
         set "revokedAt" = now()
       where "tokenHash" = $1
         and "revokedAt" is null
      returning id
    `,
    [hashSessionToken(token)],
  );
  return Boolean(result.rows[0]);
}

/**
 * Revoke every live session of a user - the mechanism behind suspension and
 * behind a role change taking effect immediately rather than at absolute expiry.
 */
export async function revokeAllAdminSessions(db: DbClient, userId: string): Promise<number> {
  const result = await db.query<{ id: string }>(
    `
      update "AdminSession"
         set "revokedAt" = now()
       where "userId" = $1
         and "revokedAt" is null
      returning id
    `,
    [userId],
  );
  return result.rows.length;
}

/**
 * The actor resolved by the auth middleware for one request.
 *
 * `DescriptionRevisionHandlerDependencies.resolveActor` is SYNCHRONOUS by contract,
 * and a session lookup is a database round trip. Rather than make every handler
 * async-await its identity (and pay a lookup per handler), the middleware resolves
 * the session ONCE per request and attaches it here. Handlers then read it for
 * free, and 401/403 stays decided in one place instead of being re-derived per
 * endpoint.
 */
export const ADMIN_ACTOR = Symbol.for('daibilet.adminActor');

export interface AdminActor {
  userId: string;
  displayName: string;
  email: string;
  roles: string[];
  permissionEpoch: number;
  sessionId: string;
}

type RequestWithActor = { [ADMIN_ACTOR]?: AdminActor | undefined };

export function attachAdminActor(request: unknown, actor: AdminActor): void {
  if (request && typeof request === 'object') {
    (request as RequestWithActor)[ADMIN_ACTOR] = actor;
  }
}

export function readAdminActor(request: unknown): AdminActor | null {
  if (!request || typeof request !== 'object') return null;
  return (request as RequestWithActor)[ADMIN_ACTOR] || null;
}

/**
 * Role map for the rewrite queue, fixed BEFORE the code was written (decision-log
 * 2026-10-20, ADMIN.REWRITE-ROLE). `AdminRole` has no EDITOR/PUBLISHER values, so
 * the gate is written against the enum that actually exists. Whether COPYWRITER may
 * approve is a product question for the owner: changing the answer is a one-constant
 * edit, not a code change.
 */
export const REWRITE_APPROVE_ROLES = ['CATALOG_EDITOR', 'COPYWRITER', 'SUPERADMIN'] as const;
export const REWRITE_PUBLISH_ROLES = ['CATALOG_EDITOR', 'SUPERADMIN'] as const;

export function hasAnyRole(actorRoles: readonly string[], allowed: readonly string[]): boolean {
  const owned = new Set(actorRoles.map((role) => String(role).toUpperCase()));
  return allowed.some((role) => owned.has(role));
}

/**
 * Form login against `AdminUser.passwordHash`.
 *
 * A missing account still runs a full scrypt verification against a dummy hash, so
 * "no such user" does not answer measurably faster than "wrong password".
 */
export async function loginAdminUser(
  db: DbClient,
  emailInput: string,
  password: string,
): Promise<
  | { ok: true; token: string; sessionId: string; userId: string; displayName: string; email: string; roles: string[] }
  | { ok: false; reason: 'invalid_credentials' | 'not_active' }
> {
  const email = String(emailInput || '').trim().toLowerCase();
  if (!email || !password) return { ok: false, reason: 'invalid_credentials' };

  const found = await db.query<{
    id: string;
    email: string;
    displayName: string;
    passwordHash: string | null;
    state: string;
    roles: string[] | null;
  }>(
    `
      select id, email, "displayName", "passwordHash", state::text as state, roles::text[] as roles
        from "AdminUser"
       where lower(email) = $1
    `,
    [email],
  );

  const user = found.rows[0];
  const valid = await verifyAdminPasswordSafe(password, user?.passwordHash ?? null);
  if (!user || !valid) return { ok: false, reason: 'invalid_credentials' };

  // Credentials were correct, so this is an authorization answer, not an
  // authentication one - which is exactly the 401/403 split.
  if (user.state !== 'ACTIVE') return { ok: false, reason: 'not_active' };

  const issued = await issueAdminSession(db, { userId: user.id });
  await db.query('update "AdminUser" set "lastLoginAt" = now() where id = $1', [user.id]);

  return {
    ok: true,
    token: issued.token,
    sessionId: issued.sessionId,
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

