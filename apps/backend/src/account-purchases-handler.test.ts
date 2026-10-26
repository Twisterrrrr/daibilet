import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createAccountPurchasesRouteHandler } from './account-purchases-handler.js';
import type { RouteContext } from './routing.js';

function route(method: string, path: string, body?: object): { context: RouteContext; response: { status: number; body: string } } {
  const result = { status: 0, body: '' };
  const response = {
    writeHead(status: number) { result.status = status; return response; },
    end(value: string) { result.body = value; return response; },
  } as unknown as ServerResponse;
  const request = Readable.from(body ? [JSON.stringify(body)] : []) as IncomingMessage;
  request.headers = { authorization: 'Bearer buyer-token' };
  request.method = method;
  const url = new URL(`http://localhost${path}`);
  return {
    context: {
      request,
      response,
      url,
      pathname: url.pathname,
      method,
      route: `${method} ${url.pathname}`,
      searchParams: url.searchParams,
    },
    response: result,
  };
}

test('buyer refund request binds the order code to the authenticated user and creates a request only', async () => {
  const calls: unknown[] = [];
  const handler = createAccountPurchasesRouteHandler({
    db: {},
    resolveUser: async () => ({ id: 'buyer-1', email: 'buyer@example.com', emailVerifiedAt: null }) as never,
    createRefundRequest: async (input) => {
      calls.push(input);
      return { requestId: 'refund-1', status: 'CREATED', amountKopecks: 35_000, currency: 'RUB', createdAt: '2026-10-26T10:00:00.000Z' };
    },
  });
  const request = route('POST', '/api/account/purchases/DB26-784501/refunds', { reasonNote: 'Не смогу посетить событие' });

  assert.equal(await handler(request.context), true);
  assert.equal(request.response.status, 201);
  assert.deepEqual(JSON.parse(request.response.body), {
    requestId: 'refund-1', status: 'CREATED', amountKopecks: 35_000, currency: 'RUB', createdAt: '2026-10-26T10:00:00.000Z',
  });
  assert.deepEqual(calls, [{
    publicCode: 'DB26-784501', siteUserId: 'buyer-1', email: 'buyer@example.com', emailVerified: false,
    reasonNote: 'Не смогу посетить событие',
  }]);
});

test('buyer refund endpoint rejects malformed requests before invoking the request creator', async () => {
  let called = false;
  const handler = createAccountPurchasesRouteHandler({
    db: {},
    resolveUser: async () => ({ id: 'buyer-1', email: 'buyer@example.com', emailVerifiedAt: new Date() }) as never,
    createRefundRequest: async () => { called = true; return {} as never; },
  });
  const request = route('POST', '/api/account/purchases/DB26-784501/refunds', { reasonNote: 'no' });

  await assert.rejects(async () => { await handler(request.context); }, /Request validation failed/);
  assert.equal(called, false);
});

test('buyer refund endpoint returns false for unrelated routes', async () => {
  const handler = createAccountPurchasesRouteHandler({ db: {} });
  const request = route('POST', '/api/account/purchases/DB26-784501');
  assert.equal(await handler(request.context), false);
});
