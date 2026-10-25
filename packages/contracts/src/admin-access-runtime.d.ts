export const ADMIN_PERMISSIONS: readonly [
  'orders.read', 'orders.pii.read', 'orders.export', 'orders.manage', 'orders.cancel',
  'refunds.request', 'refunds.execute', 'support.read', 'support.write',
  'finance.summary.read', 'finance.read', 'payouts.approve', 'documents.read',
  'suppliers.read', 'suppliers.manage', 'suppliers.bank.read', 'catalog.read',
  'catalog.edit', 'catalog.publish', 'content.read', 'content.edit', 'content.publish',
  'seo.read', 'seo.edit', 'integrations.read', 'integrations.retry',
  'integrations.secrets.manage', 'audit.read', 'staff.manage'
];
export const ADMIN_ROLES: readonly [
  'SUPERADMIN', 'PRODUCT', 'SUPPORT', 'FINANCE', 'CATALOG_EDITOR', 'COPYWRITER', 'SEO', 'INTEGRATIONS', 'AUDITOR'
];
export const ADMIN_MFA_REQUIRED_PERMISSIONS: readonly string[];
export const ADMIN_ROLE_PERMISSIONS: Readonly<Record<(typeof ADMIN_ROLES)[number], readonly (typeof ADMIN_PERMISSIONS)[number][]>>;
export function resolveAdminPermissions(roles: readonly string[]): ReadonlySet<(typeof ADMIN_PERMISSIONS)[number]>;
export function resolveAdminSessionPermissions(roles: readonly string[], mfaVerified?: boolean): ReadonlySet<(typeof ADMIN_PERMISSIONS)[number]>;
export function adminRoleAllows(roles: readonly string[], permission: string): boolean;
