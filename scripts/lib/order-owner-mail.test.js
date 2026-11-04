import assert from 'node:assert/strict';
import test from 'node:test';

import { PAID_ORDER_STATUSES, buildOwnerOrderMail, sendOwnerOrderMail } from './order-owner-mail.js';

function paidOrder(overrides = {}) {
  return {
    externalOrderId: 'tc-123',
    publicCode: '127165552',
    status: 'done',
    purchasedAt: '2026-10-18T10:00:00.000Z',
    ticketCount: 2,
    sourceName: 'Ticketscloud',
    buyerSnapshot: {
      buyer: { name: 'Иванов Иван', email: 'buyer@example.com', phone: '+7 999 000-00-00' },
      code: '127165552',
      sourceEventTitle: 'Пять разводных мостов',
      payments: [{ status: 'succeeded', sum: 3080 }],
    },
    ...overrides,
  };
}

test('buildOwnerOrderMail renders order, buyer and event details', () => {
  const { subject, html, orderCode } = buildOwnerOrderMail(paidOrder());
  assert.equal(orderCode, '127165552');
  assert.match(subject, /№127165552/);
  assert.match(html, /Иванов Иван/);
  assert.match(html, /buyer@example\.com/);
  assert.match(html, /\+7 999 000-00-00/);
  assert.match(html, /Пять разводных мостов/);
  assert.match(html, /3\s?080/);
  assert.match(html, /2 шт\./);
});

test('buildOwnerOrderMail links the event page when slug is known', () => {
  const order = paidOrder({ eventSlug: 'pyat-razvodnyh-mostov' });
  const { html } = buildOwnerOrderMail(order);
  assert.match(html, /href="https:\/\/daibilet\.ru\/events\/pyat-razvodnyh-mostov"/);
  assert.match(html, /Страница события/);
});

test('buildOwnerOrderMail omits event link when the event is not linked', () => {
  const { html } = buildOwnerOrderMail(paidOrder());
  assert.ok(!html.includes('Страница события'));
  assert.ok(!html.includes('/events/'));
});

test('buildOwnerOrderMail escapes HTML in buyer-controlled fields', () => {
  const order = paidOrder({
    buyerSnapshot: {
      buyer: { name: '<script>alert(1)</script>', email: 'x@y.z', phone: '' },
      sourceEventTitle: 'Событие & Ко',
    },
  });
  const { html } = buildOwnerOrderMail(order);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Событие &amp; Ко/);
});

test('paid order statuses cover done/paid wording without created', () => {
  assert.ok(PAID_ORDER_STATUSES.has('done'));
  assert.ok(PAID_ORDER_STATUSES.has('paid'));
  assert.ok(!PAID_ORDER_STATUSES.has('created'));
  assert.ok(!PAID_ORDER_STATUSES.has('canceled'));
});

test('sendOwnerOrderMail skips gracefully without SMTP config', async () => {
  const result = await sendOwnerOrderMail(paidOrder(), { SMTP_HOST: '', SMTP_FROM: '' });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'smtp_not_configured');
});

test('sendOwnerOrderMail honors ORDER_NOTIFY_DISABLE', async () => {
  const result = await sendOwnerOrderMail(paidOrder(), {
    SMTP_HOST: 'smtp.example.com',
    SMTP_FROM: 'robot@daibilet.ru',
    ORDER_NOTIFY_DISABLE: '1',
  });
  assert.equal(result.sent, false);
  assert.equal(result.reason, 'disabled');
});
