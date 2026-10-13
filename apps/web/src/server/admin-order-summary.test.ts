import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeAdminOrders } from './admin-order-summary';
import type { AdminOrdersListData } from './admin-orders-data';

function source(total: number, confirmed: number, processing: number, problems: number, refunds: number): AdminOrdersListData {
  return {
    page: 1, pages: 1, limit: 1, total, rows: [], sources: [], statuses: [], errors: [],
    quickFilters: [
      { id: 'failed_integration', count: problems },
      { id: 'pending_refunds', count: refunds },
    ],
    metrics: { imported: total, confirmed, processing, needsAttention: problems },
  };
}

test('dashboard summary combines internal and external counts without duplicating a channel', () => {
  assert.deepEqual(summarizeAdminOrders(source(4, 2, 1, 1, 1), source(6, 5, 1, 2, 0)), {
    total: 10, internal: 4, external: 6, paid: 7, processing: 2, problems: 3, pendingRefunds: 1,
  });
});

test('dashboard summary is unavailable when either API fails', () => {
  const failed = { ...source(0, 0, 0, 0, 0), errors: ['finance unavailable'] };
  assert.equal(summarizeAdminOrders(failed, source(6, 5, 1, 0, 0)), null);
});
