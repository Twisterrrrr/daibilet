import assert from 'node:assert/strict';
import test from 'node:test';
import {
  lookupCheckoutOrderByPublicCode,
  mapOrderFromFinancePayload,
  submitAdmissionCheckout,
} from './finance-checkout-client';
import type { FinanceProjectionEnv } from './finance-projection-client';

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

test('order lookup forwards the matching buyer proof to finance server-side', async () => {
  const previousFetch = globalThis.fetch;
  const observed: { headers: Headers | null } = { headers: null };
  const publicCode = '4717674';
  const token = `oa1_${'a'.repeat(43)}`;
  globalThis.fetch = async (_input, init) => {
    observed.headers = new Headers(init?.headers);
    return new Response(JSON.stringify({ order: { publicCode, status: 'PENDING_PAYMENT' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const order = await lookupCheckoutOrderByPublicCode(
      publicCode,
      { FINANCE_API_BASE_URL: 'https://finance.example.test' } satisfies FinanceProjectionEnv,
      token,
    );
    assert.equal(order?.publicCode, publicCode);
    assert.equal(observed.headers?.get('x-daibilet-order-access'), token);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
