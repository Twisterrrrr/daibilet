import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { createDescriptionRevisionRouteHandler, sourceHashOf } from './description-revision-handler.js';
import type { RouteContext } from './routing.js';

import type { DbClient } from './types/db.js';

type SqlCall = { sql: string; params: unknown[] };

function createMockDb(handler: (sql: string, params: unknown[]) => { rows: unknown[] }): DbClient & { calls: SqlCall[] } {
  const calls: SqlCall[] = [];
  const client = {
    calls,
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params });
      return handler(sql, params);
    },
    async stats() {
      return {} as Record<string, number>;
    },
    async recentEvents() {
      return [];
    },
  };
  return client as unknown as DbClient & { calls: SqlCall[] };
}

function createRouteContext(input: {
  method: string;
  pathname: string;
  body?: unknown;
  response: MockResponse;
}): RouteContext {
  const url = new URL(input.pathname, 'http://127.0.0.1');
  const payload = input.body === undefined ? [] : [Buffer.from(JSON.stringify(input.body))];
  return {
    request: Readable.from(payload) as RouteContext['request'],
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

const REVISION_ROW = {
  id: 'edr_1',
  eventId: 'evt_1',
  status: 'QUEUED',
  priority: 'A',
  sourceHash: sourceHashOf('Оригинальное описание события от провайдера.'),
  sourceText: 'Оригинальное описание события от провайдера.',
  draftText: null,
  finalText: null,
  model: null,
  qaFlags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: 'Событие',
  slug: 'sobytie-evt-1',
  city: 'Москва',
  sourceDescription: 'Оригинальное описание события от провайдера.',
  sessionDurationMinutes: [65],
};

test('GET rewrite-queue lists items and counts', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('group by status')) return { rows: [{ status: 'QUEUED', n: 3 }] };
    return { rows: [REVISION_ROW] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(createRouteContext({ method: 'GET', pathname: '/api/admin/rewrite-queue', response }));
  assert.equal(handled, true);
  const body = JSON.parse(response.body);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].eventSlug, 'sobytie-evt-1');
  assert.equal(body.counts.QUEUED, 3);
});

test('generate stores QA-checked draft and never publishes', async () => {
  const response = createMockResponse();
  let rewrittenWith = '';
  const db = createMockDb((sql) => {
    if (sql.includes("status = 'QUEUED'") && sql.includes('limit $1')) return { rows: [{ id: 'edr_1' }] };
    if (sql.includes('sessionDurationMinutes')) return { rows: [REVISION_ROW] };
    return { rows: [] };
  });
  const handler = createDescriptionRevisionRouteHandler({
    db,
    invalidatePublicCaches() {},
    async rewrite(params) {
      rewrittenWith = params.originalDescription;
      return { text: 'Уникальный текст про концерт в клубе без выдуманных фактов.', model: 'gpt-test', truncatedInput: false };
    },
  });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/generate', body: { limit: 5 }, response }),
  );
  assert.equal(handled, true);
  assert.equal(rewrittenWith, 'Оригинальное описание события от провайдера.');
  const body = JSON.parse(response.body);
  assert.equal(body.generated, 1);
  assert.equal(body.results[0].status, 'CHECKED');
  assert.equal(body.results[0].flags, 0);
  const update = db.calls.find((call) => call.sql.includes('draftText'));
  assert.ok(update, 'draft must be stored');
  assert.ok(!db.calls.some((call) => call.sql.includes('EventOverride')), 'generate must not publish');
});

test('approve publishes draft to EventOverride with origin AI', async () => {
  const response = createMockResponse();
  let invalidatedWith = '';
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'CHECKED', draftText: 'Черновик рерайта.' }] };
    }
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({
    db,
    invalidatePublicCaches(_reason, options) {
      invalidatedWith = options?.slug || '';
    },
  });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/approve', body: {}, response }),
  );
  assert.equal(handled, true);
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  const insert = db.calls.find((call) => call.sql.includes('insert into "EventOverride"'));
  assert.ok(insert);
  assert.equal(insert.params[2], 'Черновик рерайта.');
  assert.ok(db.calls.some((call) => call.sql.includes("'PUBLISHED'")));
  assert.equal(invalidatedWith, 'sobytie-evt-1');
});

test('approve refuses stale drafts when the source changed', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'CHECKED', draftText: 'Черновик.', sourceHash: 'старый-хеш' }] };
    }
    return { rows: [] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/approve', body: {}, response }),
  );
  assert.equal(handled, true);
  assert.equal(response.statusCode, 409);
  assert.equal(JSON.parse(response.body).error, 'stale_source');
  assert.ok(db.calls.some((call) => call.sql.includes("'STALE'")));
  assert.ok(!db.calls.some((call) => call.sql.includes('insert into "EventOverride"')));
});

test('reject sends the draft back to the queue', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes("status in ('GENERATED'")) return { rows: [{ id: 'edr_1' }] };
    return { rows: [] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/reject', body: {}, response }),
  );
  assert.equal(handled, true);
  assert.equal(JSON.parse(response.body).ok, true);
});