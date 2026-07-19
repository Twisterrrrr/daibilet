import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogHref, catalogHrefWithSelectedCity } from './catalog-url.ts';
import {
  matchDestination,
  mergeStoredCityIntoEventsParams,
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

test('mergeStoredCityIntoEventsParams injects storage city only when city missing', () => {
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
    const injected = mergeStoredCityIntoEventsParams([...destinations], new URLSearchParams('date=today'));
    assert.ok(injected);
    assert.equal(injected!.get('city'), 'Уфа');
    assert.equal(injected!.get('date'), 'today');

    const kept = mergeStoredCityIntoEventsParams([...destinations], new URLSearchParams('city=Москва&date=today'));
    assert.equal(kept, null);

    storage.clear();
    const empty = mergeStoredCityIntoEventsParams([...destinations], new URLSearchParams(''));
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
