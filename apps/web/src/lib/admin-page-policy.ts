import { resolveAdminSessionPermissions } from '@daibilet/contracts/admin-access/runtime';

export type AdminPageAccess = { allOf?: string[]; anyOf?: string[] };

const pagePolicies: Array<{ matches: (pathname: string) => boolean; access: AdminPageAccess }> = [
  { matches: (path) => path === '/admin', access: { anyOf: ['catalog.read', 'seo.read', 'integrations.read', 'finance.summary.read', 'orders.read'] } },
  { matches: (path) => path === '/admin/buyers' || path.startsWith('/admin/buyers/'), access: { allOf: ['orders.read', 'orders.pii.read'] } },
  { matches: (path) => path === '/admin/orders' || path.startsWith('/admin/orders/'), access: { allOf: ['orders.read'] } },
  { matches: (path) => path === '/admin/chats' || path.startsWith('/admin/chats/'), access: { allOf: ['support.read'] } },
  { matches: (path) => path === '/admin/suppliers' || path.startsWith('/admin/suppliers/'), access: { allOf: ['suppliers.read'] } },
  { matches: (path) => path === '/admin/change-requests' || path.startsWith('/admin/change-requests/'), access: { allOf: ['suppliers.read'] } },
  { matches: (path) => ['/admin/events', '/admin/venues', '/admin/cities', '/admin/taxonomy'].some((root) => path === root || path.startsWith(`${root}/`)), access: { allOf: ['catalog.read'] } },
  { matches: (path) => path === '/admin/landings' || path.startsWith('/admin/landings/'), access: { allOf: ['seo.read'] } },
  { matches: (path) => path === '/admin/articles' || path.startsWith('/admin/articles/'), access: { allOf: ['content.read'] } },
  { matches: (path) => path === '/admin/reviews' || path.startsWith('/admin/reviews/'), access: { allOf: ['content.read'] } },
  { matches: (path) => path === '/admin/hero-banners' || path.startsWith('/admin/hero-banners/'), access: { allOf: ['content.edit'] } },
  { matches: (path) => ['/admin/sources', '/admin/sync-health'].some((root) => path === root || path.startsWith(`${root}/`)), access: { allOf: ['integrations.read'] } },
  { matches: (path) => path === '/admin/audit-log' || path.startsWith('/admin/audit-log/'), access: { allOf: ['audit.read'] } },
  { matches: (path) => path === '/admin/settings' || path.startsWith('/admin/settings/'), access: { allOf: ['staff.manage'] } },
];

/** Unknown admin pages deny by default; backend route guards remain authoritative for API calls. */
export function getAdminPageAccess(pathname: string): AdminPageAccess | null {
  return pagePolicies.find(({ matches }) => matches(pathname))?.access || null;
}

export function adminPageAllowsPermissions(access: AdminPageAccess, permissions: Iterable<string>): boolean {
  const granted = new Set(permissions);
  if (access.allOf?.some((permission) => !granted.has(permission))) return false;
  if (access.anyOf?.length && !access.anyOf.some((permission) => granted.has(permission))) return false;
  return Boolean(access.allOf?.length || access.anyOf?.length);
}

export function adminPageAllowsSession(pathname: string, roles: readonly string[], mfaVerified = false): boolean {
  const access = getAdminPageAccess(pathname);
  return access ? adminPageAllowsPermissions(access, resolveAdminSessionPermissions(roles, mfaVerified)) : false;
}
