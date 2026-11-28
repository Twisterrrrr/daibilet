import assert from 'node:assert/strict';
import test from 'node:test';

import { publicCatalogQuerySchema } from '@daibilet/contracts/schemas';

test('publicCatalogQuerySchema parses excludeLanding csv', () => {
  const parsed = publicCatalogQuerySchema.parse({
    city: 'perm',
    excludeLanding: 'standup,river-cruises',
  });
  assert.deepEqual(parsed.excludeLanding, ['standup', 'river-cruises']);
});

test('publicCatalogQuerySchema accepts repeated excludeLanding', () => {
  const parsed = publicCatalogQuerySchema.parse({
    excludeLanding: ['standup', 'bus-tours'],
  });
  assert.deepEqual(parsed.excludeLanding, ['standup', 'bus-tours']);
});
