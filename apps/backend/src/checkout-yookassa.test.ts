import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import {
  applyYooKassaWebhookPayload,
  buildYooKassaPaymentCreatePayload,
  classifyYooKassaReconcileAction,
  createYooKassaCheckoutOrder,
  formatKopecksForYooKassa,
  isYooKassaCheckoutError,
  isYooKassaCheckoutReady,
  mapYooKassaPaymentStatus,
  readYooKassaRuntimeConfig,
  reconcileExpiredYooKassaCheckouts,
  validateYooKassaCheckoutReadiness,
} from './checkout-yookassa.js';

const now = new Date('2026-07-30T12:00:00.000Z');

test('YooKassa checkout requires explicit feature flag and credentials', () => {
  const disabled = readYooKassaRuntimeConfig({
    NODE_ENV: 'production',
    YOOKASSA_SHOP_ID: 'shop_123',
    YOOKASSA_SECRET_KEY: 'test_secret',
  } as NodeJS.ProcessEnv);
  assert.equal(disabled.enabled, false);
  assert.equal(isYooKassaCheckoutReady(disabled), false);

  const enabled = readYooKassaRuntimeConfig({
    NODE_ENV: 'production',
    DAIBILET_YOOKASSA_CHECKOUT: '1',
    YOOKASSA_SHOP_ID: 'shop_123',
    YOOKASSA_SECRET_KEY: 'test_secret',
    PUBLIC_SITE_URL: 'https://daibilet.ru/',
  } as NodeJS.ProcessEnv);
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.returnBaseUrl, 'https://daibilet.ru');
  assert.equal(isYooKassaCheckoutReady(enabled), true);
});

test('formats kopecks for YooKassa amount.value', () => {
  assert.equal(formatKopecksForYooKassa(70000), '700.00');
  assert.equal(formatKopecksForYooKassa(123456), '1234.56');
  assert.equal(formatKopecksForYooKassa(-10), '0.00');
});

test('requires idempotency key before touching checkout data', async () => {
  await assert.rejects(
    () => createYooKassaCheckoutOrder({
      eventSlug: 'manual-event',
      offerId: 'offer_1',
      quantity: 1,
      buyer: {
        email: 'buyer@daibilet.ru',
        name: null,
        phone: null,
      },
    }, {
      config: readYooKassaRuntimeConfig({
        NODE_ENV: 'test',
        DAIBILET_YOOKASSA_CHECKOUT: '1',
        YOOKASSA_SHOP_ID: 'shop_123',
        YOOKASSA_SECRET_KEY: 'test_secret',
      } as NodeJS.ProcessEnv),
    }),
    (error: unknown) => isYooKassaCheckoutError(error) && error.code === 'IDEMPOTENCY_REQUIRED',
  );
});

test('builds redirect payment payload without leaking internal raw objects', () => {
  const payload = buildYooKassaPaymentCreatePayload({
    order: {
      id: 'order_1',
      publicCode: '1234567',
      buyerEmail: 'buyer@daibilet.ru',
      buyerPhone: '+79990000000',
    },
    event: {
      id: 'evt_1',
      slug: 'manual-event',
      title: 'Manual event',
    },
    offer: {
      id: 'offer_1',
      title: 'Adult',
    },
    session: null,
    totals: {
      currency: 'RUB',
      unitPriceKopecks: 70000,
      subtotalKopecks: 70000,
      discountKopecks: 0,
      totalKopecks: 70000,
      commissionKopecks: 7000,
      netKopecks: 63000,
    },
    returnUrl: 'https://daibilet.ru/purchases/1234567?payment=yookassa',
  });

  assert.deepEqual(payload.amount, { value: '700.00', currency: 'RUB' });
  assert.deepEqual(payload.confirmation, {
    type: 'redirect',
    return_url: 'https://daibilet.ru/purchases/1234567?payment=yookassa',
  });
  assert.deepEqual(payload.metadata, {
    source: 'daibilet',
    checkoutOrderId: 'order_1',
    publicCode: '1234567',
    eventId: 'evt_1',
    eventSlug: 'manual-event',
    offerId: 'offer_1',
    sessionId: null,
  });
});

test('maps YooKassa statuses into local payment statuses', () => {
  assert.equal(mapYooKassaPaymentStatus('pending'), 'PENDING');
  assert.equal(mapYooKassaPaymentStatus('waiting_for_capture'), 'WAITING_FOR_CAPTURE');
  assert.equal(mapYooKassaPaymentStatus('succeeded'), 'SUCCEEDED');
  assert.equal(mapYooKassaPaymentStatus('canceled'), 'CANCELLED');
  assert.equal(mapYooKassaPaymentStatus('unknown'), 'FAILED');
});

test('classifies YooKassa reconcile actions without mutating state', () => {
  assert.equal(classifyYooKassaReconcileAction({
    hasLocalPayment: false,
    localExpired: true,
    providerPaymentId: null,
  }), 'SKIPPED_NO_PAYMENT');
  assert.equal(classifyYooKassaReconcileAction({
    hasLocalPayment: true,
    localExpired: false,
    providerPaymentId: 'pay_1',
  }), 'SKIPPED_NOT_EXPIRED');
  assert.equal(classifyYooKassaReconcileAction({
    hasLocalPayment: true,
    localExpired: true,
    providerPaymentId: null,
  }), 'LOCAL_EXPIRED_WITHOUT_PROVIDER_PAYMENT');
  assert.equal(classifyYooKassaReconcileAction({
    hasLocalPayment: true,
    localExpired: true,
    providerPaymentId: 'pay_1',
    remoteStatus: 'succeeded',
  }), 'REMOTE_SUCCEEDED');
  assert.equal(classifyYooKassaReconcileAction({
    hasLocalPayment: true,
    localExpired: true,
    providerPaymentId: 'pay_1',
    remoteStatus: 'canceled',
  }), 'REMOTE_CANCELLED');
  assert.equal(classifyYooKassaReconcileAction({
    hasLocalPayment: true,
    localExpired: true,
    providerPaymentId: 'pay_1',
    remoteStatus: 'pending',
  }), 'REMOTE_PENDING');
});

test('adds YooKassa config blockers on top of checkout readiness', () => {
  const issues = validateYooKassaCheckoutReadiness({
    config: readYooKassaRuntimeConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv),
    now,
    event: eventFixture(),
    offer: offerFixture({ priceRub: 700 }),
    session: null,
    supplier: supplierFixture(),
    quantity: 1,
  });

  assert.equal(issues[0]?.code, 'YOOKASSA_CHECKOUT_DISABLED');
});

test('ignores malformed YooKassa webhook payload without touching DB', async () => {
  const result = await applyYooKassaWebhookPayload({}, {
    config: readYooKassaRuntimeConfig({ NODE_ENV: 'test', DAIBILET_YOOKASSA_VERIFY_WEBHOOK: '0' } as NodeJS.ProcessEnv),
    now,
  });

  assert.equal(result.result, 'ignored');
  assert.equal(result.providerPaymentId, null);
});

test('reconcile expires local YooKassa order without provider id and releases capacity once', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const eventId = `evt_yk_reconcile_${suffix}`;
  const sessionId = `ses_yk_reconcile_${suffix}`;
  const orderId = `ord_yk_reconcile_${suffix}`;
  const itemId = `itm_yk_reconcile_${suffix}`;
  const paymentId = `pay_yk_reconcile_${suffix}`;
  const fulfillmentId = `ful_yk_reconcile_${suffix}`;

  try {
    await prisma.event.create({
      data: {
        id: eventId,
        title: 'YooKassa reconcile invariant',
        slug: `yookassa-reconcile-${suffix}`,
        kind: 'SINGLE',
        status: 'READY',
        purchaseFlow: 'PLATFORM',
        managementMode: 'DAIBILET_MANAGED',
        ticketsVacant: 9,
      },
    });
    await prisma.eventSession.create({
      data: {
        id: sessionId,
        eventId,
        startsAt: new Date('2026-08-01T12:00:00.000Z'),
        ticketsVacant: 9,
        capacityTotal: 10,
        capacitySold: 1,
      },
    });
    await prisma.checkoutOrder.create({
      data: {
        id: orderId,
        publicCode: suffix.slice(0, 7),
        status: 'PENDING_PAYMENT',
        totalKopecks: 100000,
        expiresAt: new Date('1970-01-01T00:00:00.000Z'),
      },
    });
    await prisma.checkoutItem.create({
      data: {
        id: itemId,
        checkoutOrderId: orderId,
        eventId,
        sessionId,
        title: 'Ticket',
        status: 'RESERVED',
        quantity: 1,
        unitPriceKopecks: 100000,
        totalKopecks: 100000,
      },
    });
    await prisma.payment.create({
      data: {
        id: paymentId,
        checkoutOrderId: orderId,
        provider: 'YOOKASSA',
        status: 'CREATED',
        amountKopecks: 100000,
        currency: 'RUB',
      },
    });
    await prisma.fulfillmentItem.create({
      data: {
        id: fulfillmentId,
        checkoutOrderId: orderId,
        checkoutItemId: itemId,
        purchaseFlow: 'PLATFORM',
        provider: 'INTERNAL',
        status: 'PENDING',
        amountKopecks: 100000,
      },
    });

    const first = await reconcileExpiredYooKassaCheckouts({ now, dryRun: false, limit: 10, graceMinutes: 0, orderId });
    const firstOrder = first.orders.find((order) => order.orderId === orderId);
    assert.ok(firstOrder);
    assert.equal(firstOrder.action, 'LOCAL_EXPIRED_WITHOUT_PROVIDER_PAYMENT');

    const afterFirst = await loadReconcileInvariantRows(orderId, itemId, paymentId, fulfillmentId, eventId, sessionId);
    assert.equal(afterFirst.order?.status, 'EXPIRED');
    assert.equal(afterFirst.item?.status, 'CANCELLED');
    assert.equal(afterFirst.payment?.status, 'FAILED');
    assert.equal(afterFirst.fulfillment?.status, 'CANCELLED');
    assert.equal(afterFirst.event?.ticketsVacant, 10);
    assert.equal(afterFirst.session?.ticketsVacant, 10);
    assert.equal(afterFirst.session?.capacitySold, 0);

    const second = await reconcileExpiredYooKassaCheckouts({ now, dryRun: false, limit: 10, graceMinutes: 0, orderId });
    assert.equal(second.orders.some((order) => order.orderId === orderId), false);
    const afterSecond = await loadReconcileInvariantRows(orderId, itemId, paymentId, fulfillmentId, eventId, sessionId);
    assert.equal(afterSecond.event?.ticketsVacant, 10);
    assert.equal(afterSecond.session?.ticketsVacant, 10);
    assert.equal(afterSecond.session?.capacitySold, 0);
  } finally {
    await prisma.fulfillmentItem.deleteMany({ where: { checkoutOrderId: orderId } });
    await prisma.payment.deleteMany({ where: { checkoutOrderId: orderId } });
    await prisma.checkoutItem.deleteMany({ where: { checkoutOrderId: orderId } });
    await prisma.checkoutOrder.deleteMany({ where: { id: orderId } });
    await prisma.eventSession.deleteMany({ where: { id: sessionId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
  }
});

async function canReachDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`select 1`;
    return true;
  } catch {
    return false;
  }
}

async function loadReconcileInvariantRows(
  orderId: string,
  itemId: string,
  paymentId: string,
  fulfillmentId: string,
  eventId: string,
  sessionId: string,
) {
  const [order, item, payment, fulfillment, event, session] = await Promise.all([
    prisma.checkoutOrder.findUnique({ where: { id: orderId }, select: { status: true } }),
    prisma.checkoutItem.findUnique({ where: { id: itemId }, select: { status: true } }),
    prisma.payment.findUnique({ where: { id: paymentId }, select: { status: true } }),
    prisma.fulfillmentItem.findUnique({ where: { id: fulfillmentId }, select: { status: true } }),
    prisma.event.findUnique({ where: { id: eventId }, select: { ticketsVacant: true } }),
    prisma.eventSession.findUnique({ where: { id: sessionId }, select: { ticketsVacant: true, capacitySold: true } }),
  ]);
  return { order, item, payment, fulfillment, event, session };
}

function eventFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_1',
    slug: 'manual-event',
    title: 'Manual event',
    kind: 'OPEN_DATE',
    status: 'READY',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    salesStartsAt: null,
    salesEndsAt: null,
    openDateValidFrom: null,
    openDateValidTo: null,
    ticketsVacant: 20,
    supplier: null,
    supplierLinks: [],
    venue: null,
    primaryCity: null,
    ...overrides,
  } as never;
}

function offerFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer_1',
    eventId: 'evt_1',
    sourceCode: 'MANUAL',
    title: 'Adult',
    priceRub: 1000,
    active: true,
    capacityTotal: null,
    ...overrides,
  } as never;
}

function supplierFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sup_1',
    slug: 'supplier',
    title: 'Supplier',
    status: 'ACTIVE',
    defaultCommissionBps: 1000,
    ...overrides,
  } as never;
}
