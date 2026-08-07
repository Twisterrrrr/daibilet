import assert from 'node:assert/strict';
import test from 'node:test';

import {
  amountRubFromKopecks,
  filterInternalOrdersForEmail,
  formatTicketLineItem,
  isOpenDateOrder,
  mapFinanceOrderStatus,
  mergeBuyerInternalOrders,
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

test('formatTicketLineItem uses hyphen', () => {
  assert.equal(formatTicketLineItem({ ticketTitle: 'Взрослый', quantity: 4 }), 'Взрослый - 4 чел');
  assert.equal(formatTicketLineItem({ ticketTitle: 'Льготный', quantity: 2 }), 'Льготный - 2 чел');
});

test('isOpenDateOrder prefers validityMode and validUntil', () => {
  assert.equal(
    isOpenDateOrder({ validityMode: 'OPEN_DATE', validUntil: '2027-01-01', sessionStartsAt: null }),
    true,
  );
  assert.equal(
    isOpenDateOrder({
      validityMode: 'SESSION',
      validUntil: null,
      sessionStartsAt: '2026-08-08T12:00:00.000Z',
    }),
    false,
  );
});

test('mergeBuyerInternalOrders keeps richer cache fields', () => {
  const remote = {
    publicCode: '111',
    status: 'CONFIRMED',
    displayStatus: 'Оплачен',
    statusTone: 'live',
    title: 'Входной билет',
    email: 'a@b.ru',
    purchasedAt: '2026-08-07T12:00:00.000Z',
    amountRub: 700,
    mode: 'LOOKUP',
    source: 'internal' as const,
  };
  const cached = {
    ...remote,
    mode: 'STUB',
    buyerName: 'Иван Петров',
    venueTitle: 'Тестовый музей',
    venueAddress: 'Москва (тест)',
    validUntil: '2027-08-07T09:58:56.703Z',
    validityMode: 'OPEN_DATE',
    lineItems: [{ ticketTitle: 'Взрослый', quantity: 2 }],
  };
  const merged = mergeBuyerInternalOrders(remote, cached);
  assert.equal(merged.buyerName, 'Иван Петров');
  assert.equal(merged.venueAddress, 'Москва (тест)');
  assert.equal(merged.lineItems?.[0]?.quantity, 2);
  assert.equal(merged.amountRub, 700);
});
