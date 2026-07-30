import assert from 'node:assert/strict';
import test from 'node:test';

import { supplierQueryFallbackAllowed } from './supplier-auth-handler.js';

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
