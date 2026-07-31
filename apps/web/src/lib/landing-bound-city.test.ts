import assert from 'node:assert/strict';
import test from 'node:test';

import {
  landingMatchesBoundCity,
  landingMatchesCatalogCity,
  mergePodborkiCityCatalogItems,
  resolveLandingBoundCitySlug,
} from './landing-routes.ts';

test('resolveLandingBoundCitySlug: CITY-scoped landings', () => {
  assert.equal(resolveLandingBoundCitySlug('moscow-museums'), 'moscow');
  assert.equal(resolveLandingBoundCitySlug('moscow-dinner-boat'), 'moscow');
  assert.equal(resolveLandingBoundCitySlug('spb-yards'), 'saint-petersburg');
  assert.equal(resolveLandingBoundCitySlug('bridges-night'), 'saint-petersburg');
  assert.equal(resolveLandingBoundCitySlug('planetarium'), 'saint-petersburg');
});

test('resolveLandingBoundCitySlug: single-city allowlist', () => {
  assert.equal(resolveLandingBoundCitySlug('country-tours'), 'saint-petersburg');
});

test('resolveLandingBoundCitySlug: national landings have no bound city', () => {
  assert.equal(resolveLandingBoundCitySlug('river-cruises'), null);
  assert.equal(resolveLandingBoundCitySlug('standup'), null);
  assert.equal(resolveLandingBoundCitySlug('family-kids'), null);
  assert.equal(resolveLandingBoundCitySlug('rooftops'), null);
});

test('landingMatchesBoundCity: aliases and strict national hide', () => {
  assert.equal(landingMatchesBoundCity('moscow-museums', 'moscow'), true);
  assert.equal(landingMatchesBoundCity('moscow-museums', 'moskva'), true);
  assert.equal(landingMatchesBoundCity('spb-yards', 'sankt-peterburg'), true);
  assert.equal(landingMatchesBoundCity('spb-yards', 'moscow'), false);
  assert.equal(landingMatchesBoundCity('river-cruises', 'moscow'), false);
  assert.equal(landingMatchesBoundCity('river-cruises', 'all'), false);
});

test('landingMatchesCatalogCity: city-bound + national with events', () => {
  assert.equal(landingMatchesCatalogCity('moscow-museums', 'moscow'), true);
  assert.equal(landingMatchesCatalogCity('moscow-museums', 'kazan'), false);
  assert.equal(landingMatchesCatalogCity('river-cruises', 'moscow', { events: 3 }), true);
  assert.equal(landingMatchesCatalogCity('river-cruises', 'moscow', { events: 0 }), false);
  assert.equal(landingMatchesCatalogCity('river-cruises', 'moscow'), true);
  assert.equal(landingMatchesCatalogCity('country-tours', 'moscow'), false);
  assert.equal(landingMatchesCatalogCity('country-tours', 'saint-petersburg'), true);
  assert.equal(landingMatchesCatalogCity('standup', 'all'), false);
});

test('mergePodborkiCityCatalogItems: keeps city-bound and city-hit nationals', () => {
  const national = [
    { slug: 'river-cruises', events: 40 },
    { slug: 'moscow-museums', events: 12 },
    { slug: 'spb-yards', events: 8 },
    { slug: 'standup', events: 20 },
  ];
  const cityScoped = [
    { slug: 'river-cruises', events: 5 },
    { slug: 'standup', events: 2 },
  ];
  const merged = mergePodborkiCityCatalogItems(national, cityScoped, 'moscow');
  const slugs = merged.map((item) => item.slug).sort();
  assert.deepEqual(slugs, ['moscow-museums', 'river-cruises', 'standup']);
  assert.equal(merged.find((item) => item.slug === 'river-cruises')?.events, 5);
  assert.equal(merged.find((item) => item.slug === 'moscow-museums')?.events, 12);
});
