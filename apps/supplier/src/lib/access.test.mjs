import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSupplierPortalRole, supplierPortalPermissions } from './access.ts';

const session = {
  user: { id: 'user-1', email: 'person@example.test', name: null, role: 'USER' },
  currentSupplier: { id: 'supplier-a', slug: 'supplier-a', title: 'A', status: 'ACTIVE', role: 'OWNER' },
  suppliers: [
    { id: 'supplier-a', slug: 'supplier-a', title: 'A', status: 'ACTIVE', role: 'OWNER' },
    { id: 'supplier-b', slug: 'second', title: 'B', status: 'ACTIVE', role: 'VIEWER' },
  ],
};

test('resolves role for the supplier selected in the portal', () => {
  assert.equal(resolveSupplierPortalRole(session, 'supplier-b'), 'VIEWER');
  assert.equal(resolveSupplierPortalRole(session, 'second'), 'VIEWER');
  assert.equal(resolveSupplierPortalRole(session, ''), 'OWNER');
});

test('mirrors backend role capabilities in the UI', () => {
  assert.deepEqual(supplierPortalPermissions('OWNER'), {
    role: 'OWNER',
    canSubmitRequests: true,
    canEditRequisites: true,
    canManageTeam: true,
  });
  assert.equal(supplierPortalPermissions('OPERATOR').canSubmitRequests, true);
  assert.equal(supplierPortalPermissions('OPERATOR').canEditRequisites, false);
  assert.equal(supplierPortalPermissions('ACCOUNTANT').canSubmitRequests, false);
  assert.equal(supplierPortalPermissions('ACCOUNTANT').canEditRequisites, true);
  assert.equal(supplierPortalPermissions('VIEWER').canManageTeam, false);
});
