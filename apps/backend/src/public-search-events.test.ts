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

test('maps a dated slot through its same-city Ticketscloud product title only when one page is linked', async () => {
  let call = 0;
  const db = {
    async query(sql: string, params: unknown[]) {
      call += 1;
      if (call === 1) {
        assert.deepEqual(params, [['slot-event-id']]);
        assert.match(sql, /source\.code::text\) = 'TICKETSCLOUD'/);
        return { rows: [{
          eventId: 'slot-event-id', title: '25.11.2026 — River Jazz', cityId: 'moscow',
          sourceId: 'tc', metaExternalId: 'parent-1', metaCount: 1, directPageId: null, directPageSlug: null,
          organizerId: 'organizer-1', sellerId: 'seller-1',
        }] };
      }
      assert.match(sql, /jsonb_to_recordset/);
      const groupKey = JSON.stringify(['tc', 'parent-1', 'moscow', 'river jazz']);
      assert.deepEqual(JSON.parse(String(params[0])), [{
        groupKey, sourceId: 'tc', metaExternalId: 'parent-1', cityId: 'moscow', productKey: 'river jazz',
      }]);
      return { rows: [
        { groupKey, memberEventId: 'slot-event-id', title: '25.11.2026 — River Jazz', venueId: 'pier-a', pageId: 'page-1', slug: 'stable-tour-moscow', status: 'READY', organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
        { groupKey, memberEventId: 'slot-sibling', title: '26.11.2026 — River Jazz', venueId: 'pier-b', pageId: null, slug: null, status: 'READY', organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
        { groupKey, memberEventId: 'different-program', title: 'Christmas Jazz', venueId: 'pier-c', pageId: 'page-2', slug: 'christmas-jazz', status: 'READY', organizerId: 'organizer-1', sellerId: 'seller-1', isSaleable: true },
      ] };
    },
  };
  const result = await resolveEventPageSlugsForEventIds(['slot-event-id'], db);
  assert.equal(result.get('slot-event-id'), 'stable-tour-moscow');
  assert.equal(call, 2);
});

test('maps explicitly grouped Events to their unique same-city same-venue EventPage without TC metadata', async () => {
  const pageRows = [{ groupKey: JSON.stringify(['harry-potter-spb', 'spb', 'museum']), pageId: 'page-hp', slug: 'muzei-garri-pottera-sankt-peterburg' }];
  let call = 0;
  const db = {
    async query(sql: string, params: unknown[]) {
      call += 1;
      if (call === 1) {
        assert.deepEqual(params, [['combo-1-slot', 'combo-2-slot']]);
        return { rows: [1, 2].map((number) => ({
          eventId: `combo-${number}-slot`, title: `Комбо ${number}`, cityId: 'spb', venueId: 'museum',
          mergeGroupKey: 'harry-potter-spb', directPageId: null, directPageSlug: null,
          metaCount: 0, sourceId: null, metaExternalId: null,
        })) };
      }
      assert.match(sql, /EventOverride/);
      assert.match(sql, /EventPageEvent/);
      assert.deepEqual(JSON.parse(String(params[0])), [{
        groupKey: JSON.stringify(['harry-potter-spb', 'spb', 'museum']),
        mergeGroupKey: 'harry-potter-spb', cityId: 'spb', venueId: 'museum', eventIds: ['combo-1-slot', 'combo-2-slot'],
      }]);
      return { rows: pageRows };
    },
  };

  const result = await resolveEventPageSlugsForEventIds(['combo-1-slot', 'combo-2-slot'], db);
  assert.equal(result.get('combo-1-slot'), 'muzei-garri-pottera-sankt-peterburg');
  assert.equal(result.get('combo-2-slot'), 'muzei-garri-pottera-sankt-peterburg');
  assert.equal(call, 2);
});

test('does not map an explicit merge group when its Events point to multiple EventPages', async () => {
  let call = 0;
  const db = {
    async query() {
      call += 1;
      if (call === 1) return { rows: [{
        eventId: 'combo-slot', title: 'Комбо 1', cityId: 'spb', venueId: 'museum',
        mergeGroupKey: 'harry-potter-spb', directPageId: null, directPageSlug: null,
        metaCount: 0, sourceId: null, metaExternalId: null,
      }] };
      return { rows: [
        { groupKey: JSON.stringify(['harry-potter-spb', 'spb', 'museum']), pageId: 'page-1', slug: 'potter-a' },
        { groupKey: JSON.stringify(['harry-potter-spb', 'spb', 'museum']), pageId: 'page-2', slug: 'potter-b' },
      ] };
    },
  };
  const result = await resolveEventPageSlugsForEventIds(['combo-slot'], db);
  assert.equal(result.has('combo-slot'), false);
  assert.equal(call, 2);
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
      return { rows: [{
        eventId: 'slot-event-id', directPageId: 'page-1', directPageSlug: 'stable-event-moscow',
        title: 'Show', cityId: 'moscow', metaCount: 0,
      }] };
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
      return { rows: [{
        eventId, directPageId: 'page-1', directPageSlug: 'stable-event-page',
        title: 'Current show', cityId: 'moscow', metaCount: 0,
      }] };
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
