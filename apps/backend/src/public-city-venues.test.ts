import assert from 'node:assert/strict';
import test from 'node:test';
import { countDistinctSessionVenues } from './public-destination.js';
import {
  mergeCityPageVenues,
  publicVenueRowMatchesCityFilter,
  publicVenuesForSessionsFromHub,
} from './dto.js';

test('countDistinctSessionVenues prefers venueId over slug/name', () => {
  const count = countDistinctSessionVenues([
    { venueId: 'venue_a', venueSlug: 'mega-kruzhka', venue: 'Мега Кружка', city: 'Мурманск' },
    { venueId: 'venue_a', venueSlug: 'mega-kruzhka', venue: 'Мега Кружка', city: 'Мурманск' },
    { venueSlug: 'other-hall', venue: 'Другой зал', city: 'Мурманск' },
  ]);
  assert.equal(count, 2);
});

test('publicVenuesForSessionsFromHub matches hub rows outside slug-only sessions', () => {
  const hubRows = [
    {
      id: 'venue_5ea93efb186c38b2a9d379bd',
      slug: 'мега-кружка-5ea93efb186c38b2a9d379bd',
      name: 'Мега Кружка',
      title: 'Мега Кружка',
      city: 'Мурманск',
      kind: 'CONCERT_HALL',
      pageStatus: 'candidate',
      events: 2,
      mergedVenueIds: ['venue_5ea93efb186c38b2a9d379bd'],
    },
  ];
  const byId = publicVenuesForSessionsFromHub(
    [{ venueId: 'venue_5ea93efb186c38b2a9d379bd', venueSlug: 'mega-kruzhka' }],
    hubRows,
    24,
  );
  assert.equal(byId.length, 1);
  assert.equal(byId[0].id, 'venue_5ea93efb186c38b2a9d379bd');

  const bySlug = publicVenuesForSessionsFromHub(
    [{ venueSlug: 'mega-kruzhka', venue: 'Мега Кружка' }],
    hubRows,
    24,
  );
  assert.equal(bySlug.length, 1);
});

test('mergeCityPageVenues prefers content/editorial then appends session venues', () => {
  const merged = mergeCityPageVenues(
    [{ id: 'v1', slug: 'hall-a', name: 'Hall', latitude: null, longitude: null }],
    [
      { id: 'v2', slug: 'nizhny-novgorod-nizhegorodskaya-yarmarka', name: 'Ярмарка', latitude: 56.3, longitude: 43.9 },
      { id: 'v1-dup', slug: 'hall-a', name: 'Hall again', latitude: 1, longitude: 2 },
    ],
    10,
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].slug, 'nizhny-novgorod-nizhegorodskaya-yarmarka');
  assert.equal(merged[1].slug, 'hall-a');
  assert.equal(merged[0].latitude, 56.3);
});

test('publicVenueRowMatchesCityFilter accepts nizhny aliases and slug prefix', () => {
  const row = {
    city: 'Нижний Новгород',
    citySlug: 'нижнии-новгород',
    slug: 'nizhny-novgorod-nizhegorodskaya-yarmarka',
  };
  assert.equal(publicVenueRowMatchesCityFilter(row, 'nizhny-novgorod'), true);
  assert.equal(publicVenueRowMatchesCityFilter(row, 'nizhniy-novgorod'), true);
  assert.equal(publicVenueRowMatchesCityFilter(row, 'нижнии-новгород'), true);
  assert.equal(publicVenueRowMatchesCityFilter(row, 'moscow'), false);
});

test('city-scoped family catalog must not short-circuit on warm-only event venues', () => {
  // Documented contract: catalog loads full hub (VENUE_CATALOG_HUB_MAX) with
  // requireEvents:false so editorial must-see (0 events) are included and
  // hero/chips totals are not pinned at take(500).
  const source = require('node:fs').readFileSync(new URL('./dto.js', import.meta.url), 'utf8');
  assert.match(source, /VENUE_CATALOG_HUB_MAX/);
  assert.match(source, /requireEvents: false/);
  assert.match(source, /Do NOT short-circuit on warmVenueCatalogList/);
});
