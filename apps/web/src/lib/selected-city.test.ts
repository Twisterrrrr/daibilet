import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogHref, catalogHrefWithSelectedCity, isPlacesSectionPath, placesSearchHref, venueCatalogHrefWithSelectedCity } from './catalog-url.ts';
import {
  catalogCityQueryValue,
  isAllCitiesQuery,
  isCityFilterPath,
  matchDestination,
  mergeStoredCityIntoEventsParams,
  mergeStoredCityIntoSearchParams,
  pathHrefWithSelectedCity,
  resolveCatalogCityFilter,
  resolveCityHubDestination,
  resolveCityLabel,
  SELECTED_CITY_STORAGE_KEY,
} from './selected-city.ts';

const destinations = [
  { id: '1', name: 'Уфа', slug: 'ufa', type: 'city' as const, events: 10, venues: 2, categories: [] },
  { id: '2', name: 'Москва', slug: 'moscow', type: 'city' as const, events: 100, venues: 20, categories: [] },
] as const;

test('catalogHrefWithSelectedCity adds header city when URL has none', () => {
  assert.equal(catalogHrefWithSelectedCity('Уфа'), '/events?city=%D0%A3%D1%84%D0%B0');
  assert.equal(
    catalogHrefWithSelectedCity('Уфа', { date: 'today', sort: 'time' }),
    '/events?city=%D0%A3%D1%84%D0%B0&date=today',
  );
});

test('catalogHrefWithSelectedCity keeps explicit city over header', () => {
  assert.equal(
    catalogHrefWithSelectedCity('Уфа', { city: 'Москва' }),
    '/events?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
  );
});

test('catalogHrefWithSelectedCity skips all', () => {
  assert.equal(catalogHrefWithSelectedCity('all', { date: 'weekend' }), '/events?date=weekend');
  assert.equal(buildCatalogHref({ date: 'weekend' }), '/events?date=weekend');
});

test('placesSearchHref is one mixed Places search URL', () => {
  assert.equal(placesSearchHref({}), '/places');
  assert.equal(placesSearchHref({ q: 'эрмитаж' }), '/places?q=%D1%8D%D1%80%D0%BC%D0%B8%D1%82%D0%B0%D0%B6');
  assert.equal(
    placesSearchHref({ q: 'новая голландия', city: 'saint-petersburg' }),
    '/places?q=%D0%BD%D0%BE%D0%B2%D0%B0%D1%8F+%D0%B3%D0%BE%D0%BB%D0%BB%D0%B0%D0%BD%D0%B4%D0%B8%D1%8F&city=saint-petersburg',
  );
  assert.equal(placesSearchHref({ family: 'location' }), '/places?family=location');
  assert.equal(placesSearchHref({ family: 'all' }), '/places');
  assert.equal(isPlacesSectionPath('/places'), true);
  assert.equal(isPlacesSectionPath('/venues/ermitazh'), true);
  assert.equal(isPlacesSectionPath('/locations/saint-petersburg-novaya-gollandiya'), true);
  assert.equal(isPlacesSectionPath('/events'), false);
});

test('venueCatalogHrefWithSelectedCity adds city to venues and locations', () => {
  assert.equal(venueCatalogHrefWithSelectedCity('/venues', 'Уфа'), '/venues?city=%D0%A3%D1%84%D0%B0');
  assert.equal(venueCatalogHrefWithSelectedCity('/locations', 'all'), '/locations');
  assert.equal(
    venueCatalogHrefWithSelectedCity('/venues', 'Уфа', 'Москва'),
    '/venues?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
  );
});

test('pathHrefWithSelectedCity builds city query on arbitrary path', () => {
  assert.equal(pathHrefWithSelectedCity('/venues', 'Уфа'), '/venues?city=%D0%A3%D1%84%D0%B0');
  assert.equal(pathHrefWithSelectedCity('/locations', 'all', { q: 'парк' }), '/locations?q=%D0%BF%D0%B0%D1%80%D0%BA');
});

test('isCityFilterPath covers events venues locations podborki', () => {
  assert.equal(isCityFilterPath('/events'), true);
  assert.equal(isCityFilterPath('/venues'), true);
  assert.equal(isCityFilterPath('/locations'), true);
  assert.equal(isCityFilterPath('/podborki'), true);
  assert.equal(isCityFilterPath('/cities'), false);
  assert.equal(isCityFilterPath('/events/slug'), true);
  // Blog materials filter is in-page only - header CityPicker must not inject ?city=.
  assert.equal(isCityFilterPath('/blog'), false);
  assert.equal(isCityFilterPath('/blog/some-slug'), false);
});

test('mergeStoredCityIntoSearchParams injects storage city only when city missing', () => {
  const storage = new Map<string, string>();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });

  try {
    storage.set(SELECTED_CITY_STORAGE_KEY, 'Уфа');
    const injected = mergeStoredCityIntoSearchParams([...destinations], new URLSearchParams('date=today'));
    assert.ok(injected);
    assert.equal(injected!.get('city'), 'ufa');
    assert.equal(injected!.get('date'), 'today');

    const kept = mergeStoredCityIntoEventsParams([...destinations], new URLSearchParams('city=Москва&date=today'));
    assert.equal(kept, null);

    // Explicit «Все города» must stick - do not re-inject storage city.
    const allCities = mergeStoredCityIntoSearchParams(
      [...destinations],
      new URLSearchParams('city=all&type=museum'),
    );
    assert.equal(allCities, null);

    storage.clear();
    const empty = mergeStoredCityIntoSearchParams([...destinations], new URLSearchParams(''));
    assert.equal(empty, null);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
  }
});

test('resolveCityLabel and isAllCitiesQuery honor city=all', () => {
  assert.equal(isAllCitiesQuery('all'), true);
  assert.equal(isAllCitiesQuery('ALL'), true);
  assert.equal(isAllCitiesQuery(''), false);
  assert.equal(isAllCitiesQuery('ufa'), false);
  assert.equal(resolveCityLabel([...destinations], 'all'), 'Все города');
});

test('matchDestination resolves by name and slug', () => {
  assert.equal(matchDestination([...destinations], 'ufa')?.name, 'Уфа');
  assert.equal(matchDestination([...destinations], 'Уфа')?.slug, 'ufa');
  assert.equal(matchDestination([...destinations], 'all'), null);
});

test('resolveCityHubDestination follows the city route including source slug', () => {
  const cities = [
    ...destinations,
    {
      id: '3',
      name: 'Санкт-Петербург',
      slug: 'sankt-peterburg',
      sourceSlug: 'saint-petersburg',
      type: 'city' as const,
      events: 100,
      venues: 20,
      categories: [],
    },
  ];
  assert.equal(resolveCityHubDestination(cities, '/cities/sankt-peterburg')?.name, 'Санкт-Петербург');
  assert.equal(resolveCityHubDestination(cities, '/cities/saint-petersburg')?.name, 'Санкт-Петербург');
  assert.equal(resolveCityHubDestination(cities, '/cities'), null);
});

test('resolveCatalogCityFilter maps slug via resolved label', () => {
  const options: Array<[string, number]> = [
    ['Москва', 10],
    ['Уфа', 2],
  ];
  assert.equal(resolveCatalogCityFilter('Москва', options), 'Москва');
  assert.equal(resolveCatalogCityFilter('moscow', options, 'Москва'), 'Москва');
  assert.equal(resolveCatalogCityFilter('ufa', options, 'Уфа'), 'Уфа');
  assert.equal(resolveCatalogCityFilter('all', options), 'all');
});

test('catalogCityQueryValue prefers destination slug', () => {
  assert.equal(catalogCityQueryValue([...destinations], 'Уфа'), 'ufa');
  assert.equal(catalogCityQueryValue([...destinations], 'moscow'), 'moscow');
  assert.equal(catalogCityQueryValue([...destinations], 'all'), 'all');
});
