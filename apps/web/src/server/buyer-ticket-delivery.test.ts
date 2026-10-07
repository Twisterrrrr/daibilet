import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { enqueueBuyerTicketEmail, processDueBuyerTicketEmails } from './buyer-ticket-delivery';

test('SMTP outage is retried after recovery without another payment or webhook', async () => {
  const code = String(1_000_000 + Math.floor(Math.random() * 9_000_000));
  const start = new Date();
  let sends = 0;
  try {
    await enqueueBuyerTicketEmail(code, 'buyer@example.test');
    const pending = await processDueBuyerTicketEmails(100, {
      now: new Date(start.getTime() + 60_000),
      lookup: async () => ({ publicCode: code, status: 'PENDING_PAYMENT' }) as any,
      send: async () => { sends++; return { sent: true }; },
    });
    assert.equal(pending.find((row) => row.publicCode === code)?.status, 'PENDING');
    assert.equal(sends, 0);
    const failed = await processDueBuyerTicketEmails(100, {
      now: new Date(start.getTime() + 7 * 60_000),
      lookup: async () => ({ publicCode: code, email: 'buyer@example.test', status: 'CONFIRMED', title: 'Билет', amountRub: 700, mode: 'YOOKASSA' }) as any,
      send: async () => { sends++; return { sent: false, reason: 'smtp_error' }; },
    });
    assert.equal(failed.find((row) => row.publicCode === code)?.status, 'RETRY');
    const retry = await prisma.buyerTicketEmailDelivery.findUniqueOrThrow({ where: { publicCode: code } });
    assert.equal(retry.attempts, 1);
    const recovered = await processDueBuyerTicketEmails(100, {
      now: new Date(start.getTime() + 20 * 60_000),
      lookup: async () => ({ publicCode: code, email: 'buyer@example.test', status: 'CONFIRMED', title: 'Билет', amountRub: 700, mode: 'YOOKASSA' }) as any,
      send: async () => { sends++; return { sent: true }; },
    });
    assert.equal(recovered.find((row) => row.publicCode === code)?.status, 'SENT');
    assert.equal(sends, 2);
    await enqueueBuyerTicketEmail(code, 'buyer@example.test');
    assert.equal((await prisma.buyerTicketEmailDelivery.findUniqueOrThrow({ where: { publicCode: code } })).status, 'SENT');
  } finally {
    await prisma.buyerTicketEmailDelivery.deleteMany({ where: { publicCode: code } });
  }
});
