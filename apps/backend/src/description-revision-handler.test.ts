import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import {
  contentHashOf,
  createDescriptionRevisionRouteHandler,
  sourceHashOf,
} from './description-revision-handler.js';
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

/**
 * Hash inputs exactly as the loader selects them (aliases match
 * scripts/post-sync-event-descriptions.js, so both sides compute one fingerprint).
 */
const REVISION_HASH_ROW = {
  source_description: 'Оригинальное описание события от провайдера.',
  eff_title: 'Событие',
  city: 'Москва',
  venue: 'Клуб',
  venue_address: 'ул. Тестовая, 1',
  ageLimit: '12',
  priceFromRub: 1500,
  durations: [65],
  future_sessions: 3,
  next_session: '2026-11-13T16:00:00.000Z',
  category: 'Концерты',
  subcategory: 'Рок',
  kind: 'RECURRING',
};

const REVISION_ROW = {
  id: 'edr_1',
  eventId: 'evt_1',
  status: 'QUEUED',
  priority: 'A',
  sourceHash: '',
  sourceText: 'Оригинальное описание события от провайдера.',
  draftText: null,
  finalText: null,
  model: null,
  qaFlags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: 'Событие',
  slug: 'sobytie-evt-1',
  sourceDescription: 'Оригинальное описание события от провайдера.',
  sessionDurationMinutes: [65],
  ...REVISION_HASH_ROW,
};
REVISION_ROW.sourceHash = contentHashOf(REVISION_ROW);

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
  assert.ok(
    !db.calls.some((call) => /insert into "EventOverride"|update "EventOverride"/.test(call.sql)),
    'generate must not publish',
  );
});

test('approve moves the revision to APPROVED and never publishes', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'CHECKED', draftText: 'Черновик рерайта.' }] };
    }
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/approve', body: {}, response }),
  );
  assert.equal(handled, true);
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  assert.equal(body.status, 'APPROVED');

  const approve = db.calls.find((call) => call.sql.includes("set status = 'APPROVED'"));
  assert.ok(approve, 'approval transition must run');
  assert.equal(approve.params[1], 'Черновик рерайта.');
  assert.match(approve.sql, /status in \('GENERATED', 'CHECKED'\)/);
  assert.ok(
    !db.calls.some((call) => /insert into "EventOverride"|update "EventOverride"/.test(call.sql)),
    'approve must not publish',
  );
});

test('approve refuses a revision that is not GENERATED or CHECKED', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'QUEUED', draftText: 'Черновик.' }] };
    }
    // The guarded transition matches nothing: the row is not approvable.
    return { rows: [] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/approve', body: {}, response }),
  );
  assert.equal(handled, true);
  assert.equal(response.statusCode, 409);
  assert.equal(JSON.parse(response.body).error, 'revision_not_approvable');
});

test('publish writes the approved text to EventOverride and marks PUBLISHED', async () => {
  const response = createMockResponse();
  let invalidatedWith = '';
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'APPROVED', draftText: 'Черновик.', finalText: 'Финальный текст.' }] };
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
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/publish', body: {}, response }),
  );
  assert.equal(handled, true);
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  assert.equal(body.status, 'PUBLISHED');

  const insert = db.calls.find((call) => call.sql.includes('insert into "EventOverride"'));
  assert.ok(insert, 'publish must write the override');
  assert.equal(insert.params[2], 'Финальный текст.');
  const markPublished = db.calls.find((call) => call.sql.includes("set status = 'PUBLISHED'"));
  assert.ok(markPublished);
  assert.match(markPublished.sql, /status = 'APPROVED'/);
  assert.equal(invalidatedWith, 'sobytie-evt-1');
});

test('publish refuses a revision that is not approved', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'CHECKED', draftText: 'Черновик.' }] };
    }
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/publish', body: {}, response }),
  );
  assert.equal(handled, true);
  assert.equal(response.statusCode, 409);
  assert.equal(JSON.parse(response.body).error, 'revision_not_approved');
  assert.ok(!db.calls.some((call) => /insert into "EventOverride"/.test(call.sql)));
});

test('publish marks STALE when the input changed after approval', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      // Approved before the price moved: the stored hash no longer matches.
      return { rows: [{ ...REVISION_ROW, status: 'APPROVED', finalText: 'Финал.', priceFromRub: 1900 }] };
    }
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/publish', body: {}, response }),
  );
  assert.equal(handled, true);
  assert.equal(response.statusCode, 409);
  assert.equal(JSON.parse(response.body).error, 'stale_source');
  assert.ok(db.calls.some((call) => call.sql.includes("'STALE'")));
  assert.ok(!db.calls.some((call) => /insert into "EventOverride"/.test(call.sql)));
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

test('approve refuses when a significant catalogue input changed', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      // Same provider text, but the price moved after the revision was queued, so
      // the stored hash no longer matches the recomputed one. This is the case the
      // text-only formula missed: it compared the description alone and published
      // a draft built from an outdated price.
      return { rows: [{ ...REVISION_ROW, status: 'CHECKED', draftText: 'Черновик.', priceFromRub: 1900 }] };
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

test('approve still succeeds when only the nearest session moved', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      // A session passed since the revision was queued: the now()-relative fields
      // moved, the content did not. The approval must survive - otherwise every
      // rolling schedule would expire once a day for no editorial reason.
      return {
        rows: [
          {
            ...REVISION_ROW,
            status: 'CHECKED',
            draftText: 'Черновик.',
            next_session: '2026-11-20T16:00:00.000Z',
            future_sessions: 2,
          },
        ],
      };
    }
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/approve', body: {}, response }),
  );
  assert.equal(handled, true);
  assert.notEqual(response.statusCode, 409, 'approval must not be refused as stale');
  assert.equal(JSON.parse(response.body).status, 'APPROVED');
  assert.ok(!db.calls.some((call) => call.sql.includes("'STALE'")));
});

test('publish writes the full hash to EventOverride, not the revision content hash', async () => {
  const response = createMockResponse();
  const approvedRow = { ...REVISION_ROW, status: 'APPROVED', draftText: 'Черновик.', finalText: 'Финал.' };
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) return { rows: [approvedRow] };
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({ db, invalidatePublicCaches() {} });

  await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/publish', body: {}, response }),
  );
  const insert = db.calls.find((call) => call.sql.includes('insert into "EventOverride"'));
  assert.ok(insert);
  assert.equal(insert.params[3], sourceHashOf(approvedRow), 'override keeps the full hash');
  assert.notEqual(insert.params[3], approvedRow.sourceHash, 'content and full hashes must differ');
});

test('approve refuses when the actor cannot be resolved', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'CHECKED', draftText: 'Черновик.' }] };
    }
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({
    db,
    invalidatePublicCaches() {},
    resolveActor: () => null,
  });

  const handled = await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/approve', body: {}, response }),
  );
  assert.equal(handled, true);
  assert.equal(response.statusCode, 409);
  assert.equal(JSON.parse(response.body).error, 'actor_unresolved');
  assert.ok(
    !db.calls.some((call) => call.sql.includes("set status = 'APPROVED'")),
    'a fake approver is worse than no approval',
  );
});

test('approve stores the resolved actor id', async () => {
  const response = createMockResponse();
  const db = createMockDb((sql) => {
    if (sql.includes('sessionDurationMinutes')) {
      return { rows: [{ ...REVISION_ROW, status: 'CHECKED', draftText: 'Черновик.' }] };
    }
    return { rows: [{ id: 'edr_1' }] };
  });
  const handler = createDescriptionRevisionRouteHandler({
    db,
    invalidatePublicCaches() {},
    resolveActor: () => 'adm_42',
  });

  await handler(
    createRouteContext({ method: 'POST', pathname: '/api/admin/rewrite-queue/edr_1/approve', body: {}, response }),
  );
  const approve = db.calls.find((call) => call.sql.includes("set status = 'APPROVED'"));
  assert.ok(approve);
  assert.equal(approve.params[2], 'adm_42');
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