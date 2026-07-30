import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyYooKassaWebhookPayload,
  buildYooKassaPaymentCreatePayload,
  createYooKassaCheckoutOrder,
  formatKopecksForYooKassa,
  isYooKassaCheckoutError,
  isYooKassaCheckoutReady,
  mapYooKassaPaymentStatus,
  readYooKassaRuntimeConfig,
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
