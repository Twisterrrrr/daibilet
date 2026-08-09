import assert from 'node:assert/strict';
import test from 'node:test';
import {
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

  assert.equal(
    result.imageUrl,
    'https://api.teplohod.info/v1/image?item=Event179&dirtyAlias=b82266d150-1.jpg',
  );
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
  const iso = '2026-08-09T20:55:00.000Z';
  const fromDate = mapGroupedPublicSession(
    catalogRow({
      city: 'Санкт-Петербург',
      citySlug: 'sankt-peterburg',
      startsAt: new Date(iso),
      upcomingSlots: [
        { eventId: 'evt-a', startsAt: iso },
        { eventId: 'evt-b', startsAt: new Date(iso) },
        { eventId: 'evt-c', startsAt: '2026-08-09T20:55:00.000Z' },
      ],
    }),
  );
  assert.ok(fromDate);
  assert.equal(fromDate.startsAt, iso);
  assert.equal(fromDate.timeLabel, '23:55');
  assert.equal(fromDate.upcomingSlots?.length, 1);
  assert.equal(fromDate.upcomingSlots?.[0]?.timeLabel, '23:55');
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

function catalogRow(overrides: Partial<PublicCatalogMappingRow>): PublicCatalogMappingRow {
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
  };
}
