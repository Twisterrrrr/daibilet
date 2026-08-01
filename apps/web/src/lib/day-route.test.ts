import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DAY_ROUTE_MAX,
  DAY_ROUTE_STORAGE_KEY,
  addToDayRoute,
  buildDayRouteSharePath,
  clearDayRoute,
  dayRouteDominantCitySlug,
  dayRouteFullCoveredCount,
  dayRouteHasMixedCities,
  dayRouteMatchScore,
  hydrateDayRouteFromShare,
  parseDayRouteQueryParam,
  readDayRoute,
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
