import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogHref, catalogHrefWithSelectedCity, isPlacesSectionPath, placesSearchHref, resolveCatalogSortSelectValue, venueCatalogHrefWithSelectedCity } from './catalog-url.ts';
import {
  catalogCityQueryValue,
  isAllCitiesQuery,
  isCityFilterPath,
  matchDestination,
  mergeStoredCityIntoEventsParams,
  mergeStoredCityIntoSearchParams,
  pathHrefWithSelectedCity,
  persistSelectedCity,
  decodeSelectedCityCookie,
  ensureCityInOptions,
  resolveCatalogCityFilter,
  resolveCatalogFetchCity,
  resolveCityHubDestination,
  resolveCityLabel,
  resolveSectionCityFilter,
  CITY_PROMPT_STORAGE_KEY,
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

test('buildCatalogHref omits default time sort and keeps explicit popular', () => {
  assert.equal(buildCatalogHref({ sort: 'time' }), '/events');
  assert.equal(buildCatalogHref({ sort: 'popular' }), '/events?sort=popular');
  assert.equal(buildCatalogHref({ sort: 'price_asc' }), '/events?sort=price_asc');
});

test('resolveCatalogSortSelectValue maps legacy price to cheapest-first', () => {
  assert.equal(resolveCatalogSortSelectValue('price_asc'), 'price_asc');
  assert.equal(resolveCatalogSortSelectValue('price'), 'price_asc');
  assert.equal(resolveCatalogSortSelectValue(''), 'time');
  assert.equal(resolveCatalogSortSelectValue('random'), 'time');
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

test('venueCatalogHrefWithSelectedCity points listings at /places with family', () => {
  assert.equal(
    venueCatalogHrefWithSelectedCity('/venues', 'Уфа'),
    '/places?city=%D0%A3%D1%84%D0%B0&family=institution',
  );
  assert.equal(venueCatalogHrefWithSelectedCity('/locations', 'all'), '/places?family=location');
  assert.equal(
    venueCatalogHrefWithSelectedCity('/venues', 'Уфа', 'Москва'),
    '/places?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&family=institution',
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

test('persistSelectedCity marks the first-visit prompt done and keeps all as empty city', () => {
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
    persistSelectedCity('Уфа');
    assert.equal(storage.get(SELECTED_CITY_STORAGE_KEY), 'Уфа');
    assert.equal(storage.get(CITY_PROMPT_STORAGE_KEY), '1');

    persistSelectedCity('all');
    assert.equal(storage.has(SELECTED_CITY_STORAGE_KEY), false);
    assert.equal(storage.get(CITY_PROMPT_STORAGE_KEY), '1');
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

test('matchDestination aliases saint-petersburg and sankt-peterburg', () => {
  assert.equal(matchDestination([...destinations], 'ufa')?.name, 'Уфа');
  assert.equal(matchDestination([...destinations], 'Уфа')?.slug, 'ufa');
  assert.equal(matchDestination([...destinations], 'all'), null);
  const cities = [
    ...destinations,
    {
      id: '3',
      name: 'Санкт-Петербург',
      slug: 'sankt-peterburg',
      type: 'city' as const,
      events: 100,
      venues: 20,
      categories: [],
    },
  ];
  assert.equal(matchDestination([...cities], 'sankt-peterburg')?.name, 'Санкт-Петербург');
  assert.equal(matchDestination([...cities], 'saint-petersburg')?.name, 'Санкт-Петербург');
  assert.equal(matchDestination([...cities], 'Санкт-Петербург')?.slug, 'sankt-peterburg');
});

test('resolveCityLabel does not keep previous city on SPB SEO slug', () => {
  const cities = [
    ...destinations,
    {
      id: '3',
      name: 'Санкт-Петербург',
      slug: 'sankt-peterburg',
      type: 'city' as const,
      events: 100,
      venues: 20,
      categories: [],
    },
  ];
  assert.equal(resolveCityLabel([...cities], 'saint-petersburg'), 'Санкт-Петербург');
  assert.equal(resolveCityLabel([...cities], 'sankt-peterburg'), 'Санкт-Петербург');
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

test('resolveCatalogCityFilter maps SPB SEO slug even if header label is stale', () => {
  const options: Array<[string, number]> = [
    ['Москва', 10],
    ['Санкт-Петербург', 8],
    ['Уфа', 2],
  ];
  assert.equal(resolveCatalogCityFilter('Москва', options), 'Москва');
  assert.equal(resolveCatalogCityFilter('moscow', options, 'Москва'), 'Москва');
  assert.equal(resolveCatalogCityFilter('ufa', options, 'Уфа'), 'Уфа');
  assert.equal(resolveCatalogCityFilter('all', options), 'all');
  assert.equal(resolveCatalogCityFilter('saint-petersburg', options, 'Москва'), 'Санкт-Петербург');
  assert.equal(resolveCatalogCityFilter('sankt-peterburg', options, 'Москва'), 'Санкт-Петербург');
  assert.equal(resolveCatalogCityFilter('moscow', options, 'Уфа'), 'Москва');
});

test('catalogCityQueryValue prefers destination slug', () => {
  assert.equal(catalogCityQueryValue([...destinations], 'Уфа'), 'ufa');
  assert.equal(catalogCityQueryValue([...destinations], 'moscow'), 'moscow');
  assert.equal(catalogCityQueryValue([...destinations], 'all'), 'all');
});

test('resolveCatalogFetchCity prefers explicit URL over header', () => {
  assert.equal(
    resolveCatalogFetchCity({
      urlCity: 'Уфа',
      cityReady: true,
      headerCityValue: 'Москва',
      destinations: [...destinations],
    }),
    'ufa',
  );
  assert.equal(
    resolveCatalogFetchCity({
      urlCity: '',
      cityReady: true,
      headerCityValue: 'Уфа',
      destinations: [...destinations],
    }),
    'ufa',
  );
  assert.equal(
    resolveCatalogFetchCity({
      urlCityAll: true,
      cityReady: true,
      headerCityValue: 'Москва',
      destinations: [...destinations],
    }),
    undefined,
  );
});

test('resolveSectionCityFilter follows header once ready, URL only while bootstrapping', () => {
  const options: Array<[string, number]> = [
    ['Москва', 10],
    ['Пермь', 4],
  ];
  assert.equal(
    resolveSectionCityFilter({
      cityReady: true,
      headerCityValue: 'Пермь',
      headerCityLabel: 'Пермь',
      urlCity: 'moscow',
      cityOptions: options,
    }),
    'Пермь',
  );
  assert.equal(
    resolveSectionCityFilter({
      cityReady: true,
      headerCityValue: 'all',
      headerCityLabel: 'Все города',
      urlCity: 'moscow',
      cityOptions: options,
    }),
    'all',
  );
  assert.equal(
    resolveSectionCityFilter({
      cityReady: false,
      headerCityValue: 'all',
      urlCity: 'perm',
      cityOptions: options,
    }),
    'Пермь',
  );
  assert.equal(
    resolveSectionCityFilter({
      cityReady: false,
      urlCityAll: true,
      urlCity: '',
      cityOptions: options,
    }),
    'all',
  );
});

test('ensureCityInOptions prepends the selected city when stats list is filtered', () => {
  const options: Array<[string, number]> = [['Москва', 10]];
  assert.deepEqual(ensureCityInOptions(options, 'Пермь'), [
    ['Пермь', 0],
    ['Москва', 10],
  ]);
  assert.equal(ensureCityInOptions(options, 'Москва'), options);
  assert.equal(ensureCityInOptions(options, 'all'), options);
});

test('decodeSelectedCityCookie reads encoded city names', () => {
  assert.equal(decodeSelectedCityCookie('Москва'), 'Москва');
  assert.equal(decodeSelectedCityCookie(encodeURIComponent('Санкт-Петербург')), 'Санкт-Петербург');
  assert.equal(decodeSelectedCityCookie('all'), null);
  assert.equal(decodeSelectedCityCookie(''), null);
});
