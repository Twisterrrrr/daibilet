import assert from 'node:assert/strict';
import test from 'node:test';

import { cityPlaceTypeHref, cityPlacesCatalogHref } from './catalog-url';

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
