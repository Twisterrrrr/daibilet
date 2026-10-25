import assert from 'node:assert/strict';
import test from 'node:test';

import { adminPageAllowsPermissions, adminPageAllowsSession, getAdminPageAccess } from './admin-page-policy.ts';

test('admin page policy grants only the needed role scopes and denies unknown pages', () => {
  const orders = getAdminPageAccess('/admin/orders/internal/8558943');
  assert.ok(orders);
  assert.equal(adminPageAllowsPermissions(orders, ['orders.read']), true);
  const buyers = getAdminPageAccess('/admin/buyers');
  assert.ok(buyers);
  assert.equal(adminPageAllowsPermissions(buyers, ['orders.read']), false);
  assert.equal(adminPageAllowsPermissions(buyers, ['orders.read', 'orders.pii.read']), true);
  assert.equal(getAdminPageAccess('/admin/unlisted-tool'), null);
});

test('dashboard requires any visible dashboard capability', () => {
  const dashboard = getAdminPageAccess('/admin');
  assert.ok(dashboard);
  assert.equal(adminPageAllowsPermissions(dashboard, ['finance.summary.read']), true);
  assert.equal(adminPageAllowsPermissions(dashboard, ['orders.export']), false);
});

test('page access is resolved against session permissions, including the MFA gate', () => {
  assert.equal(adminPageAllowsSession('/admin/orders', ['FINANCE']), true);
  assert.equal(adminPageAllowsSession('/admin/buyers', ['FINANCE']), true);
  assert.equal(adminPageAllowsSession('/admin/settings', ['FINANCE']), false);
  assert.equal(adminPageAllowsSession('/admin/unlisted-tool', ['SUPERADMIN'], true), false);
});
