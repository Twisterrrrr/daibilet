import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import {
  SUPPLIER_ACCESS_TOKEN_STORAGE_KEY,
  SUPPLIER_ACCESS_TOKEN_UPDATED_EVENT,
  supplierGet,
} from './api.ts';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

let storage;
let accessTokenEvents;

beforeEach(() => {
  storage = new Map();
  accessTokenEvents = 0;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: {
        hostname: 'supplier.daibilet.ru',
        origin: 'https://supplier.daibilet.ru',
      },
      localStorage: {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
      dispatchEvent: (event) => {
        if (event.type === SUPPLIER_ACCESS_TOKEN_UPDATED_EVENT) accessTokenEvents += 1;
        return true;
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  });
});

test('retries one supplier request after refreshing an expired access token', async () => {
  storage.set(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY, 'expired-token');
  let dashboardRequests = 0;
  let refreshRequests = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/api/user/auth/refresh')) {
      refreshRequests += 1;
      return Response.json({ accessToken: 'fresh-token' });
    }
    dashboardRequests += 1;
    const headers = new Headers(init?.headers);
    if (headers.get('authorization') === 'Bearer fresh-token') {
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'expired' }, { status: 401 });
  };

  const result = await supplierGet('/api/supplier/dashboard', 'supplier-1');

  assert.equal(result.ok, true);
  assert.equal(dashboardRequests, 2);
  assert.equal(refreshRequests, 1);
  assert.equal(storage.get(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY), 'fresh-token');
  assert.equal(accessTokenEvents, 1);
});

test('concurrent 401 responses share one refresh request', async () => {
  storage.set(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY, 'expired-token');
  let refreshRequests = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith('/api/user/auth/refresh')) {
      refreshRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({ accessToken: 'fresh-token' });
    }
    const headers = new Headers(init?.headers);
    if (headers.get('authorization') === 'Bearer fresh-token') {
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'expired' }, { status: 401 });
  };

  const [dashboard, orders] = await Promise.all([
    supplierGet('/api/supplier/dashboard', 'supplier-1'),
    supplierGet('/api/supplier/orders', 'supplier-1'),
  ]);

  assert.equal(dashboard.ok, true);
  assert.equal(orders.ok, true);
  assert.equal(refreshRequests, 1);
});

test('clears the expired access token when refresh is rejected', async () => {
  storage.set(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY, 'expired-token');

  globalThis.fetch = async (input) => {
    if (String(input).endsWith('/api/user/auth/refresh')) {
      return Response.json({ accessToken: null }, { status: 401 });
    }
    return Response.json({ error: 'expired' }, { status: 401 });
  };

  await assert.rejects(
    () => supplierGet('/api/supplier/dashboard', 'supplier-1'),
    /expired/,
  );
  assert.equal(storage.has(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY), false);
  assert.equal(accessTokenEvents, 1);
});
