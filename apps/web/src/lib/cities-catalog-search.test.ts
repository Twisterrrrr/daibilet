import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicDestinationDto } from '@daibilet/contracts/public';

import { matchCitiesCatalogSearch } from './cities-catalog-search.ts';

function city(
  partial: Partial<PublicDestinationDto> & { slug: string; name: string; events: number },
): PublicDestinationDto {
  return {
    type: 'city',
    venues: 0,
    categories: [],
    ...partial,
  };
}

const CATALOG = [
  city({ slug: 'moscow', name: 'Москва', events: 400 }),
  city({ slug: 'saint-petersburg', name: 'Санкт-Петербург', events: 300 }),
  city({ slug: 'voronezh', name: 'Воронеж', events: 40 }),
];

test('/cities search shows Выборг as oblast child, not a grid card', () => {
  const result = matchCitiesCatalogSearch('выборг', CATALOG);

  assert.deepEqual(result.gridCities.map((item) => item.slug), []);
  assert.equal(result.geoHits.length, 1);
  assert.equal(result.geoHits[0]?.kind, 'satellite');
  assert.equal(result.geoHits[0]?.title, 'Выборг, Ленинградская область');
  assert.equal(result.geoHits[0]?.subtitle, 'Выборг, Ленинградская область • Ближайшие события');
  assert.equal(result.geoHits[0]?.href, '/cities/leningradskaya-oblast?city=vyborg');
  assert.equal(result.suggestions[0]?.title, 'Выборг, Ленинградская область');
  assert.equal(result.suggestions[0]?.href, '/cities/leningradskaya-oblast?city=vyborg');
});

test('/cities search sends palace suburbs to the parent hub, not a City row', () => {
  const result = matchCitiesCatalogSearch('петергоф', CATALOG);

  assert.deepEqual(result.gridCities.map((item) => item.slug), []);
  assert.equal(result.geoHits[0]?.kind, 'suburb');
  assert.equal(result.geoHits[0]?.title, 'Петергоф');
  assert.equal(result.geoHits[0]?.href, '/cities/saint-petersburg/?suburb=petergof#city-suburbs');
});

test('/cities search keeps Раменское as a region-hub link without a fake card', () => {
  const result = matchCitiesCatalogSearch('раменское', CATALOG);
  assert.equal(result.gridCities.length, 0);
  assert.equal(result.geoHits[0]?.kind, 'satellite');
  assert.equal(result.geoHits[0]?.title, 'Раменское, Московская область');
  assert.equal(result.geoHits[0]?.href, '/cities/moskovskaya-oblast?city=ramenskoe');
});

test('thin dual-membership town is a search link, not a synthesized CityCard', () => {
  const result = matchCitiesCatalogSearch('тольятти', CATALOG);
  assert.equal(result.gridCities.length, 0);
  assert.equal(
    result.geoHits.some((hit) => hit.href === '/cities/tolyatti' || hit.title === 'Тольятти'),
    true,
  );
  assert.equal(
    result.suggestions.some((hit) => hit.href === '/cities/tolyatti'),
    true,
  );
});

test('standalone hub stays a real grid card when it is already in destinations', () => {
  const result = matchCitiesCatalogSearch('воронеж', CATALOG);
  assert.deepEqual(result.gridCities.map((item) => item.slug), ['voronezh']);
  assert.equal(result.geoHits.length, 0);
  assert.equal(result.suggestions[0]?.href, '/cities/voronezh');
  assert.equal(result.suggestions[0]?.kind, 'city');
});

test('пушкин focuses Царское Село on the SPb suburbs block', () => {
  const result = matchCitiesCatalogSearch('пушкин', CATALOG);
  assert.equal(result.gridCities.length, 0);
  assert.equal(result.geoHits[0]?.kind, 'suburb');
  assert.equal(result.geoHits[0]?.title, 'Царское Село');
  assert.equal(result.geoHits[0]?.href, '/cities/saint-petersburg/?suburb=carskoe-selo#city-suburbs');
});

test('promoted dual-membership town with a catalog card stays in the grid', () => {
  const withTolyatti = [
    ...CATALOG,
    city({ slug: 'tolyatti', name: 'Тольятти', events: 12 }),
  ];
  const result = matchCitiesCatalogSearch('тольятти', withTolyatti);
  assert.deepEqual(result.gridCities.map((item) => item.slug), ['tolyatti']);
  assert.equal(result.geoHits.length, 0);
  assert.equal(result.suggestions[0]?.kind, 'city');
  assert.equal(result.suggestions[0]?.href, '/cities/tolyatti');
});

test('питер synonym still finds the SPb card without inventing a suburb row', () => {
  const result = matchCitiesCatalogSearch('питер', CATALOG);
  assert.equal(result.gridCities.some((item) => item.slug === 'saint-petersburg'), true);
  assert.equal(
    result.gridCities.some((item) => item.slug === 'petergof' || item.name === 'Петергоф'),
    false,
  );
});
