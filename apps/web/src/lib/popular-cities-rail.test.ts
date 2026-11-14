import assert from 'node:assert/strict';
import test from 'node:test';

import { orderPopularRailCities } from './popular-cities-rail.ts';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

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

test('orderPopularRailCities pins moscow then spb ahead of higher-event secondary cities', () => {
  const ordered = orderPopularRailCities(
    [
      city({ slug: 'nizhny-novgorod', name: 'Нижний Новгород', events: 90 }),
      city({ slug: 'krasnodar', name: 'Краснодар', events: 80 }),
      city({ slug: 'sankt-peterburg', name: 'Санкт-Петербург', events: 40 }),
      city({ slug: 'moscow', name: 'Москва', events: 50 }),
      city({ slug: 'kazan', name: 'Казань', events: 70 }),
    ],
    12,
  );

  assert.equal(ordered[0]?.slug, 'moscow');
  assert.equal(ordered[1]?.slug, 'sankt-peterburg');
  assert.equal(ordered[2]?.slug, 'nizhny-novgorod');
  assert.equal(ordered.length, 5);
});

test('orderPopularRailCities still prefers event count inside the non-focus tail', () => {
  const ordered = orderPopularRailCities(
    [
      city({ slug: 'moscow', name: 'Москва', events: 10 }),
      city({ slug: 'saint-petersburg', name: 'Санкт-Петербург', events: 9 }),
      city({ slug: 'sochi', name: 'Сочи', events: 30 }),
      city({ slug: 'kazan', name: 'Казань', events: 20 }),
    ],
    12,
  );

  assert.deepEqual(
    ordered.map((c) => c.slug),
    ['moscow', 'saint-petersburg', 'sochi', 'kazan'],
  );
});
