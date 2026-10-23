import assert from 'node:assert/strict';
import test from 'node:test';
import { mapOrderFromFinancePayload, submitAdmissionCheckout, submitEventCheckout } from './finance-checkout-client';

test('event checkout sends the finance event and offer with the caller idempotency key', async () => {
  const previousFetch = global.fetch;
  let called = 0;
  global.fetch = async (input, init) => {
    called += 1;
    assert.equal(String(input), 'https://finance.example/api/checkout/yookassa');
    assert.equal(new Headers(init?.headers).get('Idempotency-Key'), 'event-attempt-1');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.eventId, 'event-1');
    assert.equal(body.offerId, 'offer-1');
    assert.equal(body.subjectType, 'EVENT');
    return Response.json({ order: { publicCode: '4157776', status: 'PENDING' },
      confirmationUrl: 'https://yookassa.example/pay/1' }, { status: 201 });
  };
  try {
    const result = await submitEventCheckout({
      eventId: 'event-1', offerId: 'offer-1', quantity: 1,
      buyer: { email: 'buyer@example.com' },
      returnUrl: 'https://daibilet.ru/checkout/result', idempotencyKey: 'event-attempt-1',
    }, { FINANCE_API_BASE_URL: 'https://finance.example' });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.confirmationUrl, 'https://yookassa.example/pay/1');
    assert.equal(called, 1);
  } finally { global.fetch = previousFetch; }
});

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
