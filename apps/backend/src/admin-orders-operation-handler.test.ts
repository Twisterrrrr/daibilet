import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createAdminOrdersRouteHandler } from './admin-orders-handler.js';
import type { RouteContext } from './routing.js';

function request(authorization: string | undefined, body: object) {
  const result = { status: 0, body: '' };
  const response = {
    writeHead(status: number) { result.status = status; return response; },
    end(value: string) { result.body = value; return response; },
  } as unknown as ServerResponse;
  const incoming = Readable.from([JSON.stringify(body)]) as IncomingMessage;
  incoming.headers = { authorization };
  const path = '/api/internal/admin/orders/8558943/operation';
  const route: RouteContext = {
    request: incoming,
    response,
    url: new URL(`http://localhost${path}`),
    pathname: path,
    method: 'POST',
    route: `POST ${path}`,
    searchParams: new URLSearchParams(),
  };
  return { route, result };
}

test('internal refund endpoint fails closed and sends validated confirmation to operation', async () => {
  const calls: unknown[] = [];
  const handler = createAdminOrdersRouteHandler({
    db: {} as never,
    upsertAdminOrderTicket: async () => null,
    internalOperationToken: 'write-secret',
    operateInternalOrder: async (input) => { calls.push(input); return { status: 'REFUNDED' }; },
  });
  const body = { operation: 'refund', confirmCode: '8558943', reason: 'Запрос покупателя' };
  for (const authorization of [undefined, 'Bearer wrong']) {
    const r = request(authorization, body);
    assert.equal(await handler(r.route), true);
    assert.equal(r.result.status, 401);
  }
  assert.equal(calls.length, 0);
  const valid = request('Bearer write-secret', body);
  assert.equal(await handler(valid.route), true);
  assert.equal(valid.result.status, 200);
  assert.deepEqual(calls, [{ orderKey: '8558943', ...body }]);
});
