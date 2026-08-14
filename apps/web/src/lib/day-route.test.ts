import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERM_NABEREZHNAYA_KAMY_COORDS,
  PERM_SCHASTE_COORDS,
} from './city-place-coords.ts';
import {
  DAY_ROUTE_MAX,
  DAY_ROUTE_SOFT,
  DAY_ROUTE_SOFT_WARN,
  DAY_ROUTE_STORAGE_KEY,
  addTextStopToDayRoute,
  addToDayRoute,
  buildDayRouteCoordsMap,
  buildDayRouteSharePath,
  buildDayRouteShortPath,
  parseDayRouteReadableSlug,
  suggestDayRouteShareTitle,
  buildMaxShareUrl,
  buildYandexMultiStopRouteUrl,
  catalogDayRouteVenueIds,
  clearDayRoute,
  countDayRoutePlacesMissingCoords,
  dayRouteAddSuccessMessage,
  dayRouteDominantCitySlug,
  dayRouteFullCoveredCount,
  dayRouteHardLimitMessage,
  dayRouteHasMixedCities,
  dayRouteMatchScore,
  enrichDayRouteFromMatchVenues,
  formatDayRouteCountLabel,
  formatDayRouteSessionDisplay,
  formatDayRouteStartsAtLabel,
  formatDayRouteStopsHeading,
  dayRoutePointsWordGenitive,
  isDayRouteSoftSessionLabel,
  isDayRouteAtHard,
  isDayRouteAtSoft,
  hydrateDayRouteFromShare,
  hydrateTextStopsFromShareTokens,
  isDayRouteShareTextToken,
  isInDayRoute,
  isTextDayRouteStop,
  lookupDayRouteCoords,
  optimizeDayRouteNearestNeighbor,
  parseDayRouteCoordsInput,
  parseDayRouteItemsParam,
  parseDayRouteQueryParam,
  readDayRoute,
  repairDayRouteStaleEditorialCoords,
  resetDayRouteSnapshotCache,
  resolveDayRouteTicketUrl,
  sameDayRouteVenue,
  sanitizeDayRouteTicketFields,
  subscribeDayRoute,
  toggleDayRoute,
  venueMatchesRouteSlug,
  type DayRouteVenueItem,
} from './day-route.ts';

function mockStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
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

test('buildDayRouteSharePath emits city+items format', () => {
  assert.equal(buildDayRouteSharePath([]), '/my-day');
  const path = buildDayRouteSharePath(
    [
      {
        id: 'id1',
        slug: 'park-gorkogo',
        title: 'Парк',
        citySlug: 'spb',
        eventId: '341',
        sessionLabel: 'сб, 14:00',
      },
      { id: 'id2', slug: '892', title: 'Локация', citySlug: 'spb' },
    ],
    { citySlug: 'spb' },
  );
  const url = new URL(path, 'https://daibilet.ru');
  assert.equal(url.searchParams.get('city'), 'spb');
  assert.equal(url.searchParams.get('items'), '341:1400,892:free');
});

test('buildDayRouteShortPath uses /d/{code} or readable /m/{city}-{title}-{code}', () => {
  assert.equal(buildDayRouteShortPath('x7k2m9a'), '/d/x7k2m9a');
  assert.equal(buildDayRouteShortPath(' AbC2345 '), '/d/abc2345');
  assert.equal(buildDayRouteShortPath(''), '/my-day');
  assert.equal(buildDayRouteShortPath('x7k2m9a', 'spb'), '/m/spb-x7k2m9a');
  assert.equal(
    buildDayRouteShortPath('x7k2m9a', { citySlug: 'spb', titleSlug: 'serdtse-pitere' }),
    '/m/spb-serdtse-pitere-x7k2m9a',
  );
});

test('parseDayRouteReadableSlug takes code from end (title in middle)', () => {
  const bare = parseDayRouteReadableSlug('x7k2m9a');
  assert.equal(bare?.code, 'x7k2m9a');
  const cityOnly = parseDayRouteReadableSlug('spb-x7k2m9a');
  assert.equal(cityOnly?.code, 'x7k2m9a');
  assert.equal(cityOnly?.citySlug, 'spb');
  const withTitle = parseDayRouteReadableSlug('spb-serdtse-pitere-x7k2m9a');
  assert.equal(withTitle?.code, 'x7k2m9a');
  assert.equal(withTitle?.citySlug, 'spb');
  assert.equal(withTitle?.titleSlug, 'serdtse-pitere');
});

test('suggestDayRouteShareTitle uses city + first stop', () => {
  assert.equal(
    suggestDayRouteShareTitle({ cityTitle: 'Санкт-Петербург', firstStopTitle: 'Эрмитаж' }),
    'Санкт-Петербург: Эрмитаж',
  );
  assert.equal(suggestDayRouteShareTitle({}), 'Маршрут на день');
});

test('parseDayRouteItemsParam parses id:HHMM and free', () => {
  const tokens = parseDayRouteItemsParam('341:1400,892:free,115:1830');
  assert.equal(tokens.length, 3);
  assert.deepEqual(tokens[0], { id: '341', time: '1400', isText: false, isNote: false, isFree: false });
  assert.deepEqual(tokens[1], { id: '892', time: 'free', isText: false, isNote: false, isFree: true });
  assert.deepEqual(tokens[2], { id: '115', time: '1830', isText: false, isNote: false, isFree: false });
});

test('buildMaxShareUrl uses official max.ru/:share deep-link', () => {
  const url = buildMaxShareUrl('Привет! https://daibilet.ru/my-day?city=spb&items=1:free');
  assert.ok(url.startsWith('https://max.ru/:share?text='));
  assert.ok(url.includes(encodeURIComponent('Привет!')));
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

test('dayRouteHasMixedCities: catalog cityId + text-stop same title is not mixed', () => {
  // Owner false positive: all cards show «Санкт-Петербург», but catalog rows have
  // cityId while text stops only have city title → old id: vs title: keys mixed.
  const spbMix: DayRouteVenueItem[] = [
    { id: 'venue_1', title: 'Место посадки', cityId: 'city_spb', city: 'Санкт-Петербург' },
    { id: 'text_abc', title: 'Эрмитаж', cityId: null, city: 'Санкт-Петербург' },
    { id: 'text_def', title: 'Русский музей', city: 'Санкт-Петербург' },
    { id: 'venue_2', title: 'Музей Карла Буллы', cityId: 'city_spb', city: 'Санкт-Петербург' },
  ];
  assert.equal(dayRouteHasMixedCities(spbMix), false);

  // Same displayed city with ё/е / spacing variants.
  assert.equal(
    dayRouteHasMixedCities([
      { id: '1', title: 'A', cityId: 'c1', city: 'Санкт-Петербург' },
      { id: '2', title: 'B', city: 'санкт петербург' },
    ]),
    false,
  );

  // Real mixed: catalog id without title + different titled city.
  assert.equal(
    dayRouteHasMixedCities([
      { id: '1', title: 'A', cityId: 'city_msk', city: 'Москва' },
      { id: '2', title: 'B', cityId: null, city: 'Санкт-Петербург' },
    ]),
    true,
  );

  // Id-only row unifies via sibling that knows cityId→title.
  assert.equal(
    dayRouteHasMixedCities([
      { id: '1', title: 'A', cityId: 'city_spb', city: 'Санкт-Петербург' },
      { id: '2', title: 'B', cityId: 'city_spb' },
    ]),
    false,
  );
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

test('countDayRoutePlacesMissingCoords ignores notes', () => {
  const withCoords = new Set(['place-a', 'place-b']);
  const hasCoords = (v: { id: string }) => withCoords.has(v.id);
  assert.equal(
    countDayRoutePlacesMissingCoords(
      [
        { id: 'place-a' },
        { id: 'note_abc123' },
        { id: 'place-b' },
      ],
      hasCoords,
    ),
    0,
  );
  assert.equal(
    countDayRoutePlacesMissingCoords(
      [
        { id: 'place-a' },
        { id: 'note_only' },
        { id: 'place-missing' },
      ],
      hasCoords,
    ),
    1,
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

test('toggleDayRoute removes the same venue on second call', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({ id: 'venue_a', slug: 'park-a', title: 'Парк' });
  assert.equal(readDayRoute().venues.length, 1);
  const next = toggleDayRoute({ id: 'venue_a', slug: 'park-a', title: 'Парк' });
  assert.equal(next.venues.length, 0);
  assert.equal(isInDayRoute('venue_a', next, 'park-a'), false);
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

test('catalog add persists address + coords snapshot for my-day', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'venue_664357d9859cee9d822848aa',
    slug: 'prichal-na-nab-r-fontanki-105',
    title: 'Причал на наб. р. Фонтанки 105',
    city: 'Санкт-Петербург',
    address: 'набережная реки Фонтанки, 105',
    latitude: 59.92291095333904,
    longitude: 30.320574599457725,
  });
  const stored = readDayRoute().venues[0];
  assert.equal(stored?.address, 'набережная реки Фонтанки, 105');
  assert.equal(stored?.latitude, 59.92291095333904);
  assert.equal(stored?.longitude, 30.320574599457725);
});

test('enrichDayRouteFromMatchVenues prefers editorial place coords over hub mid-river geo', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'naberezhnaya-kamy',
    slug: 'naberezhnaya-kamy',
    title: 'Набережная Камы',
  });
  const next = enrichDayRouteFromMatchVenues([
    {
      id: 'ven_perm_naberezhnaya',
      slug: 'naberezhnaya-kamy',
      title: 'Набережная Камы',
      // Historical mid-Kama pin that used to overwrite curated south-bank coords.
      latitude: 58.0224,
      longitude: 56.252,
      address: 'ул. Монастырская / Набережная Камы',
    },
  ]);
  const stop = next.venues[0];
  assert.equal(stop?.latitude, PERM_NABEREZHNAYA_KAMY_COORDS.latitude);
  assert.equal(stop?.longitude, PERM_NABEREZHNAYA_KAMY_COORDS.longitude);
  assert.equal(stop?.address, 'ул. Монастырская / Набережная Камы');
});

test('enrichDayRouteFromMatchVenues rebases stale Perm LS coords already on the stop', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'naberezhnaya-kamy',
    slug: 'naberezhnaya-kamy',
    title: 'Набережная Камы',
    latitude: 58.01985,
    longitude: 56.2467,
  });
  addToDayRoute({
    id: 'perm-schaste-ne-za-gorami',
    slug: 'perm-schaste-ne-za-gorami',
    title: 'Арт-объект «Счастье не за горами»',
    latitude: 58.0205,
    longitude: 56.2507,
  });
  const next = enrichDayRouteFromMatchVenues([
    {
      id: 'naberezhnaya-kamy',
      slug: 'naberezhnaya-kamy',
      latitude: 58.021111,
      longitude: 56.243889,
    },
    {
      id: 'perm-schaste-ne-za-gorami',
      slug: 'perm-schaste-ne-za-gorami',
      latitude: 58.0224,
      longitude: 56.252,
    },
  ]);
  assert.equal(next.venues[0]?.latitude, PERM_NABEREZHNAYA_KAMY_COORDS.latitude);
  assert.equal(next.venues[0]?.longitude, PERM_NABEREZHNAYA_KAMY_COORDS.longitude);
  assert.equal(next.venues[1]?.latitude, PERM_SCHASTE_COORDS.latitude);
  assert.equal(next.venues[1]?.longitude, PERM_SCHASTE_COORDS.longitude);
});

test('repairDayRouteStaleEditorialCoords snaps Perm water pins without matches payload', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'naberezhnaya-kamy',
    slug: 'naberezhnaya-kamy',
    title: 'Набережная Камы',
    latitude: 58.021111,
    longitude: 56.243889,
  });
  const repaired = repairDayRouteStaleEditorialCoords(readDayRoute());
  assert.equal(repaired.venues[0]?.latitude, PERM_NABEREZHNAYA_KAMY_COORDS.latitude);
  assert.equal(repaired.venues[0]?.longitude, PERM_NABEREZHNAYA_KAMY_COORDS.longitude);
  assert.equal(readDayRoute().venues[0]?.latitude, PERM_NABEREZHNAYA_KAMY_COORDS.latitude);
});

test('enrichDayRouteFromMatchVenues fills missing address by slug', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'tochka-sbora',
    slug: 'tochka-sbora',
    title: 'Место посадки — Лиговский пр. 10',
  });
  const next = enrichDayRouteFromMatchVenues([
    {
      id: 'venue_5661d5a99cb5385800d8807d',
      slug: 'tochka-sbora',
      address: 'Лиговский пр. 10',
      latitude: 59.9342802,
      longitude: 30.3350986,
    },
  ]);
  assert.equal(next.venues[0]?.id, 'venue_5661d5a99cb5385800d8807d');
  assert.equal(next.venues[0]?.address, 'Лиговский пр. 10');
  assert.equal(next.venues[0]?.latitude, 59.9342802);
});

test('enrichDayRouteFromMatchVenues does not attach a show onto a place stop', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'loc_ermitazh',
    slug: 'ermitazh',
    title: 'Эрмитаж',
    href: '/venues/ermitazh',
  });
  const next = enrichDayRouteFromMatchVenues([
    {
      id: 'loc_ermitazh',
      slug: 'ermitazh',
      title: 'Эрмитаж',
      latitude: 59.9398,
      longitude: 30.3146,
      address: 'Дворцовая наб., 34///Dvortsovaya Emb., 34',
      eventId: 'ballet_5000',
      eventSlug: 'lebedinoe-ozero',
      heroImageUrl: '/images/events/ballet.jpg',
    },
  ]);
  const stop = next.venues[0];
  assert.equal(stop?.title, 'Эрмитаж');
  assert.equal(stop?.eventId, undefined);
  assert.equal(stop?.eventSlug, undefined);
  assert.equal(stop?.latitude, 59.9398);
});

test('enrichDayRouteFromMatchVenues replaces event stub title + coords + image', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'evt_stub_1',
    title: 'Событие из маршрута',
    eventId: 'evt_stub_1',
    ticketUrl: '/events/evt_stub_1',
  });
  const next = enrichDayRouteFromMatchVenues([
    {
      id: 'venue_hall',
      slug: 'comedy-hall',
      title: 'Стендап по-женски',
      latitude: 59.94,
      longitude: 30.32,
      address: 'Невский 10',
      eventId: 'evt_stub_1',
      eventSlug: 'standup-po-zhenski',
      heroImageUrl: '/images/events/standup.jpg',
    },
  ]);
  const stop = next.venues[0];
  assert.equal(stop?.title, 'Стендап по-женски');
  assert.equal(stop?.latitude, 59.94);
  assert.equal(stop?.eventSlug, 'standup-po-zhenski');
  assert.equal(stop?.imageUrl, '/images/events/standup.jpg');
  assert.equal(stop?.ticketUrl, '/events/standup-po-zhenski');
});

test('formatDayRouteStartsAtLabel keeps date + time in ru locale', () => {
  const label = formatDayRouteStartsAtLabel('2026-08-15T16:00:00.000Z');
  assert.ok(label);
  assert.match(label!, /15/);
  assert.match(label!, /авг/i);
  assert.match(label!, /19:00/);
});

test('formatDayRouteSessionDisplay prefers startsAt and skips soft dayparts', () => {
  assert.equal(
    formatDayRouteSessionDisplay({
      startsAt: '2026-08-15T16:00:00.000Z',
      sessionLabel: 'Вечерний сеанс',
    }),
    formatDayRouteStartsAtLabel('2026-08-15T16:00:00.000Z'),
  );
  assert.equal(
    formatDayRouteSessionDisplay({ startsAt: null, sessionLabel: 'Вечерний сеанс' }),
    null,
  );
  assert.equal(isDayRouteSoftSessionLabel('Вечерний сеанс'), true);
  assert.equal(
    formatDayRouteSessionDisplay({ startsAt: null, sessionLabel: 'вс, 2 авг, 11:00' }),
    'вс, 2 авг, 11:00',
  );
  assert.equal(formatDayRouteSessionDisplay({ startsAt: null, sessionLabel: '19:00' }), '19:00');
  assert.equal(formatDayRouteSessionDisplay({ startsAt: null, sessionLabel: null }), null);
});

test('enrichDayRouteFromMatchVenues fills missing session startsAt', () => {
  mockStorage();
  clearDayRoute();
  addToDayRoute({
    id: 'venue_hall',
    slug: 'comedy-hall',
    title: 'Стендап',
    eventId: 'evt_session_1',
    eventSlug: 'standup-night',
    ticketUrl: '/events/standup-night',
  });
  const next = enrichDayRouteFromMatchVenues([
    {
      id: 'venue_hall',
      slug: 'comedy-hall',
      eventId: 'evt_session_1',
      eventSlug: 'standup-night',
      startsAt: '2026-08-15T16:00:00.000Z',
      dateLabel: 'сб, 15 авг',
      timeLabel: '19:00',
    },
  ]);
  assert.equal(next.venues[0]?.startsAt, '2026-08-15T16:00:00.000Z');
  assert.equal(next.venues[0]?.sessionLabel, 'сб, 15 авг, 19:00');
  assert.equal(
    formatDayRouteSessionDisplay(next.venues[0]!),
    formatDayRouteStartsAtLabel('2026-08-15T16:00:00.000Z'),
  );
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

test('soft guideline helpers: warn copy and count label without /MAX lock', () => {
  assert.equal(DAY_ROUTE_SOFT, 10);
  assert.equal(DAY_ROUTE_MAX, 15);
  assert.equal(isDayRouteAtSoft(9), false);
  assert.equal(isDayRouteAtSoft(10), true);
  assert.equal(isDayRouteAtHard(14), false);
  assert.equal(isDayRouteAtHard(15), true);
  assert.equal(formatDayRouteCountLabel(3), 'Точки · 3');
  assert.equal(formatDayRouteCountLabel(10), 'Точки · 10 · плотный день');
  assert.equal(formatDayRouteCountLabel(11, 'Маршрут'), 'Маршрут · 11 · плотный день');
  assert.equal(formatDayRouteCountLabel(15), 'Точки · 15/15');
  assert.equal(formatDayRouteStopsHeading(1), 'Маршрут из 1 точки');
  assert.equal(formatDayRouteStopsHeading(3), 'Маршрут из 3 точек');
  assert.equal(formatDayRouteStopsHeading(5), 'Маршрут из 5 точек');
  assert.equal(formatDayRouteStopsHeading(10), 'Маршрут из 10 точек · плотный день');
  assert.equal(formatDayRouteStopsHeading(15), 'Маршрут из 15 точек · лимит');
  assert.equal(dayRoutePointsWordGenitive(21), 'точки');
  assert.equal(dayRoutePointsWordGenitive(22), 'точек');
  assert.match(DAY_ROUTE_SOFT_WARN, /плотный/);
  assert.doesNotMatch(DAY_ROUTE_SOFT_WARN, /[—–]/);
  assert.match(dayRouteHardLimitMessage(), /15/);
  assert.match(dayRouteAddSuccessMessage(3), /Добавлено в маршрут · 3/);
  assert.match(dayRouteAddSuccessMessage(10), /плотный/);
});

test('add allows past soft until hard safety', () => {
  mockStorage();
  clearDayRoute();
  for (let i = 0; i < DAY_ROUTE_SOFT + 2; i += 1) {
    addTextStopToDayRoute({ title: `Soft ${i}` });
  }
  assert.equal(readDayRoute().venues.length, DAY_ROUTE_SOFT + 2);
  assert.equal(isDayRouteAtSoft(readDayRoute().venues.length), true);
  assert.equal(isDayRouteAtHard(readDayRoute().venues.length), false);
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
  assert.deepEqual(parseDayRouteCoordsInput({ coordsText: '59.887991,\u00A030.330520' }), {
    latitude: 59.887991,
    longitude: 30.33052,
  });
  assert.deepEqual(parseDayRouteCoordsInput({ coordsText: '59,887991, 30,330520' }), {
    latitude: 59.887991,
    longitude: 30.33052,
  });
});

test('addTextStopToDayRoute evicts page caches when quota blocks 3rd stop', () => {
  const store = mockStorage();
  clearDayRoute();
  addTextStopToDayRoute({
    title: 'Эрмитаж',
    note: 'Дворцовая площадь, 2, Санкт-Петербург',
    city: 'Санкт-Петербург',
    coordsText: '59.9398, 30.3146',
  });
  addTextStopToDayRoute({
    title: 'Русский музей',
    note: 'Инженерная улица, 2-4Д, Санкт-Петербург',
    city: 'Санкт-Петербург',
    coordsText: '59.9387, 30.3322',
  });
  assert.equal(readDayRoute().venues.length, 2);

  store.set('daibilet:favorites', '["keep-me"]');
  store.set('daibilet:venue-page:v2:huge', 'x'.repeat(8000));
  store.set('daibilet:event-page:also-huge', 'y'.repeat(8000));

  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    if (key === DAY_ROUTE_STORAGE_KEY) {
      // Simulate full LS: reject growth until disposable caches are gone.
      const hasCache =
        store.has('daibilet:venue-page:v2:huge') || store.has('daibilet:event-page:also-huge');
      const prev = store.get(DAY_ROUTE_STORAGE_KEY) || '';
      if (hasCache && String(value).length > prev.length) {
        throw new DOMException('QuotaExceededError');
      }
    }
    return original(key, value);
  };

  const next = addTextStopToDayRoute({
    title: 'Гранд Макет Россия',
    note: 'Цветочная ул., 16Л, ОНТ Пулково-2',
    city: 'Санкт-Петербург',
    coordsText: '59.887991, 30.330520',
  });
  assert.equal(next.venues.length, 3);
  assert.equal(readDayRoute().venues.length, 3);
  assert.equal(next.venues[2]?.title, 'Гранд Макет Россия');
  assert.equal(next.venues[2]?.latitude, 59.887991);
  assert.equal(next.venues[2]?.longitude, 30.33052);
  assert.equal(store.get('daibilet:favorites'), '["keep-me"]');
  assert.equal(store.has('daibilet:venue-page:v2:huge'), false);
  assert.equal(store.has('daibilet:event-page:also-huge'), false);
});

test('buildDayRouteSharePath encodes text stops in items', () => {
  mockStorage();
  clearDayRoute();
  addTextStopToDayRoute({ title: 'Эрмитаж' });
  addTextStopToDayRoute({ title: 'Исаакий' });
  const path = buildDayRouteSharePath(readDayRoute().venues, { citySlug: 'spb' });
  assert.ok(path.includes('city=spb'));
  assert.ok(path.includes('items='));
  const items = new URL(path, 'https://daibilet.ru').searchParams.get('items') || '';
  assert.ok(items.includes('t:Эрмитаж:free'));
  assert.ok(items.includes('t:Исаакий:free'));
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

test('resolveDayRouteTicketUrl never builds /events/{venueSlug}', () => {
  const venue: DayRouteVenueItem = {
    id: 'venue_niko',
    slug: 'niko1560',
    title: 'Niko1560',
    href: '/venues/niko1560',
    eventId: 'niko1560',
    eventSlug: 'niko1560',
    ticketUrl: '/events/niko1560',
  };
  assert.equal(resolveDayRouteTicketUrl(venue), null);
  assert.notEqual(resolveDayRouteTicketUrl(venue), '/events/niko1560');

  const onlyKeys: DayRouteVenueItem = {
    id: 'niko1560',
    slug: 'niko1560',
    title: 'Niko1560',
    eventSlug: 'niko1560',
  };
  assert.equal(resolveDayRouteTicketUrl(onlyKeys), null);

  const realEvent: DayRouteVenueItem = {
    id: 'venue_niko',
    slug: 'niko1560',
    title: 'Niko1560',
    eventId: 'evt_standup_1',
    eventSlug: 'standup-po-zhenski',
  };
  assert.equal(resolveDayRouteTicketUrl(realEvent), '/events/standup-po-zhenski');

  const venueProgramStored: DayRouteVenueItem = {
    id: 'venue_niko',
    slug: 'niko1560',
    title: 'Niko1560',
    ticketUrl: '/venues/niko1560',
  };
  assert.equal(resolveDayRouteTicketUrl(venueProgramStored), null);
});

test('sanitizeDayRouteTicketFields clears venue-as-event ticketUrl', () => {
  const poisoned: DayRouteVenueItem = {
    id: 'venue_niko',
    slug: 'niko1560',
    title: 'Niko1560',
    href: '/venues/niko1560',
    eventId: 'niko1560',
    eventSlug: 'niko1560',
    ticketUrl: '/events/niko1560',
  };
  const cleaned = sanitizeDayRouteTicketFields(poisoned);
  assert.equal(cleaned.eventId, null);
  assert.equal(cleaned.eventSlug, null);
  assert.equal(cleaned.ticketUrl, null);
});
