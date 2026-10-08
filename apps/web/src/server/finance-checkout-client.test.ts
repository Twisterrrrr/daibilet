import assert from 'node:assert/strict';
import test from 'node:test';
import { mapOrderFromFinancePayload } from './finance-checkout-client';

test('buyer DTO keeps issued ticket number separate from order code', () => {
  const order = mapOrderFromFinancePayload({ order: {
    publicCode: '4157776', status: 'CONFIRMED', ticketNumber: 'TKT-4157776-01',
    paidAt: '2026-10-02T19:46:37.000Z',
  } }, '', 'LOOKUP');
  assert.equal(order?.ticketNumber, 'TKT-4157776-01');
  assert.notEqual(order?.ticketNumber, order?.publicCode);
  assert.equal(order?.purchasedAt, '2026-10-02T19:46:37.000Z');
});

test('buyer DTO accepts the issued ticket list and does not invent a number', () => {
  const payload = { publicCode: '4157776', status: 'CONFIRMED', ticketNumbers: ['TKT-4157776-01'] };
  assert.equal(mapOrderFromFinancePayload(payload, '', 'LOOKUP')?.ticketNumber, 'TKT-4157776-01');
  assert.equal(mapOrderFromFinancePayload({ ...payload, ticketNumbers: [] }, '', 'LOOKUP')?.ticketNumber, null);
});
