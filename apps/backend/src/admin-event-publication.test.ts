import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { createAdminEventsRouteHandler } from './admin-events-handler.js';
import { buildPublicEventPage, updateAdminEventOverride } from './dto.js';
import type { RouteContext } from './routing.js';

function publicationDb(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const db = {
    async query(sql: string) {
      calls.push(sql);
      if (sql.includes('from "EventOverride"') && !sql.includes('insert into')) return { rows: [] };
      if (sql.includes('from "Event" e')) {
        return {
          rows: [{
            id: 'event-1', slug: 'pilot-event', title: 'Тестовое событие', kind: 'OPEN_DATE',
            status: 'REVIEW', purchaseFlow: 'EXTERNAL', managementMode: 'SOURCE_MANAGED', offerSourceCode: 'MANUAL', offerPriceRub: 350,
            priceFromRub: 350, city: 'Клин', cityId: 'city-1', venue: 'Музей', venueId: 'venue-1',
            categoryId: 'category-1', primarySubcategoryId: 'subcategory-1',
            description: 'Описание события '.repeat(15), descriptionLength: 255,
            imageUrl: 'https://example.com/image.jpg', tags: [], subcategoryIds: [],
            ...overrides,
          }],
        };
      }
      if (sql.includes('insert into "EventOverride"')) return { rows: [{ editorStatus: 'PUBLISHED' }] };
      throw new Error(`Unexpected query: ${sql.slice(0, 80)}`);
    },
  };
  return { db, calls };
}

test('publishes an event with a real purchase entry', async () => {
  const { db, calls } = publicationDb({ offerWidgetUrl: 'https://tickets.example.com/buy' });
  await updateAdminEventOverride(db, 'event-1', { editorStatus: 'PUBLISHED' });
  assert.ok(calls.some((sql) => sql.includes('insert into "EventOverride"')));
});

test('rejects direct publication of supplier event before internal checkout is connected', async () => {
  const { db, calls } = publicationDb({ purchaseFlow: 'PLATFORM', managementMode: 'SUPPLIER_DRAFTS' });
  await assert.rejects(
    updateAdminEventOverride(db, 'event-1', { editorStatus: 'PUBLISHED' }),
    (error: Error & { statusCode?: number }) => error.statusCode === 422 && error.message.includes('нет виджета'),
  );
  assert.ok(!calls.some((sql) => sql.includes('insert into "EventOverride"')));
});

test('a supplier draft cannot be published by adding a purchase URL', async () => {
  const { db } = publicationDb({
    purchaseFlow: 'PLATFORM', managementMode: 'SUPPLIER_DRAFTS',
    offerWidgetUrl: 'https://tickets.example.com/buy',
  });
  await assert.rejects(
    updateAdminEventOverride(db, 'event-1', { editorStatus: 'PUBLISHED' }),
    (error: Error & { statusCode?: number }) => error.statusCode === 422 && error.message.includes('checkout ещё не подключён'),
  );
});

test('public event page does not expose a PLATFORM widget as checkout', async () => {
  const queries: string[] = [];
  const db = {
    async query(sql: string) {
      queries.push(sql);
      if (sql.startsWith('select id from "Event"')) return { rows: [{ id: 'event-1' }] };
      if (sql.includes('from "Event" e')) return {
        rows: [{ id: 'event-1', slug: 'pilot-event', status: 'READY', purchaseFlow: 'PLATFORM' }],
      };
      throw new Error(`Unexpected query: ${sql.slice(0, 80)}`);
    },
  };
  assert.equal(await buildPublicEventPage(db as never, 'pilot-event'), null);
  assert.equal(queries.length, 2);
  assert.ok(queries[1]?.includes('e."purchaseFlow"'));
});

test('moderation endpoint returns 422 and leaves public cache untouched', async () => {
  const { db } = publicationDb({ purchaseFlow: 'PLATFORM', managementMode: 'SUPPLIER_DRAFTS' });
  let invalidated = false;
  let statusCode = 0;
  let body = '';
  const request = Readable.from([JSON.stringify({ editorStatus: 'PUBLISHED' })]);
  const response = {
    writeHead(status: number) { statusCode = status; },
    end(chunk: string) { body = chunk; },
  };
  const pathname = '/api/admin/events/event-1/moderation';
  const handler = createAdminEventsRouteHandler({
    db: db as never,
    updateAdminEventOverride,
    invalidatePublicCaches() { invalidated = true; },
  });
  const handled = await handler({
    request, response, pathname, method: 'PATCH',
    url: new URL(pathname, 'https://example.com'),
    route: `PATCH ${pathname}`,
    searchParams: new URLSearchParams(),
  } as unknown as RouteContext);
  assert.equal(handled, true);
  assert.equal(statusCode, 422);
  assert.match(JSON.parse(body).error, /event_publish_blocked/);
  assert.equal(invalidated, false);
});
