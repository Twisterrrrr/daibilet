import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { applyApprovedEventChangeRequest } from './event-change-request-applier.js';
import { createSupplierEventChangeRequest } from './supplier-change-requests-handler.js';
import { reviewEventChangeRequest } from './event-change-request-review.js';

test('approved supplier event proposal creates one linked review event', async (t) => {
  if (process.env.RUN_DB_EVENT_CREATE_TEST !== '1') return t.skip('explicit local DB opt-in required');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const supplier = await prisma.supplier.create({ data: { slug: `event-proposal-${suffix}`, title: 'Event proposal test', status: 'ACTIVE' } });
  let eventId: string | null = null;
  try {
    const submitted = await createSupplierEventChangeRequest(new URLSearchParams({ supplierId: supplier.id }), {
      event: { title: 'Тестовый вечер', kind: 'OPEN_DATE', shortDescription: 'Описание тестового вечера' },
      schedule: { mode: 'OPEN_DATE', openDate: { validDays: 30 } },
      offers: [
        { title: 'Взрослый', priceRub: 500 },
        { title: 'Льготный', priceRub: 350 },
      ],
    });
    const requestId = submitted.request.id;
    await reviewEventChangeRequest({ requestId, action: 'approve' });
    const first = await applyApprovedEventChangeRequest({ requestId });
    eventId = first.eventId || null;
    assert.ok(eventId);
    const second = await applyApprovedEventChangeRequest({ requestId });
    assert.equal(second.eventId, eventId);
    const event = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { supplierLinks: true, offers: true, changeLogs: true },
    });
    assert.equal(event.status, 'REVIEW');
    assert.equal(event.openDateValidDays, 30);
    assert.equal(event.priceFromRub, 350);
    assert.equal(event.supplierLinks.length, 1);
    assert.equal(event.offers.length, 2);
    assert.equal(event.changeLogs.length, 1);
  } finally {
    if (eventId) {
      await prisma.eventOffer.deleteMany({ where: { eventId } });
      await prisma.eventSession.deleteMany({ where: { eventId } });
      await prisma.eventChangeLog.deleteMany({ where: { eventId } });
      await prisma.eventOverride.deleteMany({ where: { eventId } });
      await prisma.supplierEvent.deleteMany({ where: { eventId } });
    }
    await prisma.eventChangeRequest.deleteMany({ where: { supplierId: supplier.id } });
    if (eventId) await prisma.event.deleteMany({ where: { id: eventId } });
    await prisma.supplier.delete({ where: { id: supplier.id } });
  }
});
