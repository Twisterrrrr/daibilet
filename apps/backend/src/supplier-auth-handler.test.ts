import assert from 'node:assert/strict';
import test from 'node:test';

import {
  supplierCheckoutSmokeAllowed,
  supplierPortalRoleAllowsRequest,
  supplierQueryFallbackAllowed,
} from './supplier-auth-handler.js';

test('supplier query fallback is dev-only by default', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFallback = process.env.DAIBILET_SUPPLIER_QUERY_FALLBACK;

  try {
    delete process.env.DAIBILET_SUPPLIER_QUERY_FALLBACK;
    process.env.NODE_ENV = 'development';
    assert.equal(supplierQueryFallbackAllowed(), true);

    process.env.NODE_ENV = 'production';
    assert.equal(supplierQueryFallbackAllowed(), false);

    process.env.DAIBILET_SUPPLIER_QUERY_FALLBACK = '1';
    assert.equal(supplierQueryFallbackAllowed(), true);
  } finally {
    if (originalNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalFallback == null) delete process.env.DAIBILET_SUPPLIER_QUERY_FALLBACK;
    else process.env.DAIBILET_SUPPLIER_QUERY_FALLBACK = originalFallback;
  }
});

test('supplier checkout smoke routes fail closed in production', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSmokeFlag = process.env.DAIBILET_SUPPLIER_CHECKOUT_SMOKE;

  try {
    delete process.env.DAIBILET_SUPPLIER_CHECKOUT_SMOKE;
    process.env.NODE_ENV = 'production';
    assert.equal(supplierCheckoutSmokeAllowed(), false);

    process.env.DAIBILET_SUPPLIER_CHECKOUT_SMOKE = '1';
    assert.equal(supplierCheckoutSmokeAllowed(), true);

    delete process.env.DAIBILET_SUPPLIER_CHECKOUT_SMOKE;
    process.env.NODE_ENV = 'development';
    assert.equal(supplierCheckoutSmokeAllowed(), true);
  } finally {
    if (originalNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;

    if (originalSmokeFlag == null) delete process.env.DAIBILET_SUPPLIER_CHECKOUT_SMOKE;
    else process.env.DAIBILET_SUPPLIER_CHECKOUT_SMOKE = originalSmokeFlag;
  }
});

test('supplier portal write access follows role responsibilities', () => {
  const profilePath = '/api/supplier/profile/bank-account';
  const requestPath = '/api/supplier/change-requests/admissions';
  const smokePath = '/api/supplier/admissions/adp_1/yookassa-purchase';

  for (const role of ['OWNER', 'ADMIN']) {
    assert.equal(supplierPortalRoleAllowsRequest(role, 'PATCH', profilePath), true);
    assert.equal(supplierPortalRoleAllowsRequest(role, 'POST', requestPath), true);
  }

  assert.equal(supplierPortalRoleAllowsRequest('ACCOUNTANT', 'PATCH', profilePath), true);
  assert.equal(supplierPortalRoleAllowsRequest('ACCOUNTANT', 'POST', requestPath), false);
  assert.equal(supplierPortalRoleAllowsRequest('OPERATOR', 'POST', requestPath), true);
  assert.equal(supplierPortalRoleAllowsRequest('OPERATOR', 'POST', smokePath), false);
  assert.equal(supplierPortalRoleAllowsRequest('OPERATOR', 'PATCH', profilePath), false);
  assert.equal(supplierPortalRoleAllowsRequest('VIEWER', 'POST', requestPath), false);
  assert.equal(supplierPortalRoleAllowsRequest('VIEWER', 'GET', '/api/supplier/orders'), true);
  assert.equal(supplierPortalRoleAllowsRequest('UNKNOWN', 'PATCH', profilePath), false);
});
