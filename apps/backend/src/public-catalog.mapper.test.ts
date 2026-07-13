import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapGroupedPublicSession,
  pickCatalogSubcategories,
  type PublicCatalogMappingRow,
} from './public-catalog.mapper.js';
import { prismaWallTimeToIso } from './public-datetime.js';

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
      startsAt: '2026-07-10T12:00:00.000Z',
      sourceCode: 'TICKETSCLOUD',
      providerSessionId: 'tc-session-42',
      providerEventId: 'tc-event-parent',
    }],
  }));

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

  assert.equal(
    result.imageUrl,
    'https://api.teplohod.info/v1/image?item=Event179&dirtyAlias=b82266d150-1.jpg',
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
      startsAt: '2026-07-10T13:00:00.000Z',
      sourceCode: 'TEPLOHOD',
      providerSessionId: 'schedule-7',
      providerEventId: '14',
    }],
  }));

  assert.equal(result.upcomingSlots?.[0]?.purchaseUrl, 'https://teplohod.info/event/14');
});

test('keeps open-date events saleable without a fake schedule', () => {
  const result = mapGroupedPublicSession(catalogRow({
    kind: 'OPEN_DATE',
    sourceStatus: 'open_date',
    startsAt: null,
    upcomingSlots: [],
  }));

  assert.equal(result.startsAt, '');
  assert.equal(result.dateLabel, 'Открытая дата');
  assert.equal(result.timeLabel, 'В виджете');
});

test('converts imported Moscow wall time to the real UTC instant', () => {
  const prismaTimestamp = new Date('2026-07-10T16:30:00.000Z');

  assert.equal(prismaWallTimeToIso(prismaTimestamp), '2026-07-10T13:30:00.000Z');
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
    startsAt: '2026-07-10T12:00:00.000Z',
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
