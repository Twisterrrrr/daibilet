import { headers } from 'next/headers';
import { adminRoleAllows, ADMIN_PERMISSIONS } from '@daibilet/contracts/admin-access/runtime';

import { isAuthorizedAdminBasicAuth, readAdminBasicAuthConfig } from '@/lib/admin-basic-auth';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export function adminRolesHavePermissions(roles: readonly string[], required: readonly AdminPermission[]): boolean {
  return required.every((permission) => adminRoleAllows(roles, permission));
}

export class AdminPermissionError extends Error {
  readonly status = 403;

  constructor() {
    super('Нет доступа к этому действию.');
    this.name = 'AdminPermissionError';
  }
}

export async function adminHasPermissions(required: readonly AdminPermission[]): Promise<boolean> {
  const incoming = await headers();
  const cookie = incoming.get('cookie') || '';
  const hasSessionCookie = cookie.split(';').some((part) => part.trim().startsWith('daibilet_admin_session='));

  if (hasSessionCookie) {
    try {
      const response = await adminApiFetch('/api/admin/auth/me');
      if (!response.ok) return false;
      const payload = await response.json() as { user?: { roles?: unknown } };
      const roles = Array.isArray(payload.user?.roles)
        ? payload.user.roles.filter((role): role is string => typeof role === 'string')
        : [];
      return adminRolesHavePermissions(roles, required);
    } catch {
      return false;
    }
  }

  if (process.env.DAIBILET_ADMIN_RBAC_ENFORCE === '1') return false;
  return isAuthorizedAdminBasicAuth(incoming.get('authorization'), readAdminBasicAuthConfig());
}

/**
 * Enforce permissions inside Next server actions and direct-Prisma handlers.
 * A valid staff session uses the role map; legacy Basic Auth remains a
 * SUPERADMIN-equivalent only while backend session enforcement is disabled.
 */
export async function requireAdminPermissions(required: readonly AdminPermission[]): Promise<void> {
  if (!(await adminHasPermissions(required))) throw new AdminPermissionError();
}
