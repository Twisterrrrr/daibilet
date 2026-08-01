import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DAY_ROUTE_MAX,
  DAY_ROUTE_STORAGE_KEY,
  addTextStopToDayRoute,
  addToDayRoute,
  buildDayRouteCoordsMap,
  buildDayRouteSharePath,
  buildYandexMultiStopRouteUrl,
  catalogDayRouteVenueIds,
  clearDayRoute,
  dayRouteDominantCitySlug,
  dayRouteFullCoveredCount,
  dayRouteHasMixedCities,
  dayRouteMatchScore,
  enrichDayRouteFromMatchVenues,
  hydrateDayRouteFromShare,
  hydrateTextStopsFromShareTokens,
  isDayRouteShareTextToken,
  isInDayRoute,
  isTextDayRouteStop,
  lookupDayRouteCoords,
  optimizeDayRouteNearestNeighbor,
  parseDayRouteCoordsInput,
  parseDayRouteQueryParam,
  readDayRoute,
  resetDayRouteSnapshotCache,
  sameDayRouteVenue,
  subscribeDayRoute,
  venueMatchesRouteSlug,
  type DayRouteVenueItem,
} from './day-route.ts';

function mockStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  (globalThis as { window?: unknown }).window = globalThis;
  (globalThis as { localStorage?: unknown }).localStorage = localStorage;
  (globalThis as { Event?: unknown }).Event = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
  (globalThis as { dispatchEvent?: unknown }).dispatchEvent = () => true;
  (globalThis as { addEventListener?: unknown }).addEventListener = () => undefined;
  (globalThis as { removeEventListener?: unknown }).removeEventListener = () => undefined;
  resetDayRouteSnapshotCache();
  return store;
}

test('parseDayRouteQueryParam trims, dedupes, caps at MAX', () => {
  assert.deepEqual(parseDayRouteQueryParam(null), []);
  assert.deepEqual(parseDayRouteQueryParam(''), []);
  assert.deepEqual(parseDayRouteQueryParam(' a , b , a '), ['a', 'b']);
  const many = Array.from({ length: DAY_ROUTE_MAX + 3 }, (_, i) => `v${i}`).join(',');
  assert.equal(parseDayRouteQueryParam(many).length, DAY_ROUTE_MAX);
});

test('buildDayRouteSharePath prefers slug and encodes', () => {
  assert.equal(buildDayRouteSharePath([]), '/my-day');
  const path = buildDayRouteSharePath([
    { id: 'id1', slug: 'park-gorkogo', title: 'Парк' },
    { id: 'id2', slug: null, title: 'Пётр' },
  ]);
  assert.equal(path, `/my-day?day=${encodeURIComponent('park-gorkogo,id2')}`);
});

test('dayRouteHasMixedCities by cityId and by title', () => {
  const same: DayRouteVenueItem[] = [
    { id: '1', title: 'A', cityId: 'msk', city: 'Москва' },
    { id: '2', title: 'B', cityId: 'msk', city: 'Москва' },
  ];
  assert.equal(dayRouteHasMixedCities(same), false);
  const mixedIds: DayRouteVenueItem[] = [
    { id: '1', title: 'A', cityId: 'msk' },
    { id: '2', title: 'B', cityId: 'spb' },
  ];
  assert.equal(dayRouteHasMixedCities(mixedIds), true);
  const mixedTitles: DayRouteVenueItem[] = [
    { id: '1', title: 'A', city: 'Москва' },
    { id: '2', title: 'B', city: 'Санкт-Петербург' },
  ];
  assert.equal(dayRouteHasMixedCities(mixedTitles), true);
});

test('dayRouteDominantCitySlug picks majority', () => {
  assert.equal(dayRouteDominantCitySlug([]), null);
  assert.equal(
    dayRouteDominantCitySlug([
      { id: '1', title: 'A', citySlug: 'moscow' },
      { id: '2', title: 'B', citySlug: 'spb' },
      { id: '3', title: 'C', citySlug: 'moscow' },
    ]),
    'moscow',
  );
});

test('full covered count excludes nearby; match score includes nearby', () => {
  const covered = { stop: ['a'], start: ['b'], nearby: ['c'] };
  assert.equal(dayRouteFullCoveredCount(covered), 2);
  assert.equal(dayRouteMatchScore(covered), 3 + 2 + 1);
});

test('addToDayRoute appends multiple distinct venues', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', cityId: 'c1' });
  addToDayRoute({ id: 'b', title: 'B', cityId: 'c1' });
  addToDayRoute({ id: 'c', title: 'C', cityId: 'c1' });
  const state = readDayRoute();
  assert.equal(state.venues.length, 3);
  assert.deepEqual(
    state.venues.map((v) => v.id),
    ['a', 'b', 'c'],
  );
  assert.ok(localStorage.getItem(DAY_ROUTE_STORAGE_KEY));
});

test('isInDayRoute does not light sibling Fontanka/Ligovsky cards for one stored id', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'venue_5661d5a99cb5385800d8807d',
    slug: 'tochka-sbora',
    title: 'Место посадки — Лиговский пр. 10',
  });
  const state = readDayRoute();
  assert.equal(state.venues.length, 1);
  assert.equal(isInDayRoute('venue_5661d5a99cb5385800d8807d', state, 'tochka-sbora'), true);
  assert.equal(
    isInDayRoute(
      'venue_65f1b0a8a471ea32e7a902c4',
      state,
      'prichal-na-nab-reki-fontanki-71-59-926449-30-328948',
    ),
    false,
  );
  assert.equal(
    isInDayRoute('venue_664357d9859cee9d822848aa', state, 'prichal-na-nab-r-fontanki-105'),
    false,
  );
  assert.equal(isInDayRoute('', state), false);
});

test('isInDayRoute with id+slug ignores stored.slug colliding with another venue id', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'venue_FIRST',
    slug: 'venue_65f1b0a8a471ea32e7a902c4',
    title: 'Pathological slug=other id',
  });
  const state = readDayRoute();
  assert.equal(
    isInDayRoute(
      'venue_65f1b0a8a471ea32e7a902c4',
      state,
      'prichal-na-nab-reki-fontanki-71-59-926449-30-328948',
    ),
    false,
  );
  assert.equal(sameDayRouteVenue(state.venues[0]!, {
    id: 'venue_65f1b0a8a471ea32e7a902c4',
    slug: 'prichal-na-nab-reki-fontanki-71-59-926449-30-328948',
  }), false);
  const next = addToDayRoute({
    id: 'venue_65f1b0a8a471ea32e7a902c4',
    slug: 'prichal-na-nab-reki-fontanki-71-59-926449-30-328948',
    title: 'Причал Фонтанки 71',
  });
  assert.equal(next.venues.length, 2);
});

test('isInDayRoute still aliases slug-as-id must-see with catalog venue_* + same slug', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'tochka-sbora',
    slug: 'tochka-sbora',
    title: 'Must-see shape',
  });
  const state = readDayRoute();
  assert.equal(isInDayRoute('venue_5661d5a99cb5385800d8807d', state, 'tochka-sbora'), true);
});

test('subscribeDayRoute fires once per successful write with matching length', () => {
  mockStorage();
  clearDayRoute();
  const lengths: number[] = [];
  const unsubscribe = subscribeDayRoute((state) => {
    lengths.push(state.venues.length);
  });
  addToDayRoute({ id: 'a', title: 'A' });
  addToDayRoute({ id: 'b', title: 'B' });
  addToDayRoute({ id: 'c', title: 'C' });
  unsubscribe();
  assert.deepEqual(lengths, [1, 2, 3]);
  assert.equal(readDayRoute().venues.length, 3);
});

test('readDayRoute drops blank ids and dedupes slug twins', () => {
  mockStorage();
  localStorage.setItem(
    DAY_ROUTE_STORAGE_KEY,
    JSON.stringify({
      cityId: null,
      venues: [
        { id: '', title: 'Broken', slug: '' },
        { id: 'venue_a', title: 'A', slug: 'park-a' },
        { id: 'venue_a2', title: 'A twin', slug: 'park-a' },
      ],
    }),
  );
  resetDayRouteSnapshotCache();
  const state = readDayRoute();
  assert.equal(state.venues.length, 1);
  assert.equal(state.venues[0]!.id, 'venue_a');
});

test('addToDayRoute rejects blank id and does not collapse distinct venues', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: '', title: 'No id', slug: '' });
  assert.equal(readDayRoute().venues.length, 0);
  addToDayRoute({ id: '', title: 'By slug', slug: 'park-a' });
  addToDayRoute({ id: 'venue_b', title: 'B', slug: 'park-b' });
  addToDayRoute({ id: 'venue_c', title: 'C', slug: 'park-c' });
  assert.deepEqual(
    readDayRoute().venues.map((v) => v.id),
    ['park-a', 'venue_b', 'venue_c'],
  );
});

test('addToDayRoute merges event session meta on duplicate venue', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'venue_a', slug: 'park-a', title: 'Парк', cityId: 'c1' });
  addToDayRoute({
    id: 'venue_a',
    slug: 'park-a',
    title: 'Парк',
    cityId: 'c1',
    eventId: 'evt_1',
    sessionLabel: 'сб, 12:00',
    startsAt: '2026-08-02T12:00:00+03:00',
  });
  const state = readDayRoute();
  assert.equal(state.venues.length, 1);
  assert.equal(state.venues[0]!.eventId, 'evt_1');
  assert.equal(state.venues[0]!.sessionLabel, 'сб, 12:00');
});

test('venueMatchesRouteSlug rejects stale soft-nav payload', () => {
  const venueA = { id: 'venue_a', slug: 'park-a' };
  const venueB = { id: 'venue_b', slug: 'park-b' };
  assert.equal(venueMatchesRouteSlug(venueA, 'park-a'), true);
  assert.equal(venueMatchesRouteSlug(venueA, 'park-b'), false);
  assert.equal(venueMatchesRouteSlug(venueB, 'park-b'), true);
  assert.equal(venueMatchesRouteSlug(venueA, 'park-a-a'), false);
  assert.equal(
    venueMatchesRouteSlug(
      { id: 'venue_6407178af4d48cfebd200f18', slug: 'novodevichii-monastyr' },
      'name-6407178af4d48cfebd200f18',
    ),
    true,
  );
});

test('buildYandexMultiStopRouteUrl builds rtext multi-stop pedestrian route', () => {
  assert.equal(buildYandexMultiStopRouteUrl([]), null);
  assert.equal(buildYandexMultiStopRouteUrl([{ latitude: 55.75, longitude: 37.62 }]), null);
  const url = buildYandexMultiStopRouteUrl([
    { latitude: 55.75, longitude: 37.62 },
    { latitude: 55.76, longitude: 37.63 },
    { latitude: 55.77, longitude: 37.64 },
  ]);
  assert.equal(
    url,
    'https://yandex.ru/maps/?rtext=55.75,37.62~55.76,37.63~55.77,37.64&rtt=pd',
  );
});

test('optimizeDayRouteNearestNeighbor keeps first and appends missing coords', () => {
  const venues = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C' },
    { id: 'd', title: 'D' },
  ];
  const coords = new Map([
    ['a', { latitude: 55.0, longitude: 37.0 }],
    ['b', { latitude: 56.0, longitude: 37.0 }],
    ['c', { latitude: 55.1, longitude: 37.0 }],
  ]);
  const ordered = optimizeDayRouteNearestNeighbor(venues, coords);
  assert.deepEqual(
    ordered.map((v) => v.id),
    ['a', 'c', 'b', 'd'],
  );
});

test('hydrateDayRouteFromShare keeps local when it already covers share and has more', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'a', title: 'A', cityId: 'c1' });
  addToDayRoute({ id: 'b', title: 'B', cityId: 'c1' });
  addToDayRoute({ id: 'c', title: 'C', cityId: 'c1' });
  const next = hydrateDayRouteFromShare(
    [
      { id: 'a', title: 'A', cityId: 'c1' },
      { id: 'b', title: 'B', cityId: 'c1' },
    ],
    'c1',
  );
  assert.equal(next.venues.length, 3);
  assert.deepEqual(
    next.venues.map((v) => v.id),
    ['a', 'b', 'c'],
  );
});

test('hydrateDayRouteFromShare replaces when local is empty or incomplete', () => {
  mockStorage();
  clearDayRoute();
  const next = hydrateDayRouteFromShare(
    [
      { id: 'x', title: 'X', cityId: 'c1' },
      { id: 'y', title: 'Y', cityId: 'c1' },
    ],
    'c1',
  );
  assert.equal(next.venues.length, 2);
  assert.deepEqual(
    next.venues.map((v) => v.id),
    ['x', 'y'],
  );
});

test('buildDayRouteCoordsMap merges route + payload by id and slug', () => {
  mockStorage();
  const map = buildDayRouteCoordsMap(
    [{ id: 'slug-only', slug: 'park', title: 'Park', latitude: 55.1, longitude: 37.1 }],
    [{ id: 'venue_1', slug: 'park', latitude: 59.9, longitude: 30.3 }],
  );
  assert.deepEqual(map.get('park'), { latitude: 59.9, longitude: 30.3 });
  assert.deepEqual(map.get('venue_1'), { latitude: 59.9, longitude: 30.3 });
  assert.deepEqual(lookupDayRouteCoords({ id: 'slug-only', slug: 'park' }, map), {
    latitude: 59.9,
    longitude: 30.3,
  });
});

test('enrichDayRouteFromMatchVenues writes coords into storage', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'venue_x', slug: 'tochka-sbora', title: 'Место посадки' });
  const next = enrichDayRouteFromMatchVenues([
    {
      id: 'venue_x',
      slug: 'tochka-sbora',
      latitude: 59.9342802,
      longitude: 30.3350986,
    },
  ]);
  assert.equal(next.venues[0]?.latitude, 59.9342802);
  assert.equal(readDayRoute().venues[0]?.longitude, 30.3350986);
});

test('addToDayRoute same city title with null vs cityId still appends', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'venue_a',
    slug: 'a',
    title: 'A',
    city: 'Санкт-Петербург',
    cityId: 'city_spb',
  });
  const next = addToDayRoute({
    id: 'venue_b',
    slug: 'b',
    title: 'B',
    city: 'Санкт-Петербург',
    cityId: null,
  });
  assert.equal(next.venues.length, 2);
  assert.equal(readDayRoute().venues.length, 2);
});

test('addToDayRoute keeps first point when localStorage setItem throws on second write', () => {
  const store = mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'venue_a', title: 'A', imageUrl: 'https://example.com/a.jpg' });
  assert.equal(readDayRoute().venues.length, 1);

  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    if (key === DAY_ROUTE_STORAGE_KEY && String(value).includes('venue_b')) {
      throw new DOMException('QuotaExceededError');
    }
    return original(key, value);
  };

  const next = addToDayRoute({
    id: 'venue_b',
    title: 'B',
    imageUrl: 'https://example.com/b.jpg',
  });
  assert.equal(next.venues.length, 1, 'failed write must return previous state');
  assert.equal(readDayRoute().venues.length, 1);
  assert.equal(readDayRoute().venues[0]?.id, 'venue_a');
  assert.ok(store.get(DAY_ROUTE_STORAGE_KEY)?.includes('venue_a'));
});

test('addToDayRoute retries slim payload without imageUrl when full write throws once', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'venue_a', title: 'A', imageUrl: 'https://example.com/a.jpg' });

  let writes = 0;
  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    if (key === DAY_ROUTE_STORAGE_KEY) {
      writes += 1;
      // First attempt of 2nd add (full with images) fails; slim retry succeeds.
      if (writes === 2 && value.includes('imageUrl')) {
        throw new DOMException('QuotaExceededError');
      }
    }
    return original(key, value);
  };

  const next = addToDayRoute({
    id: 'venue_b',
    title: 'B',
    imageUrl: 'https://example.com/b.jpg',
  });
  assert.equal(next.venues.length, 2);
  assert.equal(readDayRoute().venues.length, 2);
});

test('addTextStopToDayRoute appends synthetic text_ ids without catalog venue id', () => {
  mockStorage();
  clearDayRoute();
  const a = addTextStopToDayRoute({ title: 'Эрмитаж', note: 'Дворцовая' });
  assert.equal(a.venues.length, 1);
  assert.ok(isTextDayRouteStop(a.venues[0]!));
  assert.equal(a.venues[0]!.title, 'Эрмитаж');
  assert.equal(a.venues[0]!.note, 'Дворцовая');
  const b = addTextStopToDayRoute({ title: 'Петропавловка', city: 'Санкт-Петербург' });
  assert.equal(b.venues.length, 2);
  assert.equal(readDayRoute().venues.length, 2);
  assert.deepEqual(
    readDayRoute().venues.map((v) => v.title),
    ['Эрмитаж', 'Петропавловка'],
  );
  assert.ok(catalogDayRouteVenueIds(b.venues).length === 0);
});

test('addTextStopToDayRoute never blocks on cityId mismatch and parses coords', () => {
  mockStorage();
  clearDayRoute();
  addTextStopToDayRoute({
    title: 'A',
    cityId: 'city_spb',
    city: 'Санкт-Петербург',
  });
  const next = addTextStopToDayRoute({
    title: 'B',
    cityId: 'city_msk',
    city: 'Москва',
    coordsText: '55.75, 37.62',
  });
  assert.equal(next.venues.length, 2);
  assert.equal(next.venues[1]!.latitude, 55.75);
  assert.equal(next.venues[1]!.longitude, 37.62);
  assert.equal(next.cityId, 'city_spb');
});

test('addTextStopToDayRoute rejects blank title and respects MAX', () => {
  mockStorage();
  clearDayRoute();
  assert.equal(addTextStopToDayRoute({ title: '   ' }).venues.length, 0);
  for (let i = 0; i < DAY_ROUTE_MAX; i += 1) {
    addTextStopToDayRoute({ title: `Stop ${i}` });
  }
  assert.equal(readDayRoute().venues.length, DAY_ROUTE_MAX);
  assert.equal(addTextStopToDayRoute({ title: 'Overflow' }).venues.length, DAY_ROUTE_MAX);
});

test('parseDayRouteCoordsInput accepts paste and separate fields', () => {
  assert.deepEqual(parseDayRouteCoordsInput({ coordsText: '59.93,30.31' }), {
    latitude: 59.93,
    longitude: 30.31,
  });
  assert.equal(parseDayRouteCoordsInput({ coordsText: 'nope' }), null);
  assert.deepEqual(parseDayRouteCoordsInput({ latitude: 55.7, longitude: 37.6 }), {
    latitude: 55.7,
    longitude: 37.6,
  });
});

test('buildDayRouteSharePath encodes text stops with t: and | separator', () => {
  mockStorage();
  clearDayRoute();
  addTextStopToDayRoute({ title: 'Эрмитаж' });
  addTextStopToDayRoute({ title: 'Исаакий' });
  const path = buildDayRouteSharePath(readDayRoute().venues);
  assert.ok(path.includes(encodeURIComponent('t:Эрмитаж|t:Исаакий')));
  const tokens = parseDayRouteQueryParam(decodeURIComponent(path.replace('/my-day?day=', '')));
  assert.deepEqual(tokens, ['t:Эрмитаж', 't:Исаакий']);
  assert.ok(tokens.every((t) => isDayRouteShareTextToken(t)));
});

test('hydrateTextStopsFromShareTokens fills planner from titles', () => {
  mockStorage();
  clearDayRoute();
  const next = hydrateTextStopsFromShareTokens(['t:Аврора', 't:Медный всадник']);
  assert.equal(next.venues.length, 2);
  assert.deepEqual(
    next.venues.map((v) => v.title),
    ['Аврора', 'Медный всадник'],
  );
  assert.ok(next.venues.every((v) => isTextDayRouteStop(v)));
});
