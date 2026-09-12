import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  createAdminEventChangeRequestsRouteHandler,
  type AdminEventChangeRequestsHandlerDependencies,
} from './admin-event-change-requests-handler.js';
import type { RouteContext } from './routing.js';

test('serves admin event change request list with filters', async () => {
  let capturedStatus: string | null | undefined;
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler(createDeps({
    async buildEventChangeRequests(query) {
      capturedStatus = query.status;
      return {
        generatedAt: '2026-08-01T12:00:00.000Z',
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
        filters: { status: query.status ?? null, type: null, supplierId: null, eventId: null, q: null },
        facets: { statuses: { SUBMITTED: 1 }, types: { CONTENT_UPDATE: 1 } },
        items: [],
      };
    },
  }));

  const handled = await handler(createRouteContext({
    method: 'GET',
    pathname: '/api/admin/event-change-requests?status=SUBMITTED',
    response,
  }));

  assert.equal(handled, true);
  assert.equal(capturedStatus, 'SUBMITTED');
  assert.equal(JSON.parse(response.body).total, 1);
});

test('serves admin event change request detail', async () => {
  let capturedRequestId: string | null = null;
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler(createDeps({
    async buildEventChangeRequestDetail(requestId) {
      capturedRequestId = requestId;
      return {
        id: requestId,
        eventId: 'evt_1',
        supplierId: null,
        type: 'CONTENT_UPDATE',
        status: 'SUBMITTED',
        title: 'Update content',
        summary: null,
        adminComment: null,
        payloadKeys: ['title'],
        submittedAt: null,
        reviewedAt: null,
        appliedAt: null,
        createdAt: '2026-08-01T09:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        event: null,
        supplier: null,
        createdBy: null,
        reviewedBy: null,
        actions: { canApprove: true, canReject: true, canApply: false },
        payloadPreview: {
          baseSnapshot: null,
          sections: [{ id: 'title', title: 'Название', kind: 'string', value: 'New title' }],
        },
        diff: {
          items: [{ path: 'content.title', label: 'Название', currentValue: 'Old', proposedValue: 'New', changeType: 'changed' }],
          warnings: [],
        },
      };
    },
  }));

  const handled = await handler(createRouteContext({
    method: 'GET',
    pathname: '/api/admin/event-change-requests/cr_1',
    response,
  }));

  assert.equal(handled, true);
  assert.equal(capturedRequestId, 'cr_1');
  assert.equal(JSON.parse(response.body).id, 'cr_1');
});

test('returns 404 for missing admin event change request detail', async () => {
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler(createDeps({
    async buildEventChangeRequestDetail() {
      return null;
    },
  }));

  const handled = await handler(createRouteContext({
    method: 'GET',
    pathname: '/api/admin/event-change-requests/missing',
    response,
  }));

  assert.equal(handled, true);
  assert.equal(response.statusCode, 404);
  assert.equal(JSON.parse(response.body).error, 'event_change_request_not_found');
});

test('approves event change request through admin route', async () => {
  let reviewed: { requestId: string; action: string; adminComment?: string | null | undefined } | null = null;
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler(createDeps({
    async reviewEventChangeRequest(input) {
      reviewed = input;
      return {
        requestId: input.requestId,
        status: 'APPROVED',
        reviewedAt: '2026-08-01T12:00:00.000Z',
        logAction: 'APPROVED',
      };
    },
  }));

  const handled = await handler(createRouteContext({
    method: 'POST',
    pathname: '/api/admin/event-change-requests/cr_1/approve',
    body: { adminComment: 'Looks good' },
    response,
  }));

  assert.equal(handled, true);
  assert.deepEqual(reviewed, {
    requestId: 'cr_1',
    action: 'approve',
    adminComment: 'Looks good',
  });
  assert.equal(JSON.parse(response.body).status, 'APPROVED');
});

test('rejects event change request through admin route', async () => {
  let reviewedAction: string | null = null;
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler(createDeps({
    async reviewEventChangeRequest(input) {
      reviewedAction = input.action;
      return {
        requestId: input.requestId,
        status: 'REJECTED',
        reviewedAt: '2026-08-01T12:00:00.000Z',
        logAction: 'REJECTED',
      };
    },
  }));

  const handled = await handler(createRouteContext({
    method: 'POST',
    pathname: '/api/admin/event-change-requests/cr_1/reject',
    body: { adminComment: 'Need better schedule' },
    response,
  }));

  assert.equal(handled, true);
  assert.equal(reviewedAction, 'reject');
  assert.equal(JSON.parse(response.body).status, 'REJECTED');
});

test('applies approved event change request through admin route', async () => {
  let appliedRequestId: string | null = null;
  let invalidationReason: string | null = null;
  const response = createMockResponse();
  const handler = createAdminEventChangeRequestsRouteHandler(createDeps({
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
  }));

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
  const handler = createAdminEventChangeRequestsRouteHandler(createDeps());

  const handled = await handler(createRouteContext({
    method: 'GET',
    pathname: '/api/admin/event-change-requests/cr_1/apply',
    response,
  }));

  assert.equal(handled, false);
  assert.equal(response.body, '');
});

function createDeps(
  overrides: Partial<AdminEventChangeRequestsHandlerDependencies> = {},
): AdminEventChangeRequestsHandlerDependencies {
  return {
    async buildEventChangeRequests() {
      throw new Error('buildEventChangeRequests should not be called');
    },
    async buildEventChangeRequestDetail() {
      throw new Error('buildEventChangeRequestDetail should not be called');
    },
    async reviewEventChangeRequest() {
      throw new Error('reviewEventChangeRequest should not be called');
    },
    async applyEventChangeRequest() {
      throw new Error('applyEventChangeRequest should not be called');
    },
    invalidatePublicCaches() {
      throw new Error('invalidatePublicCaches should not be called');
    },
    ...overrides,
  };
}

function createRouteContext(input: {
  method: string;
  pathname: string;
  response: MockResponse;
  body?: unknown;
}): RouteContext {
  const url = new URL(input.pathname, 'http://127.0.0.1');
  const requestBody = input.body === undefined ? '' : JSON.stringify(input.body);
  return {
    request: Readable.from(requestBody ? [Buffer.from(requestBody)] : []) as RouteContext['request'],
    response: input.response as unknown as RouteContext['response'],
    url,
    pathname: url.pathname,
    method: input.method,
    route: `${input.method} ${url.pathname}`,
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
