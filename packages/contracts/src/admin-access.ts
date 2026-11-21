/** Staff permissions for the future personal admin session. No runtime route uses these until identity and API guards are wired. */
export const ADMIN_PERMISSIONS = [
  'orders.read',
  'orders.pii.read',
  'orders.export',
  'orders.manage',
  'orders.cancel',
  'refunds.request',
  'refunds.execute',
  'support.read',
  'support.write',
  'finance.summary.read',
  'finance.read',
  'payouts.approve',
  'documents.read',
  'suppliers.read',
  'suppliers.manage',
  'suppliers.bank.read',
  'catalog.read',
  'catalog.edit',
  'catalog.publish',
  'content.read',
  'content.edit',
  'content.publish',
  'seo.read',
  'seo.edit',
  'integrations.read',
  'integrations.retry',
  'integrations.secrets.manage',
  'audit.read',
  'staff.manage',
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export const ADMIN_ROLES = [
  'SUPERADMIN',
  'PRODUCT',
  'SUPPORT',
  'FINANCE',
  'CATALOG_EDITOR',
  'COPYWRITER',
  'SEO',
  'INTEGRATIONS',
  'AUDITOR',
] as const;

export type AdminRole = typeof ADMIN_ROLES[number];

/** Profiles are additive, never hierarchical. Object scope and account status must be checked separately. */
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  SUPERADMIN: ADMIN_PERMISSIONS,
  PRODUCT: ['orders.read', 'finance.summary.read', 'suppliers.read', 'suppliers.manage', 'catalog.read', 'catalog.edit', 'catalog.publish', 'content.read', 'content.edit', 'content.publish', 'seo.read', 'seo.edit', 'integrations.read', 'audit.read'],
  SUPPORT: ['orders.read', 'orders.pii.read', 'refunds.request', 'support.read', 'support.write', 'catalog.read'],
  FINANCE: ['orders.read', 'orders.pii.read', 'orders.export', 'orders.cancel', 'refunds.request', 'refunds.execute', 'finance.summary.read', 'finance.read', 'payouts.approve', 'documents.read', 'suppliers.read', 'suppliers.bank.read', 'audit.read'],
  CATALOG_EDITOR: ['catalog.read', 'catalog.edit', 'catalog.publish', 'content.read', 'content.edit', 'content.publish', 'seo.read', 'suppliers.read'],
  COPYWRITER: ['catalog.read', 'content.read', 'content.edit', 'seo.read', 'seo.edit'],
  SEO: ['catalog.read', 'content.read', 'seo.read', 'seo.edit', 'integrations.read'],
  INTEGRATIONS: ['catalog.read', 'integrations.read', 'integrations.retry', 'audit.read'],
  AUDITOR: ['orders.read', 'finance.read', 'documents.read', 'suppliers.read', 'catalog.read', 'content.read', 'seo.read', 'integrations.read', 'audit.read'],
};

export function resolveAdminPermissions(roles: readonly AdminRole[]): ReadonlySet<AdminPermission> {
  return new Set(roles.flatMap((role) => ADMIN_ROLE_PERMISSIONS[role] || []));
}

export function adminRoleAllows(roles: readonly AdminRole[], permission: AdminPermission): boolean {
  return resolveAdminPermissions(roles).has(permission);
}
