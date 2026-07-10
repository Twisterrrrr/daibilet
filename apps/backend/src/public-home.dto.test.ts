import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicStatsCounts } from './public-home.dto.js';

test('builds public stats from grouped event rows and regional destination rules', () => {
  const stats = buildPublicStatsCounts([
    statsRow({
      groupKey: 'tc|walk-one|ramenskoe|pier-1',
      cityId: 'city-ramenskoe',
      city: 'Раменское',
      citySlug: 'ramenskoe',
      regionId: 'region-moscow',
      regionSlug: 'moskovskaya-oblast',
      regionTitle: 'Московская область',
      venueId: 'venue-1',
    }),
    statsRow({
      groupKey: 'tc|walk-two|ramenskoe|pier-2',
      cityId: 'city-ramenskoe',
      city: 'Раменское',
      citySlug: 'ramenskoe',
      regionId: 'region-moscow',
      regionSlug: 'moskovskaya-oblast',
      regionTitle: 'Московская область',
      venueId: 'venue-2',
    }),
    statsRow({
      groupKey: 'tc|museum|tver|museum-1',
      cityId: 'city-tver',
      city: 'Тверь',
      citySlug: 'tver',
      venueId: 'venue-3',
    }),
  ], 42, 9);

  assert.deepEqual(stats, {
    events: 3,
    destinations: 1,
    cities: 1,
    venues: 42,
    landings: 9,
  });
});

function statsRow(overrides: {
  groupKey: string;
  cityId?: string | null;
  city?: string | null;
  citySlug?: string | null;
  cityIsDestination?: boolean | null;
  regionId?: string | null;
  regionSlug?: string | null;
  regionTitle?: string | null;
  venueId?: string | null;
}) {
  return {
    cityId: null,
    city: null,
    citySlug: null,
    cityIsDestination: null,
    regionId: null,
    regionSlug: null,
    regionTitle: null,
    venueId: null,
    ...overrides,
  };
}
