import { ADMIN_PERMISSIONS, resolveAdminSessionPermissions } from '@daibilet/contracts/admin-access/runtime';
import { headers } from 'next/headers';

import { isAdminAuthConfigured, isAuthorizedAdminBasicAuth, readAdminBasicAuthConfig } from '@/lib/admin-basic-auth';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type CurrentAdminUser = {
  id: string;
  email: string;
  displayName: string;
  sessionId: string;
  roles: string[];
  mfaVerified: boolean;
  mfaEnabled: boolean;
};

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  try {
    const response = await adminApiFetch('/api/admin/auth/me');
    if (!response.ok) return null;
    const payload = await response.json() as { user?: Record<string, unknown> };
    const user = payload.user;
    if (!user || typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.displayName !== 'string' || typeof user.sessionId !== 'string' || !Array.isArray(user.roles)) return null;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      sessionId: user.sessionId,
      roles: user.roles.filter((role): role is string => typeof role === 'string'),
      mfaVerified: user.mfaVerified === true,
      mfaEnabled: user.mfaEnabled === true,
    };
  } catch {
    return null;
  }
}

export async function currentAdminHasPermission(permission: string): Promise<boolean> {
  if (!ADMIN_PERMISSIONS.includes(permission as typeof ADMIN_PERMISSIONS[number])) return false;
  if (process.env.DAIBILET_ADMIN_RBAC_ENFORCE !== '1') {
    const config = readAdminBasicAuthConfig();
    const requestHeaders = await headers();
    return isAdminAuthConfigured(config) && isAuthorizedAdminBasicAuth(requestHeaders.get('authorization'), config);
  }
  const user = await getCurrentAdminUser();
  if (!user) return false;
  return resolveAdminSessionPermissions(user.roles, user.mfaVerified).has(permission as typeof ADMIN_PERMISSIONS[number]);
}
