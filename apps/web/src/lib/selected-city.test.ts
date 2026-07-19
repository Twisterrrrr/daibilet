import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogHref, catalogHrefWithSelectedCity, venueCatalogHrefWithSelectedCity } from './catalog-url.ts';
import {
  isCityFilterPath,
  matchDestination,
  mergeStoredCityIntoEventsParams,
  mergeStoredCityIntoSearchParams,
  pathHrefWithSelectedCity,
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

test('isCityFilterPath covers events venues locations', () => {
  assert.equal(isCityFilterPath('/events'), true);
  assert.equal(isCityFilterPath('/venues'), true);
  assert.equal(isCityFilterPath('/locations'), true);
  assert.equal(isCityFilterPath('/cities'), false);
  assert.equal(isCityFilterPath('/events/slug'), true);
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
    assert.equal(injected!.get('city'), 'Уфа');
    assert.equal(injected!.get('date'), 'today');

    const kept = mergeStoredCityIntoEventsParams([...destinations], new URLSearchParams('city=Москва&date=today'));
    assert.equal(kept, null);

    storage.clear();
    const empty = mergeStoredCityIntoSearchParams([...destinations], new URLSearchParams(''));
    assert.equal(empty, null);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
  }
});

test('matchDestination resolves by name and slug', () => {
  assert.equal(matchDestination([...destinations], 'ufa')?.name, 'Уфа');
  assert.equal(matchDestination([...destinations], 'Уфа')?.slug, 'ufa');
  assert.equal(matchDestination([...destinations], 'all'), null);
});
