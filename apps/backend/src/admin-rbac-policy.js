import { adminRoleAllows } from '@daibilet/contracts/admin-access/runtime';

const exactPolicies = new Map([
  ['GET /api/db/stats', ['integrations.read']],
  ['GET /api/db/events', ['catalog.read']],
  ['GET /api/admin/dashboard', ['catalog.read']],
  ['GET /api/admin/sources', ['integrations.read']],
  ['GET /api/admin/orders', ['orders.read']],
  ['GET /api/admin/external-orders', ['orders.read']],
  ['GET /api/admin/order-event-candidates', ['catalog.read']],
  ['GET /api/admin/events', ['catalog.read']],
  ['GET /api/admin/taxonomy', ['catalog.read']],
  ['GET /api/admin/venues', ['catalog.read']],
  ['GET /api/admin/cities', ['catalog.read']],
  ['GET /api/admin/pdp/variants', ['catalog.read']],
  ['GET /api/admin/landings', ['seo.read']],
  ['GET /api/admin/articles', ['content.read']],
  ['GET /api/admin/reviews', ['content.read']],
  ['GET /api/admin/event-change-requests', ['suppliers.read']],
  ['POST /api/admin/orders/archive', ['orders.manage']],
  ['POST /api/admin/orders/sync', ['integrations.retry']],
  ['POST /api/admin/orders/tep/sync', ['integrations.retry']],
  ['POST /api/admin/sources/ticketscloud/sync', ['integrations.retry']],
  ['POST /api/v1/tc/sync', ['integrations.retry']],
  ['POST /api/v1/tep/sync', ['integrations.retry']],
  ['POST /api/v1/tc/orders/sync', ['integrations.retry']],
  ['POST /api/v1/tep/orders/sync', ['integrations.retry']],
]);

const dynamicPolicies = [
  [/^GET \/api\/admin\/orders\/[^/]+$/, ['orders.read']],
  [/^POST \/api\/admin\/orders\/[^/]+\/(?:archive|unarchive|tickets)$/, ['orders.manage']],
  [/^GET \/api\/admin\/cities\/[^/]+$/, ['catalog.read']],
  [/^PATCH \/api\/admin\/cities\/[^/]+$/, ['catalog.edit']],
  [/^GET \/api\/admin\/venues\/[^/]+$/, ['catalog.read']],
  [/^PATCH \/api\/admin\/venues\/[^/]+$/, ['catalog.edit']],
  [/^GET \/api\/admin\/pdp\/variants$/, ['catalog.read']],
  [/^GET \/api\/admin\/pdp\/(?:venues|events)\/[^/]+$/, ['catalog.read']],
  [/^PUT \/api\/admin\/pdp\/(?:venues|events)\/[^/]+$/, ['catalog.edit']],
  [/^GET \/api\/admin\/landings\/[^/]+\/candidates$/, ['seo.read']],
  [/^GET \/api\/admin\/landings\/[^/]+$/, ['seo.read']],
  [/^PATCH \/api\/admin\/landings\/[^/]+$/, ['seo.edit']],
  [/^PATCH \/api\/admin\/landings\/[^/]+\/matches\/[^/]+$/, ['seo.edit']],
  [/^PATCH \/api\/admin\/articles\/[^/]+$/, ['content.edit', 'content.publish']],
  [/^GET \/api\/admin\/articles\/[^/]+$/, ['content.read']],
  [/^DELETE \/api\/admin\/articles\/[^/]+$/, ['content.edit']],
  [/^GET \/api\/admin\/events\/[^/]+$/, ['catalog.read']],
  [/^GET \/api\/admin\/events\/[^/]+\/venue-link-suggestions$/, ['catalog.read']],
  // This endpoint accepts mixed override fields. Until the handler checks each
  // submitted field, only roles with the full set can use it.
  [/^PATCH \/api\/admin\/events\/[^/]+\/override$/, ['content.edit', 'seo.edit', 'catalog.edit', 'catalog.publish']],
  [/^PATCH \/api\/admin\/events\/[^/]+\/moderation$/, ['catalog.publish']],
  [/^PATCH \/api\/admin\/events\/[^/]+\/(?:taxonomy|venue-links)$/, ['catalog.edit']],
  [/^POST \/api\/admin\/events\/[^/]+\/rewrite-description$/, ['content.edit']],
  [/^POST \/api\/admin\/events\/[^/]+\/venue-links:apply$/, ['catalog.edit']],
  [/^(?:PATCH|PUT) \/api\/admin\/events\/[^/]+\/venue-links$/, ['catalog.edit']],
  [/^GET \/api\/admin\/event-change-requests\/[^/]+$/, ['suppliers.read']],
  [/^POST \/api\/admin\/event-change-requests\/[^/]+\/(?:approve|reject)$/, ['suppliers.manage']],
  [/^POST \/api\/admin\/event-change-requests\/[^/]+\/apply$/, ['suppliers.manage', 'catalog.edit']],
  [/^POST \/api\/admin\/reviews\/[^/]+\/(?:approve|reject|hide)$/, ['content.publish']],
];

const multiPermissionPolicies = new Map([
  ['GET /api/admin/buyers', ['orders.read', 'orders.pii.read']],
]);

/** Returns null for unmapped/sensitive routes; callers must deny those by default. */
export function getAdminRoutePermissions(method, pathname, context = {}) {
  const route = `${String(method || '').toUpperCase()} ${String(pathname || '')}`;
  if (route === 'POST /api/admin/articles' || /^PATCH \/api\/admin\/articles\/[^/]+$/.test(route)) {
    return getAdminArticleSavePermissions({
      ...context.body,
      existingStatus: context.existingArticle?.status,
      existingIsFeatured: context.existingArticle?.isFeatured,
    });
  }
  if (/^PATCH \/api\/admin\/events\/[^/]+\/override$/.test(route)) {
    return getAdminEventOverridePermissions(Object.keys(context.body || {}));
  }
  const exact = exactPolicies.get(route) || multiPermissionPolicies.get(route);
  if (exact) return exact;

  for (const [pattern, permissions] of dynamicPolicies) {
    if (pattern.test(route)) return permissions;
  }

  return null;
}

export function adminRolesAllowRoute(roles, method, pathname, context) {
  const requiredPermissions = getAdminRoutePermissions(method, pathname, context);
  if (!requiredPermissions) return false;
  return requiredPermissions.every((permission) => adminRoleAllows(roles, permission));
}

const eventOverrideFieldPermissions = Object.freeze({
  title: 'content.edit',
  description: 'content.edit',
  shortDescription: 'content.edit',
  mergeGroupKey: 'content.edit',
  imageUrl: 'catalog.edit',
  seoH1: 'seo.edit',
  seoTitle: 'seo.edit',
  seoDescription: 'seo.edit',
  canonicalPath: 'seo.edit',
  isIndexable: 'seo.edit',
  editorStatus: 'catalog.publish',
});

export function getAdminEventOverridePermissions(fieldNames) {
  const fields = Array.isArray(fieldNames) ? fieldNames : [];
  if (!fields.length) return null;
  const permissions = new Set();
  for (const field of fields) {
    if (!Object.hasOwn(eventOverrideFieldPermissions, field)) return null;
    permissions.add(eventOverrideFieldPermissions[field]);
  }
  return [...permissions];
}

export function getAdminArticleSavePermissions({ status, isFeatured, existingStatus, existingIsFeatured } = {}) {
  const permissions = ['content.edit'];
  const finalStatus = String(status || existingStatus || 'DRAFT').toUpperCase();
  if (
    finalStatus === 'PUBLISHED' ||
    String(existingStatus || '').toUpperCase() === 'PUBLISHED' ||
    isFeatured === true ||
    existingIsFeatured === true
  ) {
    permissions.push('content.publish');
  }
  return permissions;
}

export function adminRolesMayReadOrderPii(roles) {
  return adminRoleAllows(roles, 'orders.pii.read');
}
