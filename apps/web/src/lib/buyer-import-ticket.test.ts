import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessImportTicket,
  mapBuyerOrderToImportTicketRecord,
  orderEventHasStarted,
  type BuyerOrderTicketSource,
} from './buyer-import-ticket.ts';

const richTc: BuyerOrderTicketSource = {
  number: '113184626',
  status: 'confirmed',
  displayStatus: 'подтвержден',
  statusTone: 'live',
  eventTitle: 'Открытый микрофон / 14 июля / 21:30',
  purchasedAt: '2026-07-13T15:39:00.000Z',
  amountRub: 110,
  ticketCount: 1,
  buyer: { name: 'Василий', email: 'v.***@yandex.ru' },
  tickets: [
    {
      number: 'KXM-494695',
      startsAt: '2026-07-14T18:30:00.000Z',
      eventId: 'evt_openmic',
      eventUrl: '/events/open-mic',
    },
  ],
};

test('assessImportTicket: rich TC row with code + title', () => {
  const a = assessImportTicket(richTc);
  assert.equal(a.richness, 'rich');
  assert.equal(a.ticketCode, 'KXM-494695');
  assert.equal(a.orderCode, '113184626');
});

test('assessImportTicket: sparse without title', () => {
  const a = assessImportTicket({ ...richTc, eventTitle: null, tickets: [{ number: 'KXM-1' }] });
  assert.equal(a.richness, 'sparse');
});

test('mapBuyerOrderToImportTicketRecord uses profile email + ticket code', () => {
  const row = mapBuyerOrderToImportTicketRecord(richTc, 'v.butin@yandex.ru');
  assert.ok(row);
  assert.equal(row!.publicCode, '113184626');
  assert.equal(row!.ticketNumber, 'KXM-494695');
  assert.equal(row!.email, 'v.butin@yandex.ru');
  assert.equal(row!.mode, 'WIDGET_IMPORT');
  assert.ok(row!.sessionStartsAt);
});

test('orderEventHasStarted: past vs future', () => {
  assert.equal(orderEventHasStarted(richTc, Date.parse('2026-08-08T08:00:00.000Z')), true);
  assert.equal(orderEventHasStarted(richTc, Date.parse('2026-07-01T08:00:00.000Z')), false);
  assert.equal(
    orderEventHasStarted({ ...richTc, tickets: [{ number: 'X' }] }, Date.now()),
    false,
  );
});
