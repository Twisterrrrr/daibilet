import assert from 'node:assert/strict';
import test from 'node:test';

import { ADMIN_PERMISSIONS, ADMIN_ROLES, ADMIN_ROLE_PERMISSIONS, adminRoleAllows } from '@daibilet/contracts/admin-access';

test('every staff profile uses known permissions and all profiles are present', () => {
  const known = new Set<string>(ADMIN_PERMISSIONS);
  assert.deepEqual(Object.keys(ADMIN_ROLE_PERMISSIONS).sort(), [...ADMIN_ROLES].sort());
  for (const granted of Object.values(ADMIN_ROLE_PERMISSIONS)) {
    assert.equal(granted.every((permission) => known.has(permission)), true);
  }
});

test('finance and content profiles do not inherit each other’s write access', () => {
  assert.equal(adminRoleAllows(['COPYWRITER'], 'refunds.execute'), false);
  assert.equal(adminRoleAllows(['COPYWRITER'], 'orders.pii.read'), false);
  assert.equal(adminRoleAllows(['FINANCE'], 'content.publish'), false);
  assert.equal(adminRoleAllows(['INTEGRATIONS'], 'suppliers.bank.read'), false);
  assert.equal(adminRoleAllows(['PRODUCT'], 'finance.summary.read'), true);
  assert.equal(adminRoleAllows(['PRODUCT'], 'finance.read'), false);
  assert.equal(adminRoleAllows(['SUPPORT'], 'refunds.request'), true);
  assert.equal(adminRoleAllows(['SUPPORT'], 'refunds.execute'), false);
});

test('profiles compose without an implicit role hierarchy', () => {
  assert.equal(adminRoleAllows(['SEO', 'SUPPORT'], 'seo.edit'), true);
  assert.equal(adminRoleAllows(['SEO', 'SUPPORT'], 'support.write'), true);
  assert.equal(adminRoleAllows(['SEO', 'SUPPORT'], 'payouts.approve'), false);
  assert.equal(adminRoleAllows([], 'orders.read'), false);
});
