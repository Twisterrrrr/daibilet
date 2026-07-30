import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import {
  buildAdminPurchasesListDto,
  buildBuyerPurchasesListDto,
  loadSupplierCheckoutPurchaseRows,
} from './purchase-projection.js';

test('projects internal checkout and external orders into admin, buyer and supplier reads', async () => {
  const suffix = `projection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `buyer-${suffix}@example.test`;
  const ids = {
    user: `usr_${suffix}`,
    supplier: `sup_${suffix}`,
    city: `city_${suffix}`,
    venue: `venue_${suffix}`,
    product: `admission_${suffix}`,
    offer: `admission_offer_${suffix}`,
    order: `checkout_${suffix}`,
    item: `checkout_item_${suffix}`,
    payment: `payment_${suffix}`,
    event: `event_${suffix}`,
    externalOrder: `external_order_${suffix}`,
    externalTicket: `external_ticket_${suffix}`,
  };

  try {
    await prisma.siteUser.create({
      data: {
        id: ids.user,
        email,
        passwordHash: 'test-hash',
        name: 'Projection Buyer',
      },
    });
    await prisma.city.create({
      data: {
        id: ids.city,
        slug: `city-${suffix}`,
        title: 'Projection City',
        isDestination: true,
      },
    });
    await prisma.venue.create({
      data: {
        id: ids.venue,
        slug: `venue-${suffix}`,
        title: 'Projection Museum',
        cityId: ids.city,
        kind: 'MUSEUM_ART_SPACE',
        pageStatus: 'PUBLISHED',
      },
    });
    await prisma.supplier.create({
      data: {
        id: ids.supplier,
        slug: `supplier-${suffix}`,
        title: 'Projection Supplier',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
        paymentMode: 'SINGLE_MERCHANT',
        defaultCommissionBps: 1000,
      },
    });
    await prisma.admissionProduct.create({
      data: {
        id: ids.product,
        slug: `admission-${suffix}`,
        title: 'Projection Admission',
        type: 'MUSEUM_ENTRY',
        status: 'PUBLISHED',
        purchaseFlow: 'PLATFORM',
        managementMode: 'DAIBILET_MANAGED',
        sourceCode: 'MANUAL',
        priceFromRub: 900,
        cityId: ids.city,
        venueId: ids.venue,
        supplierId: ids.supplier,
      },
    });
    await prisma.admissionOffer.create({
      data: {
        id: ids.offer,
        admissionProductId: ids.product,
        sourceCode: 'MANUAL',
        title: 'Adult',
        priceRub: 900,
        active: true,
      },
    });
    await prisma.checkoutOrder.create({
      data: {
        id: ids.order,
        publicCode: '9100001',
        siteUserId: ids.user,
        status: 'FULFILLED',
        subtotalKopecks: 90_000,
        totalKopecks: 90_000,
        commissionKopecks: 9_000,
        buyerEmail: email,
        buyerName: 'Projection Buyer',
        paidAt: new Date('2026-07-30T10:00:00.000Z'),
        confirmedAt: new Date('2026-07-30T10:01:00.000Z'),
      },
    });
    await prisma.checkoutItem.create({
      data: {
        id: ids.item,
        checkoutOrderId: ids.order,
        subjectType: 'VENUE_ADMISSION',
        supplierId: ids.supplier,
        admissionProductId: ids.product,
        admissionOfferId: ids.offer,
        title: 'Projection Admission',
        ticketTitle: 'Adult',
        status: 'FULFILLED',
        quantity: 1,
        unitPriceKopecks: 90_000,
        totalKopecks: 90_000,
        commissionKopecks: 9_000,
      },
    });
    await prisma.payment.create({
      data: {
        id: ids.payment,
        checkoutOrderId: ids.order,
        provider: 'MANUAL',
        status: 'SUCCEEDED',
        amountKopecks: 90_000,
        paidAt: new Date('2026-07-30T10:00:00.000Z'),
      },
    });

    const source = await prisma.source.upsert({
      where: { code: 'TICKETSCLOUD' },
      update: { enabled: true },
      create: { code: 'TICKETSCLOUD', name: 'Ticketscloud', enabled: true },
    });
    await prisma.event.create({
      data: {
        id: ids.event,
        slug: `external-event-${suffix}`,
        title: 'Projection External Event',
        kind: 'OPEN_DATE',
        status: 'PUBLISHED',
        purchaseFlow: 'EXTERNAL',
        managementMode: 'SOURCE_MANAGED',
        primaryCityId: ids.city,
        venueId: ids.venue,
      },
    });
    await prisma.externalOrder.create({
      data: {
        id: ids.externalOrder,
        sourceId: source.id,
        siteUserId: ids.user,
        externalOrderId: `tc-${suffix}`,
        publicCode: '9200001',
        status: 'paid',
        buyerEmailNormalized: email,
        buyerSnapshot: { email, name: 'Projection Buyer', amountRub: 500 },
        purchasedAt: new Date('2026-07-30T09:00:00.000Z'),
      },
    });
    await prisma.externalTicket.create({
      data: {
        id: ids.externalTicket,
        externalOrderId: ids.externalOrder,
        externalTicketId: `ticket-${suffix}`,
        status: 'issued',
        eventId: ids.event,
        origin: 'source',
      },
    });

    const admin = await buildAdminPurchasesListDto(new URLSearchParams({ q: email, limit: '10' }));
    assert.equal(admin.rows.some((row) => row.sourceKind === 'internal' && row.publicCode === '9100001'), true);
    assert.equal(admin.rows.some((row) => row.sourceKind === 'external' && row.publicCode === '9200001'), true);

    const buyer = await buildBuyerPurchasesListDto({
      siteUserId: ids.user,
      email,
      searchParams: new URLSearchParams({ limit: '10' }),
    });
    assert.equal(buyer.rows.some((row) => row.sourceKind === 'internal' && row.number === '9100001'), true);
    assert.equal(buyer.rows.some((row) => row.sourceKind === 'external' && row.number === '9200001'), true);

    const supplier = await loadSupplierCheckoutPurchaseRows(ids.supplier, new URLSearchParams({ limit: '10' }));
    assert.equal(supplier.total, 1);
    assert.equal(supplier.items[0]?.publicCode, '9100001');
    assert.equal(supplier.items[0]?.subjectType, 'VENUE_ADMISSION');
  } finally {
    await prisma.externalTicket.deleteMany({ where: { id: ids.externalTicket } });
    await prisma.externalOrder.deleteMany({ where: { id: ids.externalOrder } });
    await prisma.payment.deleteMany({ where: { id: ids.payment } });
    await prisma.checkoutItem.deleteMany({ where: { id: ids.item } });
    await prisma.checkoutOrder.deleteMany({ where: { id: ids.order } });
    await prisma.admissionOffer.deleteMany({ where: { id: ids.offer } });
    await prisma.admissionProduct.deleteMany({ where: { id: ids.product } });
    await prisma.event.deleteMany({ where: { id: ids.event } });
    await prisma.supplier.deleteMany({ where: { id: ids.supplier } });
    await prisma.venue.deleteMany({ where: { id: ids.venue } });
    await prisma.city.deleteMany({ where: { id: ids.city } });
    await prisma.siteUser.deleteMany({ where: { id: ids.user } });
  }
});
