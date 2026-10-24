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
  assert.deepEqual(getAdminRoutePermissions('POST', '/api/admin/orders/ord-1/archive'), ['orders.manage']);
  assert.deepEqual(getAdminRoutePermissions('POST', '/api/admin/orders/sync'), ['integrations.retry']);
});

test('PII list routes require both order and PII permissions', () => {
  assert.deepEqual(getAdminRoutePermissions('GET', '/api/admin/buyers'), ['orders.read', 'orders.pii.read']);
  assert.equal(adminRolesAllowRoute(['SUPPORT'], 'GET', '/api/admin/buyers'), true);
  assert.equal(adminRolesAllowRoute(['AUDITOR'], 'GET', '/api/admin/buyers'), false);
});

test('unknown or intentionally unmapped routes are denied by default', () => {
  assert.equal(getAdminRoutePermissions('GET', '/api/admin/dashboard'), null);
  assert.equal(getAdminRoutePermissions('DELETE', '/api/admin/orders/ord-1'), null);
  assert.equal(getAdminRoutePermissions('POST', '/api/admin/articles/1/publish'), null);
  assert.equal(getAdminRoutePermissions('PATCH', '/api/admin/events/evt-1/override'), null);
  assert.equal(adminRolesAllowRoute(['SUPERADMIN'], 'GET', '/api/admin/dashboard'), false);
  assert.equal(adminRolesAllowRoute(['SUPERADMIN'], 'PATCH', '/api/admin/events/1/unknown'), false);
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
  assert.equal(getAdminEventOverridePermissions(['unexpectedField']), null);
});

test('article publication adds publish permission to edit permission', () => {
  assert.deepEqual(getAdminArticleSavePermissions({ status: 'DRAFT' }), ['content.edit']);
  assert.deepEqual(getAdminArticleSavePermissions({ status: 'published' }), ['content.edit', 'content.publish']);
  assert.deepEqual(getAdminArticleSavePermissions({ isFeatured: true }), ['content.edit', 'content.publish']);
});

test('order data reading and PII visibility are separate decisions', () => {
  assert.equal(adminRolesAllowRoute(['AUDITOR'], 'GET', '/api/admin/orders'), false);
  assert.equal(adminRolesMayReadOrderPii(['AUDITOR']), false);
  assert.equal(adminRolesMayReadOrderPii(['FINANCE']), true);
});

test('role separation is enforced by API route policy', () => {
  assert.equal(adminRolesAllowRoute(['SUPPORT'], 'POST', '/api/admin/orders/ord-1/archive'), false);
  assert.equal(adminRolesAllowRoute(['FINANCE'], 'PATCH', '/api/admin/events/evt-1/moderation'), false);
  assert.equal(adminRolesAllowRoute(['COPYWRITER'], 'PATCH', '/api/admin/articles/a-1'), false);
});
