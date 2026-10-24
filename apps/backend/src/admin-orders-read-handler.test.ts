import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminOrdersReadRouteHandler } from './admin-orders-read-handler.js';
import type { RouteContext } from './routing.js';

function captureResponse() {
  let statusCode = 0;
  let body = '';
  return {
    response: {
      writeHead(status: number) { statusCode = status; return this; },
      end(value: string) { body = value; },
    },
    read() { return { statusCode, body: JSON.parse(body) as { rows: Array<{ buyer: { name: string }; buyerSnapshot: unknown }> } }; },
  };
}

test('admin orders read masks the API response before sending it to an auditor', async () => {
  const capture = captureResponse();
  let includePiiSearch: boolean | null = null;
  const handler = createAdminOrdersReadRouteHandler({
    enabled: true,
    buildOrdersList: async (_params, options) => {
      includePiiSearch = options.includePiiSearch;
      return { rows: [{ buyer: { name: 'Анна Константинова', email: 'anna@example.com' }, buyerSnapshot: { email: 'anna@example.com' } }] };
    },
  });
  const context = {
    request: { adminSessionUser: { roles: ['AUDITOR'] } },
    response: capture.response,
    method: 'GET',
    pathname: '/api/admin/orders',
    route: 'GET /api/admin/orders',
    searchParams: new URLSearchParams(),
    url: new URL('http://localhost/api/admin/orders'),
  } as unknown as RouteContext;

  assert.equal(await handler(context), true);
  const sent = capture.read();
  assert.equal(sent.statusCode, 200);
  assert.equal(includePiiSearch, false);
  assert.equal(sent.body.rows[0]?.buyer?.name, 'А. К.');
  assert.equal(sent.body.rows[0]?.buyerSnapshot, null);
  assert.equal(JSON.stringify(sent.body).includes('anna@example.com'), false);
});
