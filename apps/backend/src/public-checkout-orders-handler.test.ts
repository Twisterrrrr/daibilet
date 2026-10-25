import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderAccessToken } from './order-access.js';
import { createPublicCheckoutOrdersRouteHandler } from './public-checkout-orders-handler.js';

const secret = 'test-order-access-secret-that-is-long-enough';

test('hides an order when access proof is required and missing', async () => {
  let buildCalls = 0;
  const response = createResponseRecorder();
  const handler = createPublicCheckoutOrdersRouteHandler({
    orderAccessSecret: secret,
    requireOrderAccess: true,
    buildOrderByCode: async () => {
      buildCalls += 1;
      return { publicCode: '4717674' };
    },
    buildPurchasesByEmail: async () => ({ items: [] }),
  });

  const handled = await handler(createContext(response, {}));

  assert.equal(handled, true);
  assert.equal(buildCalls, 0);
  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.payload, { error: 'checkout_order_not_found' });
});

test('returns an order for a matching access proof', async () => {
  const response = createResponseRecorder();
  const token = createOrderAccessToken(secret, '4717674');
  const handler = createPublicCheckoutOrdersRouteHandler({
    orderAccessSecret: secret,
    requireOrderAccess: true,
    buildOrderByCode: async (publicCode) => ({ publicCode }),
    buildPurchasesByEmail: async () => ({ items: [] }),
  });

  await handler(createContext(response, { 'x-daibilet-order-access': token || '' }));

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload, { publicCode: '4717674' });
});

function createContext(response: ReturnType<typeof createResponseRecorder>, headers: Record<string, string>) {
  const url = new URL('http://localhost/api/public/checkout/orders/4717674');
  return {
    request: { headers },
    response,
    url,
    pathname: url.pathname,
    method: 'GET',
    route: `GET ${url.pathname}`,
    searchParams: url.searchParams,
  } as any;
}

function createResponseRecorder() {
  return {
    statusCode: 0,
    payload: null as unknown,
    writeHead(statusCode: number) {
      this.statusCode = statusCode;
    },
    end(body: string) {
      this.payload = JSON.parse(body);
    },
  };
}
