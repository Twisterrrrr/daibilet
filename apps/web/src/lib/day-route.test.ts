import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DAY_ROUTE_MAX,
  buildDayRouteSharePath,
  dayRouteDominantCitySlug,
  dayRouteFullCoveredCount,
  dayRouteHasMixedCities,
  dayRouteMatchScore,
  parseDayRouteQueryParam,
  type DayRouteVenueItem,
} from './day-route.ts';

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
