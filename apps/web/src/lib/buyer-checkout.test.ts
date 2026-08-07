import assert from 'node:assert/strict';
import test from 'node:test';

import {
  amountRubFromKopecks,
  filterInternalOrdersForEmail,
  mapFinanceOrderStatus,
  normalizeBuyerEmail,
} from './buyer-checkout.ts';

test('mapFinanceOrderStatus: human labels', () => {
  assert.equal(mapFinanceOrderStatus('CONFIRMED').displayStatus, 'Оплачен');
  assert.equal(mapFinanceOrderStatus('PENDING').statusTone, 'incomplete');
  assert.equal(mapFinanceOrderStatus('CANCELED').statusTone, 'archived');
});

test('amountRubFromKopecks', () => {
  assert.equal(amountRubFromKopecks(70000), 700);
  assert.equal(amountRubFromKopecks(null), null);
});

test('filterInternalOrdersForEmail', () => {
  const rows = [
    {
      publicCode: '1',
      status: 'CONFIRMED',
      displayStatus: 'Оплачен',
      statusTone: 'live',
      title: 'A',
      email: 'Buyer@Daibilet.ru',
      purchasedAt: null,
      amountRub: 100,
      mode: 'STUB',
      source: 'internal' as const,
    },
    {
      publicCode: '2',
      status: 'PENDING',
      displayStatus: 'Ожидает оплаты',
      statusTone: 'incomplete',
      title: 'B',
      email: 'other@daibilet.ru',
      purchasedAt: null,
      amountRub: null,
      mode: 'STUB',
      source: 'internal' as const,
    },
  ];
  assert.equal(normalizeBuyerEmail(' Buyer@Daibilet.ru '), 'buyer@daibilet.ru');
  assert.equal(filterInternalOrdersForEmail(rows, 'buyer@daibilet.ru').length, 1);
});
