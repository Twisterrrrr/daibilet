import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicVenueDto } from '@daibilet/contracts/public';

import { filterVenuesByCity, resolveCatalogCityLabel } from './landing-city';

function venue(partial: Partial<PublicVenueDto>): PublicVenueDto {
  return {
    id: 'v1',
    name: 'Музей',
    city: 'Москва',
    type: 'museum_art_space',
    events: 5,
    categories: {},
    ...partial,
  };
}

test('filterVenuesByCity: matches by city name', () => {
  const venues = [venue({ id: '1', city: 'Москва' }), venue({ id: '2', city: 'Казань' })];
  const filtered = filterVenuesByCity(venues, 'Москва', 'moscow');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.id, '1');
});

test('filterVenuesByCity: returns all when city not selected', () => {
  const venues = [venue({ id: '1' }), venue({ id: '2', city: 'Казань' })];
  assert.equal(filterVenuesByCity(venues, null).length, 2);
});

test('resolveCatalogCityLabel: slug to display name', () => {
  assert.equal(resolveCatalogCityLabel('moscow'), 'Москва');
  assert.equal(resolveCatalogCityLabel('Москва'), 'Москва');
  assert.equal(resolveCatalogCityLabel('all'), null);
  assert.equal(resolveCatalogCityLabel(''), null);
});
