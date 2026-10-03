import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogClientFetchTimeoutMs } from './catalog-client-fetch.js';

test('catalog fetch budgets allow cold 50, 100, and 200 item responses', () => {
  assert.equal(catalogClientFetchTimeoutMs(), 12_000);
  assert.equal(catalogClientFetchTimeoutMs(50), 12_000);
  assert.equal(catalogClientFetchTimeoutMs(100), 25_000);
  assert.equal(catalogClientFetchTimeoutMs(200), 40_000);
});
