/** Shared permission catalogue. Runtime values also load from plain Node.js backend. */
import {
  ADMIN_PERMISSIONS as runtimePermissions,
  ADMIN_ROLES as runtimeRoles,
  ADMIN_ROLE_PERMISSIONS as runtimeRolePermissions,
  resolveAdminPermissions as resolveRuntimeAdminPermissions,
  adminRoleAllows as runtimeAdminRoleAllows,
} from './admin-access-runtime.js';

export const ADMIN_PERMISSIONS = runtimePermissions;
export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export const ADMIN_ROLES = runtimeRoles;
export type AdminRole = typeof ADMIN_ROLES[number];

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = runtimeRolePermissions;

/** Profiles are additive, never hierarchical. Object scope and account status must be checked separately. */
export function resolveAdminPermissions(roles: readonly AdminRole[]): ReadonlySet<AdminPermission> {
  return resolveRuntimeAdminPermissions(roles) as ReadonlySet<AdminPermission>;
}

export function adminRoleAllows(roles: readonly AdminRole[], permission: AdminPermission): boolean {
  return runtimeAdminRoleAllows(roles, permission);
}
