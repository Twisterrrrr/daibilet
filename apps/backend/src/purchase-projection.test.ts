import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import type { Prisma } from '@daibilet/db';
import {
  buildAdminPurchaseDetailDto,
  applySupplierCheckoutItemStatusFilter,
  buildAdminPurchasesListDto,
  buildBuyerPurchasesListDto,
  buildPublicCheckoutOrderByCodeDto,
  buildPublicCheckoutPurchasesByEmailDto,
  createAdminPurchaseRefundRequest,
  loadSupplierCheckoutPurchaseRows,
} from './purchase-projection.js';

test('supplier order status filter maps PENDING_PAYMENT to order relation', () => {
  const pending: Prisma.CheckoutItemWhereInput = { supplierId: 'sup_1' };
  applySupplierCheckoutItemStatusFilter(pending, 'PENDING_PAYMENT');
  assert.deepEqual(pending.order, { status: 'PENDING_PAYMENT' });
  assert.equal(pending.status, undefined);

  const reserved: Prisma.CheckoutItemWhereInput = { supplierId: 'sup_1' };
  applySupplierCheckoutItemStatusFilter(reserved, 'RESERVED');
  assert.equal(reserved.status, 'RESERVED');
  assert.equal(reserved.order, undefined);

  const confirmed: Prisma.CheckoutItemWhereInput = { supplierId: 'sup_1' };
  applySupplierCheckoutItemStatusFilter(confirmed, 'CONFIRMED');
  assert.deepEqual(confirmed.order, { status: 'CONFIRMED' });
});

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
    fulfillment: `fulfillment_${suffix}`,
    ledgerSale: `ledger_sale_${suffix}`,
    ledgerCommission: `ledger_commission_${suffix}`,
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
        address: 'Projection street, 10',
        latitude: 55.75,
        longitude: 37.61,
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
        phone: '+7 999 000-00-00',
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
        validityMode: 'OPEN_DATE',
        validTo: new Date('2026-12-31T20:59:59.000Z'),
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
    await prisma.fulfillmentItem.create({
      data: {
        id: ids.fulfillment,
        checkoutOrderId: ids.order,
        checkoutItemId: ids.item,
        lineItemIndex: 0,
        admissionOfferId: ids.offer,
        purchaseFlow: 'PLATFORM',
        provider: 'INTERNAL',
        status: 'CONFIRMED',
        amountKopecks: 90_000,
        providerData: {
          mode: 'YOOKASSA',
          publicCode: '9100001',
          ticketNumber: 'TKT-9100001-01',
          ticketNumbers: ['TKT-9100001-01'],
        },
      },
    });
    await prisma.supplierLedgerEntry.createMany({
      data: [
        {
          id: ids.ledgerSale,
          supplierId: ids.supplier,
          type: 'SALE',
          amountKopecks: 90_000,
          checkoutOrderId: ids.order,
          checkoutItemId: ids.item,
          paymentId: ids.payment,
          referenceType: 'checkout_order',
          referenceId: ids.order,
        },
        {
          id: ids.ledgerCommission,
          supplierId: ids.supplier,
          type: 'COMMISSION',
          amountKopecks: -9_000,
          checkoutOrderId: ids.order,
          checkoutItemId: ids.item,
          paymentId: ids.payment,
          referenceType: 'checkout_order',
          referenceId: ids.order,
        },
      ],
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

    const adminDetail = await buildAdminPurchaseDetailDto('9100001');
    assert.equal(adminDetail?.sourceKind, 'internal');
    assert.equal(adminDetail?.finance?.payments[0]?.status, 'SUCCEEDED');
    assert.equal(adminDetail?.finance?.fulfillment[0]?.ticketNumbers[0], 'TKT-9100001-01');
    assert.equal(adminDetail?.finance?.ledger.length, 2);
    assert.equal(adminDetail?.finance?.totals.ledgerNetKopecks, 81_000);
    assert.equal(adminDetail?.finance?.operations.canRefund, true);
    assert.equal(adminDetail?.finance?.operations.canCloseSettlement, true);

    const refundedDetail = await createAdminPurchaseRefundRequest('9100001', {
      amountKopecks: 45_000,
      reason: 'USER_REQUEST',
      adminComment: 'test refund request',
    });
    assert.equal(refundedDetail.finance?.refunds.length, 1);
    assert.equal(refundedDetail.finance?.refunds[0]?.amountKopecks, 45_000);
    assert.equal(refundedDetail.finance?.operations.canRefund, false);
    await assert.rejects(
      () => createAdminPurchaseRefundRequest('9100001', { amountKopecks: 1_000, reason: 'OTHER' }),
      /refund_request_blocked/,
    );

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

    const publicOrder = await buildPublicCheckoutOrderByCodeDto('9100001');
    assert.equal(publicOrder?.publicCode, '9100001');
    assert.equal(publicOrder?.buyer.email, email);
    assert.equal(publicOrder?.venueTitle, 'Projection Museum');
    assert.equal(publicOrder?.venueAddress, 'Projection street, 10');
    assert.equal(publicOrder?.validityMode, 'OPEN_DATE');
    assert.equal(publicOrder?.validTo, '2026-12-31T20:59:59.000Z');
    assert.equal(publicOrder?.supplierSupportPhone, '+7 999 000-00-00');
    assert.equal(publicOrder?.ticketNumber, 'TKT-9100001-01');
    assert.deepEqual(publicOrder?.ticketNumbers, ['TKT-9100001-01']);
    assert.equal(publicOrder?.items[0]?.ticketTitle, 'Adult');
    assert.deepEqual(publicOrder?.items[0]?.ticketNumbers, ['TKT-9100001-01']);

    const publicPurchases = await buildPublicCheckoutPurchasesByEmailDto(new URLSearchParams({ email, limit: '10' }));
    assert.equal(publicPurchases.total, 1);
    assert.equal(publicPurchases.items[0]?.publicCode, '9100001');
  } finally {
    await prisma.externalTicket.deleteMany({ where: { id: ids.externalTicket } });
    await prisma.externalOrder.deleteMany({ where: { id: ids.externalOrder } });
    await prisma.refundRequest.deleteMany({ where: { checkoutOrderId: ids.order } });
    await prisma.supplierLedgerEntry.deleteMany({ where: { id: { in: [ids.ledgerSale, ids.ledgerCommission] } } });
    await prisma.fulfillmentItem.deleteMany({ where: { id: ids.fulfillment } });
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
