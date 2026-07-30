import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSupplierIntegrationPolicy } from './supplier-integration-mode.js';

test('keeps imported ticketing-system suppliers read-only', () => {
  assert.deepEqual(resolveSupplierIntegrationPolicy('IMPORTED_TICKETING_SYSTEM'), {
    mode: 'IMPORTED_TICKETING_SYSTEM',
    catalogOwnership: 'source',
    supplierCatalogAccess: 'read_only',
    canSupplierEditEvents: false,
    canSupplierManageAdmissions: false,
    canConfigureApiRoutes: false,
  });
});

test('allows internal-sales suppliers to manage Daibilet-owned catalog', () => {
  const policy = resolveSupplierIntegrationPolicy('INTERNAL_SALES');

  assert.equal(policy.catalogOwnership, 'daibilet');
  assert.equal(policy.supplierCatalogAccess, 'editable');
  assert.equal(policy.canSupplierEditEvents, true);
  assert.equal(policy.canSupplierManageAdmissions, true);
  assert.equal(policy.canConfigureApiRoutes, false);
});

test('treats API sync suppliers as route-configurable but not manually editable', () => {
  const policy = resolveSupplierIntegrationPolicy('API_SYNC');

  assert.equal(policy.catalogOwnership, 'partner_api');
  assert.equal(policy.supplierCatalogAccess, 'api_configurable');
  assert.equal(policy.canSupplierEditEvents, false);
  assert.equal(policy.canSupplierManageAdmissions, false);
  assert.equal(policy.canConfigureApiRoutes, true);
});
