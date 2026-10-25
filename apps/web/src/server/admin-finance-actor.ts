import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { ADMIN_PERMISSIONS, ADMIN_ROLES, resolveAdminPermissions } from '@daibilet/contracts/admin-access/runtime';

import { adminApiFetch } from '@/server/admin-api-fetch';

const ASSERTION_ISSUER = 'daibilet-web-admin';
const ASSERTION_AUDIENCE = 'daibilet-finance-admin';
const MAX_ASSERTION_TTL_SECONDS = 90;

export type AdminFinanceActor = {
  id: string;
  displayName: string;
  sessionId: string;
  roles: string[];
};

export async function issueCurrentAdminFinanceAssertion(): Promise<{
  actor: AdminFinanceActor;
  assertion: string;
} | null> {
  const secret = process.env.DAIBILET_FINANCE_ACTOR_ASSERTION_SECRET || '';
  if (Buffer.byteLength(secret.trim(), 'utf8') < 32) return null;
  try {
    const response = await adminApiFetch('/api/admin/auth/me');
    if (!response.ok) return null;
    const payload = await response.json() as {
      user?: { id?: unknown; displayName?: unknown; sessionId?: unknown; roles?: unknown };
    };
    const user = payload.user;
    if (!user || typeof user.id !== 'string' || typeof user.displayName !== 'string' || typeof user.sessionId !== 'string' || !Array.isArray(user.roles)) return null;
    const actor: AdminFinanceActor = {
      id: user.id,
      displayName: user.displayName,
      sessionId: user.sessionId,
      roles: user.roles.filter((role): role is string => typeof role === 'string'),
    };
    const assertion = createAdminFinanceActorAssertion(actor, secret);
    return { actor, assertion };
  } catch {
    return null;
  }
}

type AdminFinanceActorClaims = {
  v: 1;
  iss: typeof ASSERTION_ISSUER;
  aud: typeof ASSERTION_AUDIENCE;
  sub: string;
  name: string;
  sid: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  jti: string;
};

export function createAdminFinanceActorAssertion(
  actor: AdminFinanceActor,
  secret: string,
  now = Date.now(),
): string {
  const key = secret.trim();
  const id = actor.id.trim();
  const displayName = actor.displayName.trim();
  const sessionId = actor.sessionId.trim();
  const roles = [...new Set(actor.roles.filter((role) => ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])))].sort();
  if (Buffer.byteLength(key, 'utf8') < 32) throw new Error('admin_finance_actor_secret_too_short');
  if (!id || id.length > 128 || !displayName || displayName.length > 120 || !sessionId || sessionId.length > 128 || roles.length === 0) {
    throw new Error('admin_finance_actor_invalid');
  }

  const issuedAt = Math.floor(now / 1000);
  const claims: AdminFinanceActorClaims = {
    v: 1,
    iss: ASSERTION_ISSUER,
    aud: ASSERTION_AUDIENCE,
    sub: id,
    name: displayName,
    sid: sessionId,
    roles,
    permissions: [...resolveAdminPermissions(roles)].sort(),
    iat: issuedAt,
    exp: issuedAt + MAX_ASSERTION_TTL_SECONDS,
    jti: randomUUID(),
  };
  const encodedClaims = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const signature = createHmac('sha256', key).update(encodedClaims).digest('base64url');
  return `${encodedClaims}.${signature}`;
}

export function verifyAdminFinanceActorAssertion(
  assertion: string,
  secret: string,
  requiredPermission?: string,
  now = Date.now(),
): AdminFinanceActorClaims | null {
  const key = secret.trim();
  if (Buffer.byteLength(key, 'utf8') < 32) return null;
  const [encodedClaims, providedSignature, extra] = assertion.split('.');
  if (!encodedClaims || !providedSignature || extra) return null;
  const expectedSignature = createHmac('sha256', key).update(encodedClaims).digest();
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(providedSignature, 'base64url');
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;

  let claims: Partial<AdminFinanceActorClaims>;
  try {
    claims = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8')) as Partial<AdminFinanceActorClaims>;
  } catch {
    return null;
  }
  const nowSeconds = Math.floor(now / 1000);
  if (claims.v !== 1 || claims.iss !== ASSERTION_ISSUER || claims.aud !== ASSERTION_AUDIENCE) return null;
  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.sid !== 'string' || !claims.sid) return null;
  if (typeof claims.jti !== 'string' || !claims.jti || !Array.isArray(claims.roles) || !Array.isArray(claims.permissions)) return null;
  if (claims.roles.some((role) => typeof role !== 'string' || !ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number]))) return null;
  if (claims.permissions.some((permission) => typeof permission !== 'string' || !ADMIN_PERMISSIONS.includes(permission as typeof ADMIN_PERMISSIONS[number]))) return null;
  if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') return null;
  if (claims.iat > nowSeconds + 15 || claims.exp <= nowSeconds || claims.exp <= claims.iat || claims.exp - claims.iat > MAX_ASSERTION_TTL_SECONDS) return null;

  const expectedPermissions = [...resolveAdminPermissions(claims.roles)].sort();
  const actualPermissions = [...new Set(claims.permissions)].sort();
  if (expectedPermissions.length !== actualPermissions.length || expectedPermissions.some((permission, index) => permission !== actualPermissions[index])) return null;
  if (requiredPermission && !actualPermissions.includes(requiredPermission)) return null;
  return claims as AdminFinanceActorClaims;
}
