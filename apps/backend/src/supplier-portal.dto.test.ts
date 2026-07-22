import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapSupplierPortalOrderRow,
  resolveSupplierPortalEventIssues,
  summarizeSupplierPortal,
  summarizeSupplierPortalFinance,
} from './supplier-portal.dto.js';

test('marks supplier event readiness problems without write-side assumptions', () => {
  const issues = resolveSupplierPortalEventIssues({
    kind: 'RECURRING',
    imageUrl: null,
    nextSessionAt: null,
    offersCount: 0,
    hasPurchaseEntry: false,
    priceFromRub: 10,
  });

  assert.deepEqual(
    issues.map((issue) => issue.code),
    ['MISSING_IMAGE', 'MISSING_OFFER', 'NO_FUTURE_SESSIONS', 'MISSING_PURCHASE_ENTRY', 'PRICE_TOO_LOW'],
  );
});

test('does not require future sessions for open-date events', () => {
  const issues = resolveSupplierPortalEventIssues({
    kind: 'OPEN_DATE',
    imageUrl: 'https://cdn.example/event.jpg',
    nextSessionAt: null,
    offersCount: 1,
    hasPurchaseEntry: true,
    priceFromRub: 1200,
  });

  assert.deepEqual(issues, []);
});

test('summarizes supplier finance from ledger, payouts, refunds and disputes', () => {
  const summary = summarizeSupplierPortalFinance({
    ledgerGroups: [
      { type: 'SALE', _sum: { amountKopecks: 100_000 } },
      { type: 'COMMISSION', _sum: { amountKopecks: -12_000 } },
      { type: 'REFUND', _sum: { amountKopecks: -20_000 } },
      { type: 'PAYOUT', _sum: { amountKopecks: -50_000 } },
    ],
    payoutGroups: [
      { status: 'PENDING', _sum: { amountKopecks: 25_000 } },
      { status: 'PAID', _sum: { amountKopecks: 50_000 } },
    ],
    refundGroups: [
      { status: 'CREATED', _count: { _all: 1 } },
      { status: 'COMPLETED', _count: { _all: 3 } },
    ],
    disputeGroups: [
      { status: 'OPEN', _count: { _all: 2 } },
      { status: 'RESOLVED', _count: { _all: 1 } },
    ],
  });

  assert.equal(summary.ledgerBalanceKopecks, 18_000);
  assert.equal(summary.commissionKopecks, 12_000);
  assert.equal(summary.refundKopecks, 20_000);
  assert.equal(summary.payoutKopecks, 50_000);
  assert.equal(summary.pendingPayoutsKopecks, 25_000);
  assert.equal(summary.openRefundRequests, 1);
  assert.equal(summary.openDisputes, 2);
});

test('summarizes supplier control-plane aggregates', () => {
  const summary = summarizeSupplierPortal({
    eventGroups: [
      {
        status: 'PUBLISHED',
        purchaseFlow: 'PLATFORM',
        managementMode: 'DAIBILET_MANAGED',
        _count: { _all: 2 },
      },
      {
        status: 'READY',
        purchaseFlow: 'EXTERNAL',
        managementMode: 'SOURCE_MANAGED',
        _count: { _all: 1 },
      },
    ],
    supplierEventGroups: [
      {
        catalogMode: 'HYBRID',
        managementMode: 'DAIBILET_MANAGED',
        isActive: true,
        _count: { _all: 2 },
      },
      {
        catalogMode: 'WIDGET_ONLY',
        managementMode: 'SOURCE_MANAGED',
        isActive: true,
        _count: { _all: 1 },
      },
    ],
    orderGroups: [
      {
        status: 'FULFILLED',
        _count: { _all: 3 },
        _sum: { totalKopecks: 300_000, commissionKopecks: 36_000 },
      },
    ],
    ledgerGroups: [],
    payoutGroups: [],
    refundGroups: [],
    disputeGroups: [],
    reviewGroups: [
      { status: 'APPROVED', _count: { _all: 4 } },
      { status: 'PENDING_MODERATION', _count: { _all: 1 } },
    ],
    reviewAverage: 4.5,
    reviewsNeedingResponse: 2,
    reviewDisputes: 1,
  });

  assert.equal(summary.events.total, 3);
  assert.equal(summary.events.active, 3);
  assert.equal(summary.events.hybrid, 2);
  assert.equal(summary.events.widgetOnly, 1);
  assert.equal(summary.orders.fulfilled, 3);
  assert.equal(summary.reviews.approved, 4);
  assert.equal(summary.reviews.needsResponse, 2);
});

test('maps supplier order rows with short numeric fallback code', () => {
  const dto = mapSupplierPortalOrderRow({
    id: 'item_1',
    checkoutOrderId: 'order_1234567890',
    supplierId: 'sup_1',
    eventId: 'evt_1',
    sessionId: 'ses_1',
    offerId: 'off_1',
    externalTicketId: null,
    title: 'Adult ticket',
    ticketTitle: null,
    status: 'FULFILLED',
    quantity: 2,
    unitPriceKopecks: 150_000,
    totalKopecks: 300_000,
    commissionKopecks: 36_000,
    attendeeName: null,
    attendeePhone: null,
    providerPayload: null,
    issuedAt: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    order: {
      id: 'order_1234567890',
      publicCode: null,
      status: 'FULFILLED',
      buyerEmail: 'buyer@example.com',
      buyerPhone: '+79990000000',
      buyerName: 'Buyer',
      paidAt: new Date('2026-07-01T09:00:00.000Z'),
      createdAt: new Date('2026-07-01T08:00:00.000Z'),
    },
    event: { id: 'evt_1', slug: 'manual-event', title: 'Manual event' },
    session: { id: 'ses_1', startsAt: new Date('2026-08-01T12:00:00.000Z') },
    offer: { id: 'off_1', title: 'Adult' },
  } as any);

  assert.equal(dto.publicCode, '4567890');
  assert.equal(dto.status, 'FULFILLED');
  assert.equal(dto.ticketTitle, 'Adult');
  assert.equal(dto.totalKopecks, 300_000);
});
