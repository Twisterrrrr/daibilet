import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countDistinctSessionVenues,
  destinationPrepositional,
  publicDestinationFromSession,
} from './public-destination.js';

test('countDistinctSessionVenues prefers venueId over slug/name', () => {
  const count = countDistinctSessionVenues([
    { venueId: 'venue_a', venueSlug: 'mega-kruzhka', venue: 'Мега Кружка', city: 'Мурманск' } as never,
    { venueId: 'venue_a', venueSlug: 'mega-kruzhka', venue: 'Мега Кружка', city: 'Мурманск' } as never,
    { venueSlug: 'other-hall', venue: 'Другой зал', city: 'Мурманск' } as never,
  ]);
  assert.equal(count, 2);
});

test('publicDestinationFromSession maps region type from destinationType', () => {
  const destination = publicDestinationFromSession({
    destination: 'Московская область',
    destinationType: 'region',
    city: 'Подольск',
    cityId: 'city_podolsk',
    sourceCitySlug: 'podolsk',
  } as never);
  assert.equal(destination.type, 'region');
  assert.equal(destination.name, 'Московская область');
});

test('destinationPrepositional returns known city forms', () => {
  assert.equal(
    destinationPrepositional({ slug: 'moskva', name: 'Москва', type: 'city' }),
    'в Москве',
  );
  assert.equal(
    destinationPrepositional({
      slug: 'respublika-kareliya',
      name: 'Республика Карелия',
      type: 'region',
    }),
    'в Республике Карелии',
  );
});
