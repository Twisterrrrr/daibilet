import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

test('YooKassa checkout stores order proof in HttpOnly scoped cookies and removes it from JSON', async () => {
  const previousFetch = globalThis.fetch;
  const previousBase = process.env.FINANCE_API_BASE_URL;
  const token = `oa1_${'c'.repeat(43)}`;
  process.env.FINANCE_API_BASE_URL = 'https://finance.example.test';
  globalThis.fetch = (async () => new Response(JSON.stringify({
    order: { publicCode: '1234567', orderAccessToken: token, status: 'PENDING' },
    confirmationUrl: 'https://yookassa.example.test/confirm',
  }), { status: 201, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  try {
    const response = await POST(new Request('http://localhost/api/public/checkout/yookassa', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'test-key' },
      body: JSON.stringify({}),
    }));
    const body = await response.json() as { order: { publicCode: string; orderAccessToken?: string } };
    assert.equal(response.status, 201);
    assert.equal(body.order.publicCode, '1234567');
    assert.equal('orderAccessToken' in body.order, false);
    const cookies = response.headers.getSetCookie();
    assert.equal(cookies.length, 2);
    assert.ok(cookies.some((cookie) => cookie.includes('daibilet_order_access=') && cookie.includes('Path=/checkout') && cookie.toLowerCase().includes('httponly') && cookie.toLowerCase().includes('samesite=lax')));
    assert.ok(cookies.some((cookie) => cookie.includes('daibilet_order_poll_access=') && cookie.includes('Path=/api/public/checkout/orders') && cookie.includes('HttpOnly')));
    assert.ok(cookies.every((cookie) => cookie.includes('Max-Age=7200')));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousBase === undefined) delete process.env.FINANCE_API_BASE_URL;
    else process.env.FINANCE_API_BASE_URL = previousBase;
  }
});
