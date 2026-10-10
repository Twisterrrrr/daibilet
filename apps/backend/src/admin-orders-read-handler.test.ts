import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import test from 'node:test';
import { createAdminOrdersReadRouteHandler } from './admin-orders-read-handler.js';
import type { RouteContext } from './routing.js';

function context(authorization?: string): { route: RouteContext; result: { status: number; body: string } } {
  const result = { status: 0, body: '' };
  const response = {
    writeHead(status: number) { result.status = status; return response; },
    end(body: string) { result.body = body; return response; },
  } as unknown as ServerResponse;
  return {
    route: {
      request: { headers: { authorization } } as IncomingMessage,
      response,
      url: new URL('http://localhost/api/internal/admin/orders?provider=MANUAL'),
      pathname: '/api/internal/admin/orders',
      method: 'GET',
      route: 'GET /api/internal/admin/orders',
      searchParams: new URLSearchParams('provider=MANUAL'),
    },
    result,
  };
}

test('internal admin order feed fails closed and accepts only its read token', async () => {
  let calls = 0;
  const handler = createAdminOrdersReadRouteHandler({
    enabled: true,
    internalReadToken: 'read-secret',
    buildOrdersList: async () => { calls += 1; return { rows: [{ publicCode: '8558943' }] }; },
    buildOrderDetail: async () => null,
  });
  for (const authorization of [undefined, 'Bearer wrong']) {
    const request = context(authorization);
    assert.equal(await handler(request.route), true);
    assert.equal(request.result.status, 401);
  }
  assert.equal(calls, 0);
  const request = context('Bearer read-secret');
  assert.equal(await handler(request.route), true);
  assert.equal(request.result.status, 200);
  assert.equal(JSON.parse(request.result.body).rows[0].publicCode, '8558943');
  assert.equal(calls, 1);
});
