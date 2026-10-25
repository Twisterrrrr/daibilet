import assert from 'node:assert/strict';
import test from 'node:test';

import { adminRolesHavePermissions } from './admin-authorization';

test('server action permissions follow non-hierarchical staff profiles', () => {
  assert.equal(adminRolesHavePermissions(['COPYWRITER'], ['content.edit']), true);
  assert.equal(adminRolesHavePermissions(['COPYWRITER'], ['content.publish']), false);
  assert.equal(adminRolesHavePermissions(['FINANCE'], ['refunds.execute']), true);
  assert.equal(adminRolesHavePermissions(['FINANCE'], ['catalog.publish']), false);
  assert.equal(adminRolesHavePermissions(['AUDITOR'], ['orders.read']), true);
  assert.equal(adminRolesHavePermissions(['AUDITOR'], ['support.write']), false);
});

test('combined action checks require every permission and reject unknown roles', () => {
  assert.equal(adminRolesHavePermissions(['PRODUCT'], ['suppliers.manage', 'catalog.edit']), true);
  assert.equal(adminRolesHavePermissions(['PRODUCT'], ['suppliers.manage', 'refunds.execute']), false);
  assert.equal(adminRolesHavePermissions(['UNKNOWN'], ['catalog.read']), false);
});
