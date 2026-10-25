import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from './route';

test('result lookup requires a code-bound HttpOnly-cookie proof and forwards it server-side', async () => {
  const previousFetch = globalThis.fetch;
  const previousBase = process.env.FINANCE_API_BASE_URL;
  const token = `oa1_${'d'.repeat(43)}`;
  const requests: Array<{ url: string; token: string | null }> = [];
  process.env.FINANCE_API_BASE_URL = 'https://finance.example.test';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      token: new Headers(init?.headers).get('x-daibilet-order-access'),
    });
    return new Response(JSON.stringify({ publicCode: '1234567', status: 'CONFIRMED', ticketNumber: 'TKT-1234567-01' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    const denied = await GET(new Request('http://localhost/checkout/actions/order?order=1234567'),);
    assert.deepEqual(await denied.json(), { ok: true, found: false, publicCode: '1234567', order: null });
    assert.equal(requests.length, 0);

    const authorized = await GET(new Request('http://localhost/checkout/actions/order?order=1234567', {
      headers: { cookie: `daibilet_order_access=1234567.${token}` },
    }));
    const body = await authorized.json() as { found: boolean; order: { ticketNumber: string } };
    assert.equal(body.found, true);
    assert.equal(body.order.ticketNumber, 'TKT-1234567-01');
    assert.deepEqual(requests, [{
      url: 'https://finance.example.test/api/public/checkout/orders/1234567',
      token,
    }]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBase === undefined) delete process.env.FINANCE_API_BASE_URL;
    else process.env.FINANCE_API_BASE_URL = previousBase;
  }
});
