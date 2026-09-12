import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchDestination,
  resolveCatalogCityFilter,
  resolveCityHubDestination,
  resolveCityLabel,
} from './selected-city.ts';

const destinations = [
  { id: '1', name: 'Уфа', slug: 'ufa', type: 'city' as const, events: 10, venues: 2, categories: [] },
  {
    id: '2',
    name: 'Москва',
    slug: 'moscow',
    type: 'city' as const,
    events: 100,
    venues: 20,
    categories: [],
  },
  {
    id: '3',
    name: 'Санкт-Петербург',
    slug: 'sankt-peterburg',
    type: 'city' as const,
    events: 80,
    venues: 12,
    categories: [],
  },
];

test('matchDestination aliases saint-petersburg and sankt-peterburg', () => {
  assert.equal(matchDestination(destinations, 'ufa')?.name, 'Уфа');
  assert.equal(matchDestination(destinations, 'sankt-peterburg')?.name, 'Санкт-Петербург');
  assert.equal(matchDestination(destinations, 'saint-petersburg')?.name, 'Санкт-Петербург');
  assert.equal(matchDestination(destinations, 'Санкт-Петербург')?.slug, 'sankt-peterburg');
});

test('resolveCityLabel maps SPB SEO slug instead of keeping previous storage city', () => {
  assert.equal(resolveCityLabel(destinations, 'saint-petersburg'), 'Санкт-Петербург');
  assert.equal(resolveCityLabel(destinations, 'sankt-peterburg'), 'Санкт-Петербург');
  assert.equal(resolveCityLabel(destinations, 'all'), 'Все города');
});

test('resolveCityHubDestination follows saint-petersburg hub path', () => {
  assert.equal(resolveCityHubDestination(destinations, '/cities/sankt-peterburg')?.name, 'Санкт-Петербург');
  assert.equal(resolveCityHubDestination(destinations, '/cities/saint-petersburg')?.name, 'Санкт-Петербург');
});

test('resolveCatalogCityFilter maps SPB slug even if header label is stale', () => {
  const options: Array<[string, number]> = [
    ['Москва', 10],
    ['Санкт-Петербург', 8],
    ['Уфа', 2],
  ];
  assert.equal(resolveCatalogCityFilter('saint-petersburg', options, 'Москва'), 'Санкт-Петербург');
  assert.equal(resolveCatalogCityFilter('sankt-peterburg', options, 'Москва'), 'Санкт-Петербург');
  assert.equal(resolveCatalogCityFilter('moscow', options, 'Уфа'), 'Москва');
});
