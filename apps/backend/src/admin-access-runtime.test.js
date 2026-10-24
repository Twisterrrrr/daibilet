import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  adminRoleAllows,
  resolveAdminPermissions,
} from '@daibilet/contracts/admin-access/runtime';

test('runtime admin access contract covers the documented profiles', () => {
  assert.deepEqual(ADMIN_ROLES, [
    'SUPERADMIN', 'PRODUCT', 'SUPPORT', 'FINANCE', 'CATALOG_EDITOR', 'COPYWRITER', 'SEO', 'INTEGRATIONS', 'AUDITOR',
  ]);
  assert.ok(ADMIN_PERMISSIONS.includes('payouts.approve'));
});

test('role permissions remain additive and non-hierarchical', () => {
  assert.equal(adminRoleAllows(['SUPPORT'], 'refunds.request'), true);
  assert.equal(adminRoleAllows(['SUPPORT'], 'refunds.execute'), false);
  assert.equal(adminRoleAllows(['FINANCE'], 'catalog.publish'), false);
  assert.equal(adminRoleAllows(['AUDITOR'], 'orders.manage'), false);
  assert.equal(adminRoleAllows(['COPYWRITER'], 'finance.read'), false);
});

test('unknown or malformed roles cannot grant permissions or crash resolution', () => {
  assert.deepEqual([...resolveAdminPermissions(['toString', '__proto__', 'UNKNOWN'])], []);
  assert.deepEqual([...resolveAdminPermissions(null)], []);
});
