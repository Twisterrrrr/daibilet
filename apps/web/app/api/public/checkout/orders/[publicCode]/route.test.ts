import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from './route';

test('payment poll proxy forwards only a code-matched poll-cookie proof', async () => {
  const previousFetch = globalThis.fetch;
  const previousBase = process.env.FINANCE_API_BASE_URL;
  const token = `oa1_${'e'.repeat(43)}`;
  const forwarded: Array<string | null> = [];
  process.env.FINANCE_API_BASE_URL = 'https://finance.example.test';
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    forwarded.push(new Headers(init?.headers).get('x-daibilet-order-access'));
    return new Response(JSON.stringify({ publicCode: '1234567', status: 'PENDING' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    const context = { params: Promise.resolve({ publicCode: '1234567' }) };
    await GET(new Request('http://localhost/api/public/checkout/orders/1234567', {
      headers: { cookie: `daibilet_order_poll_access=1234567.${token}` },
    }), context);
    await GET(new Request('http://localhost/api/public/checkout/orders/7654321', {
      headers: { cookie: `daibilet_order_poll_access=1234567.${token}` },
    }), { params: Promise.resolve({ publicCode: '7654321' }) });
    assert.deepEqual(forwarded, [token, null]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBase === undefined) delete process.env.FINANCE_API_BASE_URL;
    else process.env.FINANCE_API_BASE_URL = previousBase;
  }
});
