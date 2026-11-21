import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalogHref, cityPlaceTypeHref, cityPlacesCatalogHref } from './catalog-url';

test('city-place URLs switch only in explicit city-first mode', () => {
  const previousMode = process.env.NEXT_PUBLIC_CITY_URL_MODE;
  try {
    delete process.env.NEXT_PUBLIC_CITY_URL_MODE;
    assert.equal(cityPlacesCatalogHref('perm'), '/places/c/perm');
    assert.equal(cityPlaceTypeHref('perm', 'museums'), '/places?city=perm&type=museums');

    process.env.NEXT_PUBLIC_CITY_URL_MODE = 'city-first';
    assert.equal(cityPlacesCatalogHref('perm'), '/perm/places');
    assert.equal(cityPlacesCatalogHref('perm', 2), '/perm/places?page=2');
    assert.equal(cityPlaceTypeHref('perm', 'museums'), '/perm/museums');
  } finally {
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_CITY_URL_MODE;
    else process.env.NEXT_PUBLIC_CITY_URL_MODE = previousMode;
  }
});

test('city event catalogs preserve their route and keep the fixed city out of query filters', () => {
  assert.equal(
    buildCatalogHref({ city: 'moscow', category: 'Концерты', page: 2 }, { pathname: '/moscow/events', omitCity: true }),
    '/moscow/events?category=%D0%9A%D0%BE%D0%BD%D1%86%D0%B5%D1%80%D1%82%D1%8B&page=2',
  );
});
