import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterVenuePageSessionsByCity,
  sameVenuePageCity,
} from './venue-page-sessions.ts';

test('keeps Moscow sessions when venue city slug is stored in Cyrillic', () => {
  const venue = { city: 'Москва', citySlug: 'москва' };
  const sessions = [
    { id: 'local', city: 'Москва', citySlug: 'moskva', title: 'Джазовый концерт' },
    {
      id: 'foreign',
      city: 'Красноярск',
      citySlug: 'krasnoyarsk',
      title: 'Гастроли в Красноярске',
    },
  ];

  assert.deepEqual(filterVenuePageSessionsByCity(sessions, venue), [sessions[0]]);
});

test('recognizes Russian and transliterated Moscow keys as the same city', () => {
  assert.equal(
    sameVenuePageCity(
      { citySlug: 'москва' },
      { citySlug: 'moskva', title: 'Вечерняя Москва' },
    ),
    true,
  );
});
