import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPublicVenueHub,
  mergeCityPageVenues,
  publicVenueRowMatchesCityFilter,
  publicVenuesForSessionsFromHub,
} from './public-venue-read.js';

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

test('publicVenuesForSessionsFromHub matches hub rows by venueId and slug', () => {
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
  assert.equal(byId[0]?.id, 'venue_5ea93efb186c38b2a9d379bd');

  const bySlug = publicVenuesForSessionsFromHub(
    [{ venueSlug: 'mega-kruzhka', venue: 'Мега Кружка' }],
    hubRows,
    24,
  );
  assert.equal(bySlug.length, 1);
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

test('isPublicVenueHub basic gate', () => {
  assert.equal(isPublicVenueHub(null), false);
  assert.equal(
    isPublicVenueHub({
      id: 'v1',
      name: 'Зал',
      kind: 'CONCERT_HALL',
      pageStatus: 'published',
      events: 3,
    }),
    true,
  );
  assert.equal(
    isPublicVenueHub({
      id: 'v2',
      name: 'Скрытая',
      kind: 'CONCERT_HALL',
      pageStatus: 'HIDDEN',
      events: 5,
    }),
    false,
  );
  assert.equal(
    isPublicVenueHub({
      id: 'v3',
      name: 'Точка сбора у метро',
      kind: 'MEETING_POINT',
      pageStatus: 'published',
      events: 2,
      busEvents: 0,
    }),
    false,
  );
});
