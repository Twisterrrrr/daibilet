import assert from 'node:assert/strict';
import test from 'node:test';

import {
  amountRubFromKopecks,
  buildDemoBuyerTicketOrder,
  filterInternalOrdersForEmail,
  formatBuyerTicketWhen,
  formatTicketLineItem,
  formatTicketLineItemsCompact,
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

test('formatTicketLineItemsCompact joins categories', () => {
  assert.equal(
    formatTicketLineItemsCompact([
      { ticketTitle: 'Взрослый', quantity: 4 },
      { ticketTitle: 'Льготный', quantity: 2 },
      { ticketTitle: 'Детский', quantity: 1 },
    ]),
    'Взрослый × 4, Льготный × 2, Детский × 1',
  );
});

test('formatBuyerTicketWhen uses в before time', () => {
  const label = formatBuyerTicketWhen('2026-08-15T11:00:00.000Z');
  assert.ok(label);
  assert.match(label!, /в \d{2}:\d{2}/);
  assert.match(label!, /августа/);
});

test('buildDemoBuyerTicketOrder fills full card fixture', () => {
  const demo = buildDemoBuyerTicketOrder();
  assert.notEqual(demo.ticketNumber, demo.publicCode);
  assert.equal(demo.lineItems?.length, 3);
  assert.equal(formatTicketLineItem(demo.lineItems![0]), 'Взрослый - 4 чел');
  assert.equal(formatTicketLineItem(demo.lineItems![1]), 'Льготный - 2 чел');
  assert.equal(formatTicketLineItem(demo.lineItems![2]), 'Детский - 1 чел');
  assert.ok(demo.eventTitle);
  assert.ok(demo.venueTitle);
  assert.ok(demo.venueAddress);
  assert.ok(demo.buyerName);
  assert.ok(demo.sessionStartsAt);
  assert.ok(demo.purchasedAt);
  assert.ok(demo.supplierSupportPhone);
  assert.equal(demo.amountRub, 4700);
  assert.equal(demo.displayStatus, 'Оплачен');
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
