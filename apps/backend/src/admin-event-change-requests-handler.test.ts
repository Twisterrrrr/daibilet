import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminEventChangeRequestsRouteHandler } from './admin-event-change-requests-handler.js';
import type { RouteContext } from './routing.js';

test('applies approved event change request through admin route', async () => {
  let appliedRequestId: string | null = null;
  let invalidationReason: string | null = null;
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler({
    async applyEventChangeRequest(input) {
      appliedRequestId = input.requestId;
      return {
        requestId: input.requestId,
        eventId: 'evt_1',
        status: 'APPLIED',
        appliedAt: '2026-08-01T12:00:00.000Z',
        logAction: 'UPDATED',
      };
    },
    invalidatePublicCaches(reason) {
      invalidationReason = reason;
    },
  });

  const handled = await handler(createRouteContext({
    method: 'POST',
    pathname: '/api/admin/event-change-requests/cr_1/apply',
    response,
  }));

  assert.equal(handled, true);
  assert.equal(appliedRequestId, 'cr_1');
  assert.equal(invalidationReason, 'event change request apply');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    requestId: 'cr_1',
    eventId: 'evt_1',
    status: 'APPLIED',
    appliedAt: '2026-08-01T12:00:00.000Z',
    logAction: 'UPDATED',
  });
});

test('ignores unrelated routes', async () => {
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler({
    async applyEventChangeRequest() {
      throw new Error('should not be called');
    },
    invalidatePublicCaches() {
      throw new Error('should not be called');
    },
  });

  const handled = await handler(createRouteContext({
    method: 'GET',
    pathname: '/api/admin/event-change-requests/cr_1/apply',
    response,
  }));

  assert.equal(handled, false);
  assert.equal(response.body, '');
});

function createRouteContext(input: {
  method: string;
  pathname: string;
  response: MockResponse;
}): RouteContext {
  const url = new URL(input.pathname, 'http://127.0.0.1');
  return {
    request: {} as RouteContext['request'],
    response: input.response as unknown as RouteContext['response'],
    url,
    pathname: input.pathname,
    method: input.method,
    route: `${input.method} ${input.pathname}`,
    searchParams: url.searchParams,
  };
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode: number, headers: Record<string, string>) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body?: string) {
      this.body = body || '';
    },
  };
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(body?: string): void;
}
