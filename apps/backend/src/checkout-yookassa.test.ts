import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import {
  applyYooKassaWebhookPayload,
  buildYooKassaAdmissionPaymentCreatePayload,
  buildYooKassaCatalogResultReturnUrl,
  buildYooKassaPaymentCreatePayload,
  classifyYooKassaReconcileAction,
  createYooKassaCheckoutOrder,
  formatKopecksForYooKassa,
  isYooKassaCheckoutError,
  isYooKassaCheckoutReady,
  mapYooKassaPaymentStatus,
  readYooKassaRuntimeConfig,
  reconcileExpiredYooKassaCheckouts,
  validateYooKassaAdmissionCheckoutReadiness,
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
    returnUrl: 'https://daibilet.ru/checkout/result?order=1234567',
  });

  assert.deepEqual(payload.amount, { value: '700.00', currency: 'RUB' });
  assert.deepEqual(payload.confirmation, {
    type: 'redirect',
    return_url: 'https://daibilet.ru/checkout/result?order=1234567',
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

test('builds admission redirect payment payload with venue admission metadata', () => {
  const payload = buildYooKassaAdmissionPaymentCreatePayload({
    order: {
      id: 'order_1',
      publicCode: '7654321',
      buyerEmail: 'buyer@daibilet.ru',
      buyerPhone: '+79990000000',
    },
    product: {
      id: 'adp_1',
      slug: 'museum-entry',
      title: 'Museum entry',
      venueId: 'venue_1',
      cityId: 'city_1',
    },
    offer: {
      id: 'ado_1',
      title: 'Adult',
    },
    totals: {
      currency: 'RUB',
      unitPriceKopecks: 70000,
      subtotalKopecks: 70000,
      discountKopecks: 0,
      totalKopecks: 70000,
      commissionKopecks: 7000,
      netKopecks: 63000,
    },
    returnUrl: 'https://daibilet.ru/checkout/result?order=7654321',
  });

  assert.deepEqual(payload.amount, { value: '700.00', currency: 'RUB' });
  assert.deepEqual(payload.metadata, {
    source: 'daibilet',
    subjectType: 'VENUE_ADMISSION',
    checkoutOrderId: 'order_1',
    publicCode: '7654321',
    admissionProductId: 'adp_1',
    admissionProductSlug: 'museum-entry',
    admissionOfferId: 'ado_1',
    venueId: 'venue_1',
    cityId: 'city_1',
  });
});

test('builds catalog result return_url with assigned publicCode', () => {
  assert.equal(
    buildYooKassaCatalogResultReturnUrl('https://daibilet.ru/checkout/result', '7654321'),
    'https://daibilet.ru/checkout/result?order=7654321',
  );
  assert.equal(
    buildYooKassaCatalogResultReturnUrl('https://daibilet.ru', '7654321'),
    'https://daibilet.ru/checkout/result?order=7654321',
  );
  assert.equal(
    buildYooKassaCatalogResultReturnUrl('', '7654321'),
    'https://daibilet.ru/checkout/result?order=7654321',
  );
  assert.equal(
    buildYooKassaCatalogResultReturnUrl('https://pay.daibilet.ru/checkout/result', '7654321'),
    'https://daibilet.ru/checkout/result?order=7654321',
  );
  assert.equal(
    buildYooKassaCatalogResultReturnUrl('https://finance-api.daibilet.ru/checkout/result', '7654321'),
    'https://daibilet.ru/checkout/result?order=7654321',
  );
  assert.equal(
    buildYooKassaCatalogResultReturnUrl('https://daibilet.ru/checkout/result?order=1111111', '7654321'),
    'https://daibilet.ru/checkout/result?order=1111111',
  );
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

test('adds YooKassa config blockers on top of admission checkout readiness', () => {
  const issues = validateYooKassaAdmissionCheckoutReadiness({
    config: readYooKassaRuntimeConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv),
    now,
    product: admissionProductFixture(),
    offer: admissionOfferFixture({ priceRub: 700 }),
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

test('YooKassa webhook stores provider event id and dedupes replay', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const providerEventId = `notif_${suffix}`;
  const providerPaymentId = `pay_webhook_${suffix}`;

  try {
    const payload = {
      id: providerEventId,
      type: 'notification',
      event: 'payment.succeeded',
      object: {
        id: providerPaymentId,
        status: 'succeeded',
      },
    };
    const config = readYooKassaRuntimeConfig({
      NODE_ENV: 'test',
      DAIBILET_YOOKASSA_VERIFY_WEBHOOK: '0',
    } as NodeJS.ProcessEnv);

    const first = await applyYooKassaWebhookPayload(payload, { config, now });
    assert.equal(first.result, 'not_found');
    assert.equal(first.providerPaymentId, providerPaymentId);

    const journal = await prisma.processedWebhookEvent.findFirst({
      where: { providerEventId },
      select: { eventType: true, result: true },
    });
    assert.equal(journal?.eventType, 'payment.succeeded');
    assert.equal(journal?.result, 'not_found');

    const replay = await applyYooKassaWebhookPayload(payload, { config, now });
    assert.equal(replay.result, 'duplicate');
    assert.equal(replay.providerPaymentId, providerPaymentId);
  } finally {
    await prisma.processedWebhookEvent.deleteMany({ where: { providerEventId } });
  }
});

test('YooKassa webhook rejects mismatched payment object id', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const providerEventId = `notif_mismatch_${suffix}`;

  try {
    await assert.rejects(
      () => applyYooKassaWebhookPayload({
        id: providerEventId,
        event: 'payment.succeeded',
        object: {
          id: `pay_wrong_${suffix}`,
          status: 'succeeded',
        },
      }, {
        config: readYooKassaRuntimeConfig({
          NODE_ENV: 'test',
          DAIBILET_YOOKASSA_VERIFY_WEBHOOK: '1',
          DAIBILET_YOOKASSA_CHECKOUT: '1',
          YOOKASSA_SHOP_ID: 'shop_123',
          YOOKASSA_SECRET_KEY: 'test_secret',
        } as NodeJS.ProcessEnv),
        fetchImpl: async () => new Response(JSON.stringify({
          id: `pay_verified_${suffix}`,
          status: 'succeeded',
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
        now,
      }),
      (error: unknown) => isYooKassaCheckoutError(error) && error.code === 'YOOKASSA_PAYMENT_FAILED',
    );

    const journal = await prisma.processedWebhookEvent.findFirst({
      where: { providerEventId },
      select: { result: true },
    });
    assert.equal(journal?.result, 'FAILED');
  } finally {
    await prisma.processedWebhookEvent.deleteMany({ where: { providerEventId } });
  }
});

test('YooKassa admission checkout creates pending payment and preserves idempotency', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cityId = `city_yk_admission_${suffix}`;
  const venueId = `venue_yk_admission_${suffix}`;
  const supplierId = `sup_yk_admission_${suffix}`;
  const productId = `adp_yk_admission_${suffix}`;
  const offerId = `ado_yk_admission_${suffix}`;
  const idempotencyKey = `yk-admission-${suffix}`;

  try {
    await prisma.city.create({
      data: {
        id: cityId,
        slug: `yookassa-admission-city-${suffix}`,
        title: 'YooKassa admission city',
      },
    });
    await prisma.venue.create({
      data: {
        id: venueId,
        slug: `yookassa-admission-venue-${suffix}`,
        title: 'YooKassa admission venue',
        cityId,
        kind: 'MUSEUM_ART_SPACE',
      },
    });
    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug: `yookassa-admission-supplier-${suffix}`,
        title: 'YooKassa admission supplier',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
        defaultCommissionBps: 1000,
      },
    });
    await prisma.admissionProduct.create({
      data: {
        id: productId,
        slug: `yookassa-admission-product-${suffix}`,
        title: 'YooKassa admission product',
        type: 'MUSEUM_ENTRY',
        status: 'PUBLISHED',
        purchaseFlow: 'PLATFORM',
        managementMode: 'DAIBILET_MANAGED',
        sourceCode: 'MANUAL',
        priceFromRub: 700,
        ticketsVacant: 5,
        validityMode: 'OPEN_DATE',
        venueId,
        cityId,
        supplierId,
      },
    });
    await prisma.admissionOffer.create({
      data: {
        id: offerId,
        admissionProductId: productId,
        sourceCode: 'MANUAL',
        title: 'Adult',
        priceRub: 700,
        active: true,
      },
    });

    let createPaymentRequestBody: Record<string, unknown> | null = null;
    const fakeFetch = async (_input: string, init?: RequestInit) => {
      createPaymentRequestBody = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
      return new Response(JSON.stringify({
      id: `pay_${suffix}`,
      status: 'pending',
      amount: { value: '700.00', currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        confirmation_url: `https://yookassa.test/pay/${suffix}`,
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    };

    const result = await createYooKassaCheckoutOrder({
      subjectType: 'VENUE_ADMISSION',
      admissionProductId: productId,
      admissionOfferId: offerId,
      quantity: 1,
      buyer: {
        email: 'buyer@daibilet.ru',
        name: 'Buyer',
        phone: '+79990000000',
      },
      returnUrl: 'https://daibilet.ru/checkout/result',
      idempotencyKey,
    }, {
      config: readYooKassaRuntimeConfig({
        NODE_ENV: 'test',
        DAIBILET_YOOKASSA_CHECKOUT: '1',
        YOOKASSA_SHOP_ID: 'shop_123',
        YOOKASSA_SECRET_KEY: 'test_secret',
        PUBLIC_SITE_URL: 'https://daibilet.ru',
      } as NodeJS.ProcessEnv),
      fetchImpl: fakeFetch,
      now,
    });

    assert.equal(result.mode, 'YOOKASSA');
    assert.equal(result.order.subject.type, 'VENUE_ADMISSION');
    assert.equal(result.order.subject.admissionProductId, productId);
    assert.equal(result.order.item.offerId, offerId);
    assert.equal(result.order.payment.status, 'PENDING');
    assert.equal(result.order.payment.providerPaymentId, `pay_${suffix}`);
    assert.equal(result.order.payment.confirmationUrl, `https://yookassa.test/pay/${suffix}`);
    assert.ok(createPaymentRequestBody);
    const expectedReturnUrl = `https://daibilet.ru/checkout/result?order=${result.order.publicCode}`;
    assert.deepEqual((createPaymentRequestBody as Record<string, unknown>).confirmation, {
      type: 'redirect',
      return_url: expectedReturnUrl,
    });
    assert.equal(result.order.ticketNumber, null);
    assert.deepEqual(result.order.ticketNumbers, []);

    const createdOrder = await prisma.checkoutOrder.findUnique({
      where: { id: result.order.id },
      select: { buyerSnapshot: true },
    });
    const buyerSnapshot = createdOrder?.buyerSnapshot as Record<string, unknown> | null;
    assert.equal(buyerSnapshot?.returnUrl, expectedReturnUrl);
    assert.equal(buyerSnapshot?.requestedReturnUrl, 'https://daibilet.ru/checkout/result');

    const createdPayment = await prisma.payment.findUnique({
      where: { id: result.order.payment.id },
      select: { rawPayload: true },
    });
    const rawPayload = createdPayment?.rawPayload as Record<string, unknown> | null;
    const daibiletPayload = rawPayload?.daibilet as Record<string, unknown> | undefined;
    assert.equal(daibiletPayload?.returnUrl, expectedReturnUrl);

    const afterFirst = await prisma.admissionProduct.findUnique({
      where: { id: productId },
      select: { ticketsVacant: true },
    });
    assert.equal(afterFirst?.ticketsVacant, 4);

    const replay = await createYooKassaCheckoutOrder({
      subjectType: 'VENUE_ADMISSION',
      admissionProductId: productId,
      admissionOfferId: offerId,
      quantity: 1,
      buyer: {
        email: 'buyer@daibilet.ru',
        name: 'Buyer',
        phone: '+79990000000',
      },
      returnUrl: 'https://daibilet.ru/checkout/result',
      idempotencyKey,
    }, {
      config: readYooKassaRuntimeConfig({
        NODE_ENV: 'test',
        DAIBILET_YOOKASSA_CHECKOUT: '1',
        YOOKASSA_SHOP_ID: 'shop_123',
        YOOKASSA_SECRET_KEY: 'test_secret',
        PUBLIC_SITE_URL: 'https://daibilet.ru',
      } as NodeJS.ProcessEnv),
      fetchImpl: fakeFetch,
      now,
    });
    assert.equal(replay.order.id, result.order.id);
    assert.equal(replay.order.publicCode, result.order.publicCode);

    const afterReplay = await prisma.admissionProduct.findUnique({
      where: { id: productId },
      select: { ticketsVacant: true },
    });
    assert.equal(afterReplay?.ticketsVacant, 4);

    const webhook = await applyYooKassaWebhookPayload({
      id: `notif_${suffix}`,
      event: 'payment.succeeded',
      object: {
        id: `pay_${suffix}`,
        status: 'succeeded',
      },
    }, {
      config: readYooKassaRuntimeConfig({
        NODE_ENV: 'test',
        DAIBILET_YOOKASSA_VERIFY_WEBHOOK: '0',
      } as NodeJS.ProcessEnv),
      now,
    });
    assert.equal(webhook.result, 'processed');
    assert.equal(webhook.publicCode, result.order.publicCode);

    const confirmed = await prisma.fulfillmentItem.findFirst({
      where: { checkoutOrderId: result.order.id },
      select: { status: true, providerData: true },
    });
    assert.equal(confirmed?.status, 'CONFIRMED');
    const providerData = confirmed?.providerData as { ticketNumber?: string; ticketNumbers?: string[] } | null;
    assert.match(providerData?.ticketNumber || '', /^TKT-/);
    assert.notEqual(providerData?.ticketNumber, result.order.publicCode);
    assert.deepEqual(providerData?.ticketNumbers, [providerData?.ticketNumber]);

    const replayWebhook = await applyYooKassaWebhookPayload({
      id: `notif_${suffix}`,
      event: 'payment.succeeded',
      object: {
        id: `pay_${suffix}`,
        status: 'succeeded',
      },
    }, {
      config: readYooKassaRuntimeConfig({
        NODE_ENV: 'test',
        DAIBILET_YOOKASSA_VERIFY_WEBHOOK: '0',
      } as NodeJS.ProcessEnv),
      now,
    });
    assert.equal(replayWebhook.result, 'duplicate');
  } finally {
    await prisma.processedWebhookEvent.deleteMany({ where: { providerEventId: `notif_${suffix}` } });
    await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } });
    await prisma.fulfillmentItem.deleteMany({
      where: { order: { items: { some: { admissionProductId: productId } } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { items: { some: { admissionProductId: productId } } } },
    });
    await prisma.checkoutItem.deleteMany({ where: { admissionProductId: productId } });
    await prisma.checkoutOrder.deleteMany({
      where: { items: { none: {} }, buyerEmail: 'buyer@daibilet.ru' },
    });
    await prisma.idempotencyKey.deleteMany({ where: { key: idempotencyKey } });
    await prisma.admissionOffer.deleteMany({ where: { admissionProductId: productId } });
    await prisma.admissionProduct.deleteMany({ where: { id: productId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.venue.deleteMany({ where: { id: venueId } });
    await prisma.city.deleteMany({ where: { id: cityId } });
  }
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

function admissionProductFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'adp_1',
    slug: 'museum-entry',
    title: 'Museum entry',
    type: 'MUSEUM_ENTRY',
    status: 'PUBLISHED',
    purchaseFlow: 'PLATFORM',
    managementMode: 'DAIBILET_MANAGED',
    salesStartsAt: null,
    salesEndsAt: null,
    validFrom: null,
    validTo: null,
    validDaysAfterPurchase: null,
    validityMode: 'OPEN_DATE',
    ticketsVacant: 20,
    supplier: supplierFixture(),
    venue: {
      id: 'venue_1',
      slug: 'museum',
      title: 'Museum',
      kind: 'MUSEUM_ART_SPACE',
      city: {
        id: 'city_1',
        slug: 'moskva',
        title: 'Москва',
      },
    },
    city: {
      id: 'city_1',
      slug: 'moskva',
      title: 'Москва',
    },
    ...overrides,
  } as never;
}

function admissionOfferFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ado_1',
    admissionProductId: 'adp_1',
    sourceCode: 'MANUAL',
    title: 'Adult',
    priceRub: 1000,
    active: true,
    capacityTotal: null,
    ...overrides,
  } as never;
}
