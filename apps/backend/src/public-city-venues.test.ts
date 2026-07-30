import assert from 'node:assert/strict';
import test from 'node:test';
import { countDistinctSessionVenues, publicVenuesForSessionsFromHub } from './dto.js';

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
  assert.ok(byId[0]);
  assert.equal(byId[0].id, 'venue_5ea93efb186c38b2a9d379bd');

  const bySlug = publicVenuesForSessionsFromHub(
    [{ venueSlug: 'mega-kruzhka', venue: 'Мега Кружка' }],
    hubRows,
    24,
  );
  assert.equal(bySlug.length, 1);
});
