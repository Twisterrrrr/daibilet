import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminRolesAllowRoute,
  adminRolesMayReadOrderPii,
  getAdminArticleSavePermissions,
  getAdminEventOverridePermissions,
  getAdminRoutePermissions,
} from './admin-rbac-policy.js';

test('read and mutation routes map to distinct permissions', () => {
  assert.deepEqual(getAdminRoutePermissions('GET', '/api/admin/events'), ['catalog.read']);
  assert.deepEqual(getAdminRoutePermissions('PATCH', '/api/admin/events/evt-1/moderation'), ['catalog.publish']);
  assert.deepEqual(getAdminRoutePermissions('POST', '/api/admin/events/evt-1/rewrite-description'), ['content.edit']);
  assert.deepEqual(getAdminRoutePermissions('POST', '/api/admin/orders/ord-1/archive'), ['orders.manage']);
  assert.deepEqual(getAdminRoutePermissions('POST', '/api/admin/orders/sync'), ['integrations.retry']);
  assert.deepEqual(getAdminRoutePermissions('PUT', '/api/admin/events/evt-1/venue-links'), ['catalog.edit']);
  assert.deepEqual(getAdminRoutePermissions('DELETE', '/api/admin/articles/article-1'), ['content.edit']);
});

test('PII list routes require both order and PII permissions', () => {
  assert.deepEqual(getAdminRoutePermissions('GET', '/api/admin/buyers'), ['orders.read', 'orders.pii.read']);
  assert.equal(adminRolesAllowRoute(['SUPPORT'], 'GET', '/api/admin/buyers'), true);
  assert.equal(adminRolesAllowRoute(['AUDITOR'], 'GET', '/api/admin/buyers'), false);
});

test('unknown or intentionally unmapped routes are denied by default', () => {
  assert.deepEqual(getAdminRoutePermissions('GET', '/api/admin/dashboard'), ['catalog.read']);
  assert.equal(getAdminRoutePermissions('DELETE', '/api/admin/orders/ord-1'), null);
  assert.equal(getAdminRoutePermissions('POST', '/api/admin/articles/1/publish'), null);
  assert.equal(getAdminRoutePermissions('PATCH', '/api/admin/events/evt-1/override'), null);
  assert.deepEqual(getAdminRoutePermissions('PATCH', '/api/admin/events/evt-1/override', { body: { description: 'text' } }), ['content.edit']);
  assert.equal(adminRolesAllowRoute(['SUPERADMIN'], 'GET', '/api/admin/dashboard'), true);
  assert.equal(adminRolesAllowRoute(['AUDITOR'], 'GET', '/api/admin/dashboard'), true);
  assert.equal(adminRolesAllowRoute(['PRODUCT'], 'GET', '/api/admin/dashboard'), true);
  assert.equal(adminRolesAllowRoute(['SUPERADMIN'], 'PATCH', '/api/admin/events/1/unknown'), false);
});

test('currently implemented backend admin routes are mapped or explicitly kept outside RBAC', () => {
  const routes = [
    ['GET', '/api/db/stats'], ['GET', '/api/db/events'],
    ['GET', '/api/admin/dashboard'], ['GET', '/api/admin/sources'],
    ['POST', '/api/admin/sources/ticketscloud/sync'], ['POST', '/api/v1/tc/sync'], ['POST', '/api/v1/tep/sync'],
    ['POST', '/api/admin/orders/sync'], ['POST', '/api/admin/orders/tep/sync'],
    ['POST', '/api/v1/tc/orders/sync'], ['POST', '/api/v1/tep/orders/sync'],
    ['GET', '/api/admin/events'], ['GET', '/api/admin/events/event-1'],
    ['GET', '/api/admin/order-event-candidates'], ['GET', '/api/admin/orders'],
    ['GET', '/api/admin/external-orders'], ['GET', '/api/admin/orders/order-1'],
    ['POST', '/api/admin/orders/archive'], ['POST', '/api/admin/orders/order-1/archive'],
    ['POST', '/api/admin/orders/order-1/unarchive'], ['POST', '/api/admin/orders/order-1/tickets'],
    ['GET', '/api/admin/buyers'], ['GET', '/api/admin/landings'],
    ['GET', '/api/admin/landings/slug-1'], ['GET', '/api/admin/landings/slug-1/candidates'],
    ['PATCH', '/api/admin/landings/slug-1'], ['PATCH', '/api/admin/landings/slug-1/matches/event-1'],
    ['GET', '/api/admin/cities'], ['GET', '/api/admin/cities/city-1'], ['PATCH', '/api/admin/cities/city-1'],
    ['GET', '/api/admin/venues'], ['GET', '/api/admin/venues/venue-1'], ['PATCH', '/api/admin/venues/venue-1'],
    ['GET', '/api/admin/pdp/variants'], ['GET', '/api/admin/pdp/venues/venue-1'], ['PUT', '/api/admin/pdp/events/event-1'],
    ['GET', '/api/admin/taxonomy'], ['GET', '/api/admin/articles'], ['GET', '/api/admin/articles/article-1'],
    ['POST', '/api/admin/articles'], ['PATCH', '/api/admin/articles/article-1'], ['DELETE', '/api/admin/articles/article-1'],
    ['GET', '/api/admin/reviews'], ['POST', '/api/admin/reviews/review-1/approve'],
    ['POST', '/api/admin/reviews/review-1/reject'], ['POST', '/api/admin/reviews/review-1/hide'],
    ['GET', '/api/admin/event-change-requests'], ['GET', '/api/admin/event-change-requests/request-1'],
    ['POST', '/api/admin/event-change-requests/request-1/approve'],
    ['POST', '/api/admin/event-change-requests/request-1/reject'],
    ['POST', '/api/admin/event-change-requests/request-1/apply'],
    ['PATCH', '/api/admin/events/event-1/override'], ['PATCH', '/api/admin/events/event-1/moderation'],
    ['PATCH', '/api/admin/events/event-1/taxonomy'], ['PATCH', '/api/admin/events/event-1/venue-links'],
    ['PUT', '/api/admin/events/event-1/venue-links'], ['POST', '/api/admin/events/event-1/venue-links:apply'],
    ['GET', '/api/admin/events/event-1/venue-link-suggestions'], ['POST', '/api/admin/events/event-1/rewrite-description'],
  ];
  for (const [method, path] of routes) {
    const policyContext = path === '/api/admin/articles'
      ? { body: { status: 'DRAFT' } }
      : path.startsWith('/api/admin/articles/') && method === 'PATCH'
        ? { body: { status: 'DRAFT' }, existingArticle: { status: 'DRAFT', isFeatured: false } }
        : path.endsWith('/override')
          ? { body: { description: 'text' } }
          : undefined;
    assert.ok(getAdminRoutePermissions(method, path, policyContext), `unmapped backend route: ${method} ${path}`);
  }
});

test('event override requires permissions based on every submitted field', () => {
  assert.deepEqual(getAdminEventOverridePermissions(['description']), ['content.edit']);
  assert.deepEqual(
    getAdminEventOverridePermissions(['seoTitle', 'imageUrl']),
    ['seo.edit', 'catalog.edit'],
  );
  assert.deepEqual(
    getAdminEventOverridePermissions(['description', 'editorStatus']),
    ['content.edit', 'catalog.publish'],
  );
  assert.equal(getAdminEventOverridePermissions([]), null);
  assert.equal(getAdminEventOverridePermissions(['unexpectedField']), null);
});

test('article publication adds publish permission to edit permission', () => {
  assert.deepEqual(getAdminArticleSavePermissions({ status: 'DRAFT' }), ['content.edit']);
  assert.deepEqual(getAdminArticleSavePermissions({ status: 'published' }), ['content.edit', 'content.publish']);
  assert.deepEqual(getAdminArticleSavePermissions({ isFeatured: true }), ['content.edit', 'content.publish']);
  assert.deepEqual(getAdminArticleSavePermissions({ status: 'DRAFT', existingStatus: 'PUBLISHED' }), ['content.edit', 'content.publish']);
  assert.deepEqual(getAdminArticleSavePermissions({ status: 'DRAFT', existingStatus: 'DRAFT' }), ['content.edit']);
});

test('order data reading and PII visibility are separate decisions', () => {
  assert.equal(adminRolesAllowRoute(['AUDITOR'], 'GET', '/api/admin/orders'), true);
  assert.deepEqual(getAdminRoutePermissions('GET', '/api/admin/orders/order-1'), ['orders.read']);
  assert.equal(adminRolesMayReadOrderPii(['AUDITOR']), false);
  assert.equal(adminRolesMayReadOrderPii(['FINANCE']), true);
});

test('role separation is enforced by API route policy', () => {
  assert.equal(adminRolesAllowRoute(['SUPPORT'], 'POST', '/api/admin/orders/ord-1/archive'), false);
  assert.equal(adminRolesAllowRoute(['FINANCE'], 'PATCH', '/api/admin/events/evt-1/moderation'), false);
  assert.equal(adminRolesAllowRoute(['COPYWRITER'], 'PATCH', '/api/admin/articles/a-1', {
    body: { title: 'draft', status: 'DRAFT' },
    existingArticle: { status: 'DRAFT', isFeatured: false },
  }), true);
  assert.equal(adminRolesAllowRoute(['COPYWRITER'], 'PATCH', '/api/admin/articles/a-1', {
    body: { title: 'live', status: 'PUBLISHED' },
    existingArticle: { status: 'DRAFT', isFeatured: false },
  }), false);
  assert.equal(adminRolesAllowRoute(['PRODUCT'], 'POST', '/api/admin/event-change-requests/r-1/apply'), true);
  assert.equal(adminRolesAllowRoute(['SUPPORT'], 'POST', '/api/admin/event-change-requests/r-1/apply'), false);
  assert.equal(adminRolesAllowRoute(['CATALOG_EDITOR'], 'PATCH', '/api/admin/events/e-1/override', { body: { description: 'copy' } }), true);
  assert.equal(adminRolesAllowRoute(['CATALOG_EDITOR'], 'PATCH', '/api/admin/events/e-1/override', { body: { seoTitle: 'seo' } }), false);
});
