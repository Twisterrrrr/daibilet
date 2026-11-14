import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeAdminOrderPage } from './admin-order-merge';
import type { AdminOrderListRow } from './admin-orders-data';

function row(id: string, sourceKind: 'internal' | 'external', date: string): AdminOrderListRow {
  return {
    id, sourceKind, purchasedAt: date, externalOrderId: id, publicCode: id,
    status: 'CONFIRMED', displayStatus: 'Оплачен', sourceCode: sourceKind,
    sourceName: sourceKind, buyerName: null, buyerEmail: null, eventTitle: null,
    ticketCount: 1, unlinkedTickets: 0, amountRub: 100, needsAttention: false,
    problems: [], isArchived: false,
  };
}

test('merged order pagination preserves global newest-first order across both APIs', () => {
  const internal = [
    row('i4', 'internal', '2026-10-13T12:00:00Z'),
    row('i2', 'internal', '2026-10-13T10:00:00Z'),
  ];
  const external = [
    row('e3', 'external', '2026-10-13T11:00:00Z'),
    row('e1', 'external', '2026-10-13T09:00:00Z'),
  ];
  assert.deepEqual(mergeAdminOrderPage(internal, external, 1, 2).map((item) => item.id), ['i4', 'e3']);
  assert.deepEqual(mergeAdminOrderPage(internal, external, 2, 2).map((item) => item.id), ['i2', 'e1']);
});
