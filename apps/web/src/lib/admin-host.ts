/**
 * Host-based admin cutover (F4.1c).
 * admin.daibilet.ru SPA paths rewrite to /admin/* on the same Next process.
 */
export function isAdminHost(host: string): boolean {
  const normalized = host.toLowerCase().split(':')[0] || '';
  return normalized === 'admin.daibilet.ru' || normalized === 'admin.localhost';
}

/** First path segments that used to be Vite SPA routes on admin.daibilet.ru. */
export const ADMIN_HOST_SPA_SEGMENTS = new Set([
  'events',
  'landings',
  'articles',
  'sources',
  'settings',
  'orders',
  'buyers',
  'venues',
  'cities',
  'sync-health',
  'reviews',
  'change-requests',
  'mapping-inbox',
  'taxonomy',
  'audit-log',
]);

export function rewriteAdminHostPathname(pathname: string): string | null {
  if (!pathname || pathname === '/') return '/admin';
  if (pathname.startsWith('/admin')) return null;
  if (pathname.startsWith('/legacy')) return null;
  if (pathname.startsWith('/_next')) return null;
  if (pathname.startsWith('/api')) return null;

  const segment = pathname.split('/').filter(Boolean)[0] || '';
  if (ADMIN_HOST_SPA_SEGMENTS.has(segment)) {
    return `/admin${pathname}`.replace(/\/{2,}/g, '/');
  }

  // Unknown path on admin host → dashboard (avoid leaking public catalog UI).
  return '/admin';
}
