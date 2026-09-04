import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectSeparateCityHubNames,
  mapGroupedPublicSession,
  pickCatalogSubcategories,
  type PublicCatalogMappingRow,
} from './public-catalog.mapper.js';
import { prismaWallTimeToIso } from './public-datetime.js';

function futureSlotIso(hoursFromNow = 48): string {
  return new Date(Date.now() + hoursFromNow * 3_600_000).toISOString();
}

const originalToken = process.env.TICKETSCLOUD_WIDGET_TOKEN;

test.before(() => {
  process.env.TICKETSCLOUD_WIDGET_TOKEN = 'test-token';
});

test.after(() => {
  if (originalToken == null) delete process.env.TICKETSCLOUD_WIDGET_TOKEN;
  else process.env.TICKETSCLOUD_WIDGET_TOKEN = originalToken;
});

test('uses ProviderLink SESSION identity for a Ticketscloud slot', () => {
  const result = mapGroupedPublicSession(catalogRow({
    upcomingSlots: [{
      id: 'session-local-1',
      eventId: 'event-local-1',
      startsAt: futureSlotIso(24),
      sourceCode: 'TICKETSCLOUD',
      providerSessionId: 'tc-session-42',
      providerEventId: 'tc-event-parent',
    }],
  }));
  assert.ok(result);

  const purchaseUrl = result.upcomingSlots?.[0]?.purchaseUrl;
  assert.ok(purchaseUrl);
  assert.equal(new URL(purchaseUrl).searchParams.get('event'), 'tc-session-42');
  assert.equal(result.upcomingSlots?.[0]?.id, 'session-local-1');
});

test('skips teplohod placeholder image and falls back to venue hero', () => {
  const result = mapGroupedPublicSession(catalogRow({
    sourceCode: 'TEPLOHOD',
    imageUrl: 'https://api.teplohod.info/v1/image?item=&dirtyAlias=placeHolder.gif',
    venueHeroImageUrl: 'https://api.teplohod.info/v1/image?item=Event179&dirtyAlias=b82266d150-1.jpg',
  }));
  assert.ok(result);

  assert.equal(result.imageUrl, 'https://api.teplohod.info/v1/image?item=Event179&dirtyAlias=b82266d150-1.jpg');
});

test('regional towns fold to the subject until they qualify as a separate hub', () => {
  const sortavala = mapGroupedPublicSession(catalogRow({
    city: 'Сортавала',
    citySlug: 'sortavala',
    cityIsDestination: false,
    regionTitle: 'Республика Карелия',
    regionSlug: 'respublika-kareliya',
  }));
  assert.ok(sortavala);
  assert.equal(sortavala.city, 'Сортавала');
  assert.equal(sortavala.destination, 'Республика Карелия');
  assert.equal(sortavala.destinationType, 'region');

  const tolyattiFolded = mapGroupedPublicSession(catalogRow({
    city: 'Тольятти',
    citySlug: 'tolyatti',
    cityIsDestination: false,
    regionTitle: 'Самарская область',
    regionSlug: 'samarskaya-oblast',
  }));
  assert.ok(tolyattiFolded);
  assert.equal(tolyattiFolded.destination, 'Самарская область');
  assert.equal(tolyattiFolded.destinationType, 'region');

  const tolyattiHub = mapGroupedPublicSession(
    catalogRow({
      city: 'Тольятти',
      citySlug: 'tolyatti',
      cityIsDestination: false,
      regionTitle: 'Самарская область',
      regionSlug: 'samarskaya-oblast',
    }),
    new Set(),
    { separateCityHubs: new Set(['Тольятти']) },
  );
  assert.ok(tolyattiHub);
  assert.equal(tolyattiHub.destination, 'Тольятти');
  assert.equal(tolyattiHub.destinationType, 'city');
});

test('subject capitals stay city destinations even when isDestination is false', () => {
  const result = mapGroupedPublicSession(catalogRow({
    city: 'Ханты-Мансийск',
    citySlug: 'hanty-mansiysk',
    cityIsDestination: false,
    regionTitle: 'Ханты-Мансийский автономный округ',
    regionSlug: 'hanty-mansiyskiy-avtonomnyy-okrug',
  }));
  assert.ok(result);
  assert.equal(result.destination, 'Ханты-Мансийск');
  assert.equal(result.destinationType, 'city');

  const vladikavkaz = mapGroupedPublicSession(catalogRow({
    city: 'Владикавказ',
    citySlug: 'vladikavkaz',
    cityIsDestination: false,
    regionTitle: 'Республика Северная Осетия-Алания',
  }));
  assert.ok(vladikavkaz);
  assert.equal(vladikavkaz.destination, 'Владикавказ');
  assert.equal(vladikavkaz.destinationType, 'city');
});

test('collectSeparateCityHubNames counts only folding towns above the card gate', () => {
  const hubs = collectSeparateCityHubNames([
    ...Array.from({ length: 6 }, () => catalogRow({ city: 'Тольятти', sourceStatus: 'PUBLIC' })),
    ...Array.from({ length: 3 }, () => catalogRow({ city: 'Сортавала', sourceStatus: 'PUBLIC' })),
    ...Array.from({ length: 3 }, () => catalogRow({ city: 'Ханты-Мансийск', sourceStatus: 'PUBLIC' })),
  ]);
  assert.equal(hubs.has('Тольятти'), true);
  assert.equal(hubs.has('Сортавала'), false);
  assert.equal(hubs.has('Ханты-Мансийск'), false);
});

test('rewrites pre-signed Teplohod S3 URLs to stable image proxy', () => {
  const result = mapGroupedPublicSession(catalogRow({
    sourceCode: 'TEPLOHOD',
    imageUrl:
      'https://s3.twcstorage.ru/teplohod-private/images/cache/Events/Event498/38b30dabbe-1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=21600&X-Amz-Signature=deadbeef',
  }));
  assert.ok(result);

  assert.equal(
    result.imageUrl,
    'https://api.teplohod.info/v1/image?item=Event498&dirtyAlias=38b30dabbe-1.jpg',
  );
});

test('uses ProviderLink SESSION parent identity for a Teplohod slot', () => {
  const result = mapGroupedPublicSession(catalogRow({
    sourceCode: 'TEPLOHOD',
    sourceName: 'Teplohod.info',
    sourceLabel: 'Teplohod.info',
    externalId: '14',
    offerSourceCode: 'TEPLOHOD',
    upcomingSlots: [{
      id: 'session-local-2',
      eventId: 'event-local-2',
      startsAt: futureSlotIso(25),
      sourceCode: 'TEPLOHOD',
      providerSessionId: 'schedule-7',
      providerEventId: '14',
    }],
  }));
  assert.ok(result);

  assert.equal(
    result.upcomingSlots?.[0]?.purchaseUrl,
    'https://account.teplohod.info/order/event-order?widget_id=14208&event_id=14',
  );
});

test('keeps open-date events saleable without a fake schedule', () => {
  const result = mapGroupedPublicSession(catalogRow({
    kind: 'OPEN_DATE',
    sourceStatus: 'open_date',
    startsAt: null,
    upcomingSlots: [],
  }));
  assert.ok(result);

  assert.equal(result.startsAt, '');
  assert.equal(result.dateLabel, 'Открытая дата');
  assert.equal(result.timeLabel, 'В виджете');
});

test('drops closed and STAND_BY slots from public upcomingSlots', () => {
  const openIso = futureSlotIso(24);
  const closedIso = futureSlotIso(30);
  const standByIso = futureSlotIso(36);
  const result = mapGroupedPublicSession(catalogRow({
    sourceStatus: 'PUBLIC',
    upcomingSlots: [
      {
        id: 'sess-open',
        eventId: 'evt-open',
        startsAt: openIso,
        sourceCode: 'TICKETSCLOUD',
        sourceStatus: 'PUBLIC',
        providerSessionId: 'tc-open',
      },
      {
        id: 'sess-closed',
        eventId: 'evt-closed',
        startsAt: closedIso,
        sourceCode: 'TICKETSCLOUD',
        sourceStatus: 'closed',
        providerSessionId: 'tc-closed',
      },
      {
        id: 'sess-standby',
        eventId: 'evt-standby',
        startsAt: standByIso,
        sourceCode: 'TICKETSCLOUD',
        sourceStatus: 'STAND_BY',
        providerSessionId: 'tc-standby',
      },
    ],
  }));
  assert.ok(result);
  assert.equal(result.upcomingSlots?.length, 1);
  assert.equal(result.upcomingSlots?.[0]?.id, 'sess-open');
});

test('hides whole card when event sourceStatus means sales stopped', () => {
  const result = mapGroupedPublicSession(catalogRow({
    sourceStatus: 'STAND_BY',
    upcomingSlots: [{
      id: 'sess-1',
      eventId: 'evt-1',
      startsAt: futureSlotIso(24),
      sourceCode: 'TICKETSCLOUD',
      sourceStatus: 'PUBLIC',
      providerSessionId: 'tc-1',
    }],
  }));
  assert.equal(result, null);
});

test('dated TicketsCloud without schedule does not get fake open-date labels', () => {
  const result = mapGroupedPublicSession(catalogRow({
    kind: 'RECURRING',
    sourceStatus: 'PUBLIC',
    startsAt: null,
    upcomingSlots: [],
  }));
  assert.ok(result);

  assert.notEqual(result.dateLabel, 'Открытая дата');
  assert.notEqual(result.timeLabel, 'В виджете');
});
test('converts imported Moscow wall time to the real UTC instant', () => {
  const prismaTimestamp = new Date('2026-07-10T16:30:00.000Z');

  assert.equal(prismaWallTimeToIso(prismaTimestamp), '2026-07-10T13:30:00.000Z');
});

test('catalog mapper keeps Date and ISO string startsAt on the same UTC clock', () => {
  const iso = futureSlotIso(48);
  const fromDate = mapGroupedPublicSession(
    catalogRow({
      city: 'Санкт-Петербург',
      citySlug: 'sankt-peterburg',
      startsAt: new Date(iso),
      upcomingSlots: [
        { eventId: 'evt-a', startsAt: iso },
        { eventId: 'evt-b', startsAt: new Date(iso) },
        { eventId: 'evt-c', startsAt: iso },
      ],
    }),
  );
  assert.ok(fromDate);
  assert.equal(fromDate.startsAt, iso);
  assert.equal(fromDate.upcomingSlots?.length, 1);
  assert.equal(fromDate.upcomingSlots?.[0]?.startsAt, iso);
  assert.equal(fromDate.upcomingSlots?.[0]?.timeLabel, fromDate.timeLabel);
});

test('catalog mapper drops same-event −3h phantom next to real MSK slot', () => {
  const realIso = futureSlotIso(48);
  const phantomIso = new Date(Date.parse(realIso) - 3 * 3_600_000).toISOString();
  const nextIso = new Date(Date.parse(realIso) + 24 * 3_600_000).toISOString();
  const result = mapGroupedPublicSession(
    catalogRow({
      id: 'evt_bridges',
      city: 'Санкт-Петербург',
      citySlug: 'sankt-peterburg',
      startsAt: new Date(phantomIso),
      upcomingSlots: [
        { eventId: 'evt_bridges', startsAt: phantomIso },
        { eventId: 'evt_bridges', startsAt: realIso },
        { eventId: 'evt_bridges_next', startsAt: nextIso },
      ],
    }),
  );
  assert.ok(result);
  assert.equal(result.startsAt, realIso);
  assert.deepEqual(
    result.upcomingSlots?.map((slot) => slot.startsAt),
    [realIso, nextIso],
  );
  assert.equal(result.upcomingSlots?.[0]?.timeLabel, result.upcomingSlots?.[1]?.timeLabel);
});

test('drops bus subcategory labels from river cruise cards', () => {
  const labels = pickCatalogSubcategories({
    category: 'Экскурсии',
    title: 'Речная прогулка «Доброе утро, Татарстан»',
    venue: 'Речной порт Казань, ул. Девятаева 1',
    subcategories: ['Автобусные экскурсии', 'Водные экскурсии', 'Автобусные туры'],
    tags: [],
  });

  assert.deepEqual(labels, ['Водные экскурсии']);
});

function catalogRow(overrides: Partial<PublicCatalogMappingRow> = {}): PublicCatalogMappingRow {
  return {
    id: 'event-local-1',
    slug: 'test-event',
    externalId: 'tc-event-parent',
    sourceCode: 'TICKETSCLOUD',
    sourceName: 'Ticketscloud',
    sourceLabel: 'Ticketscloud',
    title: 'Тестовая речная прогулка',
    description: null,
    kind: 'RECURRING',
    sourceStatus: null,
    imageUrl: null,
    category: 'Экскурсии',
    cityId: 'city-spb',
    city: 'Санкт-Петербург',
    citySlug: 'sankt-peterburg',
    cityHeroImageUrl: null,
    cityIsDestination: true,
    regionId: null,
    regionSlug: null,
    regionTitle: null,
    venueId: 'venue-1',
    venueSlug: 'prichal-1',
    venue: 'Причал 1',
    venueAddress: null,
    venueHeroImageUrl: null,
    venueKind: 'PIER',
    overrideTitle: null,
    overrideMergeGroupKey: null,
    overrideDescription: null,
    overrideShortDescription: null,
    overrideImageUrl: null,
    offerSourceCode: 'TICKETSCLOUD',
    offerTitle: null,
    offerPriceRub: 1000,
    offerWidgetUrl: null,
    offerDeeplinkUrl: null,
    startsAt: futureSlotIso(24),
    tags: ['Водные экскурсии'],
    subcategories: ['Водные экскурсии'],
    groupKey: 'ticketscloud|test-event|spb|venue-1',
    groupEventIds: ['event-local-1'],
    groupedEventsCount: 1,
    sessionCount: 1,
    priceFrom: 1000,
    vacant: 10,
    upcomingSlots: [],
    ...overrides,
  } as PublicCatalogMappingRow;
}
