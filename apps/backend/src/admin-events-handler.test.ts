import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  createAdminEventsRouteHandler,
  type AdminEventsHandlerDependencies,
} from './admin-events-handler.js';
import type { RouteContext } from './routing.js';

test('POST rewrite-description returns text and does not write override', async () => {
  let updateCalls = 0;
  const response = createMockResponse();
  const handler = createAdminEventsRouteHandler(
    createDeps({
      async loadEventDescriptionForRewrite() {
        return {
          title: 'Обзорная',
          sourceDescription: 'Оригинал с Ticketscloud',
          overrideDescription: null,
        };
      },
      async rewriteEventDescription() {
        return { text: 'Уникальный рерайт', model: 'gpt-test', truncatedInput: false };
      },
      async updateAdminEventOverride() {
        updateCalls += 1;
        return {};
      },
    }),
  );

  const handled = await handler(
    createRouteContext({
      method: 'POST',
      pathname: '/api/admin/events/evt_1/rewrite-description',
      response,
    }),
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(updateCalls, 0);
  const body = JSON.parse(response.body);
  assert.equal(body.text, 'Уникальный рерайт');
  assert.equal(body.sourceUsed, 'source');
});

test('POST rewrite-description falls back to override when source empty', async () => {
  const response = createMockResponse();
  let capturedOriginal = '';
  const handler = createAdminEventsRouteHandler(
    createDeps({
      async loadEventDescriptionForRewrite() {
        return {
          title: 'Событие',
          sourceDescription: '  ',
          overrideDescription: 'Уже наш override',
        };
      },
      async rewriteEventDescription(params) {
        capturedOriginal = params.originalDescription;
        return { text: 'Новый рерайт', model: 'gpt-test', truncatedInput: false };
      },
    }),
  );

  await handler(
    createRouteContext({
      method: 'POST',
      pathname: '/api/admin/events/evt_2/rewrite-description',
      response,
    }),
  );

  assert.equal(capturedOriginal, 'Уже наш override');
  assert.equal(JSON.parse(response.body).sourceUsed, 'override');
});

test('POST rewrite-description returns 400 when no description', async () => {
  const response = createMockResponse();
  const handler = createAdminEventsRouteHandler(
    createDeps({
      async loadEventDescriptionForRewrite() {
        return { title: 'X', sourceDescription: null, overrideDescription: null };
      },
    }),
  );

  await handler(
    createRouteContext({
      method: 'POST',
      pathname: '/api/admin/events/evt_empty/rewrite-description',
      response,
    }),
  );

  assert.equal(response.statusCode, 400);
  assert.equal(JSON.parse(response.body).error, 'empty_description');
});

test('POST rewrite-description returns 404 for missing event', async () => {
  const response = createMockResponse();
  const handler = createAdminEventsRouteHandler(
    createDeps({
      async loadEventDescriptionForRewrite() {
        return null;
      },
    }),
  );

  await handler(
    createRouteContext({
      method: 'POST',
      pathname: '/api/admin/events/missing/rewrite-description',
      response,
    }),
  );

  assert.equal(response.statusCode, 404);
  assert.equal(JSON.parse(response.body).error, 'event_not_found');
});

function createDeps(overrides: Partial<AdminEventsHandlerDependencies> = {}): AdminEventsHandlerDependencies {
  return {
    db: {
      async query() {
        return { rows: [] };
      },
    } as AdminEventsHandlerDependencies['db'],
    async updateAdminEventOverride() {
      return {};
    },
    invalidatePublicCaches() {},
    ...overrides,
  };
}

function createRouteContext(input: {
  method: string;
  pathname: string;
  response: MockResponse;
}): RouteContext {
  const url = new URL(input.pathname, 'http://127.0.0.1');
  return {
    request: Readable.from([]) as RouteContext['request'],
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
