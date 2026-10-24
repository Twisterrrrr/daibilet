export const ADMIN_PERMISSIONS = Object.freeze([
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
]);

export const ADMIN_ROLES = Object.freeze([
  'SUPERADMIN',
  'PRODUCT',
  'SUPPORT',
  'FINANCE',
  'CATALOG_EDITOR',
  'COPYWRITER',
  'SEO',
  'INTEGRATIONS',
  'AUDITOR',
]);

export const ADMIN_ROLE_PERMISSIONS = Object.freeze({
  SUPERADMIN: ADMIN_PERMISSIONS,
  PRODUCT: Object.freeze(['orders.read', 'finance.summary.read', 'suppliers.read', 'suppliers.manage', 'catalog.read', 'catalog.edit', 'catalog.publish', 'content.read', 'content.edit', 'content.publish', 'seo.read', 'seo.edit', 'integrations.read', 'audit.read']),
  SUPPORT: Object.freeze(['orders.read', 'orders.pii.read', 'refunds.request', 'support.read', 'support.write', 'catalog.read']),
  FINANCE: Object.freeze(['orders.read', 'orders.pii.read', 'orders.export', 'orders.cancel', 'refunds.request', 'refunds.execute', 'finance.summary.read', 'finance.read', 'payouts.approve', 'documents.read', 'suppliers.read', 'suppliers.bank.read', 'audit.read']),
  CATALOG_EDITOR: Object.freeze(['catalog.read', 'catalog.edit', 'catalog.publish', 'content.read', 'content.edit', 'content.publish', 'seo.read', 'suppliers.read']),
  COPYWRITER: Object.freeze(['catalog.read', 'content.read', 'content.edit', 'seo.read', 'seo.edit']),
  SEO: Object.freeze(['catalog.read', 'content.read', 'seo.read', 'seo.edit', 'integrations.read']),
  INTEGRATIONS: Object.freeze(['catalog.read', 'integrations.read', 'integrations.retry', 'audit.read']),
  AUDITOR: Object.freeze(['orders.read', 'finance.read', 'documents.read', 'suppliers.read', 'catalog.read', 'content.read', 'seo.read', 'integrations.read', 'audit.read']),
});

export function resolveAdminPermissions(roles) {
  const permissions = new Set();
  for (const role of Array.isArray(roles) ? roles : []) {
    if (!Object.hasOwn(ADMIN_ROLE_PERMISSIONS, role)) continue;
    const rolePermissions = ADMIN_ROLE_PERMISSIONS[role];
    for (const permission of rolePermissions) permissions.add(permission);
  }
  return permissions;
}

export function adminRoleAllows(roles, permission) {
  return resolveAdminPermissions(roles).has(permission);
}
