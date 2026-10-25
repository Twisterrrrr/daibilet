import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lookupBuyerTicketDeliveryOrder,
  lookupCheckoutOrderByPublicCode,
  mapOrderFromFinancePayload,
  submitAdmissionCheckout,
} from './finance-checkout-client';

test('production refuses an explicitly requested STUB checkout', async () => {
  const result = await submitAdmissionCheckout({
    admissionProductSlug: 'phase-g-test-museum-entry',
    admissionOfferId: 'test-offer',
    quantity: 1,
    buyer: { email: 'buyer@example.com' },
    returnUrl: 'https://daibilet.ru/checkout/result',
    mode: 'stub',
  }, { NODE_ENV: 'production' } as NodeJS.ProcessEnv);
  assert.deepEqual(result, {
    ok: false,
    error: 'stub_checkout_disabled',
    detail: 'Тестовая выдача билетов недоступна',
    status: 403,
  });
});

test('buyer DTO keeps issued ticket number separate from order code', () => {
  const order = mapOrderFromFinancePayload({ order: {
    publicCode: '4157776', status: 'CONFIRMED', ticketNumber: 'TKT-4157776-01',
    paidAt: '2026-10-02T19:46:37.000Z',
  } }, '', 'LOOKUP');
  assert.equal(order?.ticketNumber, 'TKT-4157776-01');
  assert.notEqual(order?.ticketNumber, order?.publicCode);
  assert.equal(order?.purchasedAt, '2026-10-02T19:46:37.000Z');
});

test('buyer DTO accepts the issued ticket list and does not invent a number', () => {
  const payload = { publicCode: '4157776', status: 'CONFIRMED', ticketNumbers: ['TKT-4157776-01'] };
  assert.equal(mapOrderFromFinancePayload(payload, '', 'LOOKUP')?.ticketNumber, 'TKT-4157776-01');
  assert.equal(mapOrderFromFinancePayload({ ...payload, ticketNumbers: [] }, '', 'LOOKUP')?.ticketNumber, null);
});

test('public order lookup uses one canonical endpoint and forwards the matching access proof', async () => {
  const originalFetch = globalThis.fetch;
  const token = `oa1_${'b'.repeat(43)}`;
  const calls: Array<{ url: string; token: string | null }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      token: new Headers(init?.headers).get('x-daibilet-order-access'),
    });
    return new Response(JSON.stringify({ publicCode: '1234567', status: 'PENDING' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    const order = await lookupCheckoutOrderByPublicCode('1234567', {
      FINANCE_API_BASE_URL: 'https://finance.example.test',
      FINANCE_API_HOST: 'finance.example.test',
    }, token);
    assert.equal(order?.publicCode, '1234567');
    assert.deepEqual(calls, [{
      url: 'https://finance.example.test/api/public/checkout/orders/1234567',
      token,
    }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ticket delivery resolves the order through the server-authenticated buyer projection', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; authorization: string | null }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      authorization: new Headers(init?.headers).get('authorization'),
    });
    return new Response(JSON.stringify({ items: [
      { publicCode: '1234567', status: 'CONFIRMED', ticketNumbers: ['TKT-1234567-01'] },
      { publicCode: '7654321', status: 'CONFIRMED' },
    ] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  try {
    const order = await lookupBuyerTicketDeliveryOrder('1234567', 'buyer@example.test', {
      FINANCE_API_BASE_URL: 'https://finance.example.test',
      DAIBILET_FINANCE_PROJECTION_TOKEN: 'projection-secret-test',
    });
    assert.equal(order?.publicCode, '1234567');
    assert.equal(order?.ticketNumber, 'TKT-1234567-01');
    assert.deepEqual(calls, [{
      url: 'https://finance.example.test/api/public/purchases?email=buyer%40example.test',
      authorization: 'Bearer projection-secret-test',
    }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
