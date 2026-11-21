import assert from 'node:assert/strict';
import test from 'node:test';
import net from 'node:net';
import { prisma } from '@daibilet/db';
import { enqueueBuyerTicketEmail, processDueBuyerTicketEmails } from './buyer-ticket-delivery';
import { sendBuyerTicketEmail } from './buyer-ticket-mail';

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

test('real SMTP transport recovers from a refused connection and delivers once', async () => {
  const code = String(1_000_000 + Math.floor(Math.random() * 9_000_000));
  const sockets = new Set<net.Socket>();
  let delivered = 0;
  const smtp = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.write('220 localhost ESMTP\r\n');
    let buffer = '';
    let data = false;
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') { data = false; delivered++; socket.write('250 queued\r\n'); }
        } else if (/^DATA$/i.test(line)) {
          data = true; socket.write('354 send message\r\n');
        } else if (/^QUIT$/i.test(line)) {
          socket.end('221 bye\r\n');
        } else {
          socket.write('250 localhost\r\n');
        }
      }
    });
  });
  await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  const port = (smtp.address() as net.AddressInfo).port;
  await new Promise<void>((resolve, reject) => smtp.close((error) => error ? reject(error) : resolve()));
  const start = new Date();
  const deps = {
    code,
    lookup: async () => ({ publicCode: code, status: 'CONFIRMED', title: 'Test ticket' }) as any,
    send: (payload: Parameters<typeof sendBuyerTicketEmail>[0]) => sendBuyerTicketEmail(payload, {
      NODE_ENV: 'test', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port), SMTP_FROM: 'sender@example.test',
    }),
  };
  try {
    await enqueueBuyerTicketEmail(code, 'buyer@example.test');
    await processDueBuyerTicketEmails(1, { ...deps, now: new Date(start.getTime() + 60_000) });
    assert.equal((await prisma.buyerTicketEmailDelivery.findUniqueOrThrow({ where: { publicCode: code } })).status, 'RETRY');
    await new Promise<void>((resolve) => smtp.listen(port, '127.0.0.1', resolve));
    await processDueBuyerTicketEmails(1, { ...deps, now: new Date(start.getTime() + 5 * 60_000) });
    assert.equal((await prisma.buyerTicketEmailDelivery.findUniqueOrThrow({ where: { publicCode: code } })).status, 'SENT');
    await processDueBuyerTicketEmails(1, { ...deps, now: new Date(start.getTime() + 10 * 60_000) });
    assert.equal(delivered, 1);
  } finally {
    for (const socket of sockets) socket.destroy();
    if (smtp.listening) await new Promise<void>((resolve) => smtp.close(() => resolve()));
    await prisma.buyerTicketEmailDelivery.deleteMany({ where: { publicCode: code } });
  }
});
