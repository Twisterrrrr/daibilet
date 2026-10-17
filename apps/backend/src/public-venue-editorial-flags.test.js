import assert from 'node:assert/strict';
import test from 'node:test';

import { publicVenueEditorialFlags } from './public-venue-editorial-flags.js';
import { mapPublicVenueListItem } from './public-venue-read.js';

test('venue DTO marks an editorial pack and must-see entry for its city', () => {
  const venue = mapPublicVenueListItem({
    id: 'venue_ermitazh', slug: 'ermitazh', title: 'Эрмитаж', city: 'Санкт-Петербург',
    citySlug: 'санкт-петербург', kind: 'MUSEUM_ART_SPACE', pageStatus: 'PUBLISHED', events: 1,
  });
  assert.equal(venue.hasEditorialPack, true);
  assert.equal(venue.mustSee, true);
});

test('must-see and editorial pack are separate and city scoped', () => {
  assert.deepEqual(publicVenueEditorialFlags('saint-petersburg-kunstkamera', 'санкт-петербург'), {
    hasEditorialPack: false,
    mustSee: true,
  });
  assert.deepEqual(publicVenueEditorialFlags('ermitazh', 'москва', 'Москва'), {
    hasEditorialPack: true,
    mustSee: false,
  });
});
