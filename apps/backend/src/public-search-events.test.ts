import assert from 'node:assert/strict';
import test from 'node:test';

import { collapsePublicSearchEventRows, publicSearchEventHref } from './public-search-events.ts';
import { resolveEventPageSlugsForEventIds, rewriteArticleEventLinks } from './public-event-page-links.ts';

test('search links to the stable EventPage route when mapped', () => {
  assert.equal(publicSearchEventHref({ id: 'slot-a', slug: 'slot-a-123', eventPageSlug: 'event-page-moscow', title: 'Event' }), '/events/event-page-moscow');
});

test('search keeps the current event route as fallback without an EventPage', () => {
  assert.equal(publicSearchEventHref({ id: 'slot-a', slug: 'slot-a-123', title: 'Event' }), '/events/slot-a-123');
});

test('maps a dated slot through its same-city Ticketscloud parent only when one page is linked', async () => {
  const db = {
    async query(sql: string, params: unknown[]) {
      assert.deepEqual(params, [['slot-event-id']]);
      assert.match(sql, /source\.code::text\) = 'TICKETSCLOUD'/);
      assert.match(sql, /trim\(sibling\."metaExternalId"\) = requested_meta\."metaExternalId"/);
      assert.match(sql, /sibling_event\."primaryCityId" IS NOT DISTINCT FROM requested_event\."primaryCityId"/);
      assert.match(sql, /HAVING count\(DISTINCT page\.id\) = 1/);
      return { rows: [{ eventId: 'slot-event-id', slug: 'stable-tour-moscow' }] };
    },
  };
  const result = await resolveEventPageSlugsForEventIds(['slot-event-id'], db);
  assert.equal(result.get('slot-event-id'), 'stable-tour-moscow');
});

test('published article links for a slot use its stable EventPage path', async () => {
  let call = 0;
  const db = {
    async query(sql: string, params: unknown[]) {
      call += 1;
      if (sql.includes('FROM "Event" event')) {
        assert.deepEqual(params, [['old-slot'], ['/events/old-slot'], []]);
        return { rows: [{ id: 'slot-event-id', slug: 'old-slot', canonicalPath: '/events/old-slot' }] };
      }
      assert.deepEqual(params, [['slot-event-id']]);
      return { rows: [{ eventId: 'slot-event-id', slug: 'stable-event-moscow' }] };
    },
  };
  assert.equal(await rewriteArticleEventLinks('Text [event](/events/old-slot).', db), 'Text [event](/events/stable-event-moscow).');
  assert.equal(call, 2);
});

test('article links with an exact Event ID use the stable EventPage even when the legacy slug differs', async () => {
  let call = 0;
  const eventId = 'evt_6ab3b9552dce1463cb54a570';
  const content = 'Text [event](/events/old-slot-6ab3b9552dce1463cb54a570).';
  const db = {
    async query(sql: string, params: unknown[]) {
      call += 1;
      if (sql.includes('FROM "Event" event')) {
        assert.deepEqual(params, [
          ['old-slot-6ab3b9552dce1463cb54a570'],
          ['/events/old-slot-6ab3b9552dce1463cb54a570'],
          [eventId],
        ]);
        return { rows: [{ id: eventId, slug: 'current-event-slug', canonicalPath: '/events/current-event-slug' }] };
      }
      assert.deepEqual(params, [[eventId]]);
      return { rows: [{ eventId, slug: 'stable-event-page' }] };
    },
  };

  assert.equal(await rewriteArticleEventLinks(content, db), 'Text [event](/events/stable-event-page).');
  assert.equal(call, 2);
});

test('article links without an exact EventPage mapping retain their original destination', async () => {
  const db = { async query() { return { rows: [] }; } };
  const content = 'Text [event](https://daibilet.ru/events/past-slot).';
  assert.equal(await rewriteArticleEventLinks(content, db), content);
});

test('search collapses TC slot twins into one logical event', () => {
  const rows = [1, 2, 3, 4].map((index) => ({
    id: `slot-${index}`,
    slug: `bilet-v-muzei-matreshki-${index}`,
    title: 'Билет в Музей Матрешки',
    city: 'Санкт-Петербург',
    venue: 'Музей Матрешки',
  }));

  const result = collapsePublicSearchEventRows(rows, 6);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, 'slot-1');
});

test('same event title in different cities or venues stays distinct', () => {
  const rows = [
    {
      id: 'spb-museum',
      slug: 'night-at-museum-spb',
      title: 'Ночь в музее',
      city: 'Санкт-Петербург',
      venue: 'Музей А',
    },
    {
      id: 'spb-gallery',
      slug: 'night-at-gallery-spb',
      title: 'Ночь в музее',
      city: 'Санкт-Петербург',
      venue: 'Галерея Б',
    },
    {
      id: 'moscow-museum',
      slug: 'night-at-museum-moscow',
      title: 'Ночь в музее',
      city: 'Москва',
      venue: 'Музей А',
    },
  ];

  assert.equal(collapsePublicSearchEventRows(rows, 6).length, 3);
});

test('search fills its limit after duplicate rows are removed', () => {
  const rows = [
    ...[1, 2, 3].map((index) => ({
      id: `slot-${index}`,
      slug: `event-${index}`,
      title: 'Одинаковое событие',
      city: 'Москва',
      venue: 'Клуб',
    })),
    {
      id: 'unique-1',
      slug: 'unique-1',
      title: 'Первое уникальное событие',
      city: 'Москва',
      venue: 'Клуб',
    },
    {
      id: 'unique-2',
      slug: 'unique-2',
      title: 'Второе уникальное событие',
      city: 'Москва',
      venue: 'Клуб',
    },
  ];

  assert.deepEqual(
    collapsePublicSearchEventRows(rows, 3).map((row) => row.id),
    ['slot-1', 'unique-1', 'unique-2'],
  );
});

test('search groups only Events explicitly linked to the same EventPage', () => {
  const rows = [
    { id: 'slot-1', slug: 'slot-1', eventPageSlug: 'shared-tour', title: 'Tour', city: 'Москва', venue: 'Hall' },
    { id: 'slot-2', slug: 'slot-2', eventPageSlug: 'shared-tour', title: 'Tour', city: 'Москва', venue: 'Hall' },
    { id: 'other', slug: 'other', eventPageSlug: 'tour-2', title: 'Tour', city: 'Москва', venue: 'Hall' },
  ];
  assert.deepEqual(
    collapsePublicSearchEventRows(rows, 6).map((row) => row.id),
    ['slot-1', 'other'],
  );
});
