import { createHmac, randomUUID } from 'node:crypto';
import { ADMIN_ROLES, resolveAdminSessionPermissions } from '@daibilet/contracts/admin-access/runtime';

import { adminApiFetch } from '@/server/admin-api-fetch';

const ISSUER = 'daibilet-web-admin';
const AUDIENCE = 'daibilet-finance-admin';
const ASSERTION_TTL_SECONDS = 90;

export type AdminFinanceActor = {
  id: string;
  displayName: string;
  sessionId: string;
  roles: string[];
  mfaVerified?: boolean;
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
      user?: { id?: unknown; displayName?: unknown; sessionId?: unknown; roles?: unknown; mfaVerified?: unknown };
    };
    const user = payload.user;
    if (
      !user || typeof user.id !== 'string' || typeof user.displayName !== 'string' ||
      typeof user.sessionId !== 'string' || !Array.isArray(user.roles)
    ) return null;
    const actor: AdminFinanceActor = {
      id: user.id,
      displayName: user.displayName,
      sessionId: user.sessionId,
      roles: user.roles.filter((role): role is string => typeof role === 'string'),
      mfaVerified: user.mfaVerified === true,
    };
    return { actor, assertion: createAdminFinanceActorAssertion(actor, secret) };
  } catch {
    return null;
  }
}

export function createAdminFinanceActorAssertion(actor: AdminFinanceActor, secret: string, now = Date.now()): string {
  const key = secret.trim();
  const roles = [...new Set(actor.roles.filter((role) => ADMIN_ROLES.includes(role as typeof ADMIN_ROLES[number])))].sort();
  if (Buffer.byteLength(key, 'utf8') < 32) throw new Error('admin_finance_actor_secret_too_short');
  if (!actor.id.trim() || actor.id.length > 128 || !actor.displayName.trim() || actor.displayName.length > 120 || !actor.sessionId.trim() || actor.sessionId.length > 128 || !roles.length) {
    throw new Error('admin_finance_actor_invalid');
  }
  const issuedAt = Math.floor(now / 1000);
  const claims = {
    v: 1,
    iss: ISSUER,
    aud: AUDIENCE,
    sub: actor.id.trim(),
    name: actor.displayName.trim(),
    sid: actor.sessionId.trim(),
    roles,
    mfaVerified: actor.mfaVerified === true,
    permissions: [...resolveAdminSessionPermissions(roles, actor.mfaVerified === true)].sort(),
    iat: issuedAt,
    exp: issuedAt + ASSERTION_TTL_SECONDS,
    jti: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const signature = createHmac('sha256', key).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}
