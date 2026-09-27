import assert from 'node:assert/strict';
import test from 'node:test';
import { venueCanonicalPath, venueHref, venuePageTemplate } from './routes.ts';

test('venueCanonicalPath ignores stored path from the other family', () => {
  const venue = {
    id: 'venue_691e1ef5558b4d7999e63912',
    slug: 'cerkov-svyatogo-apostola-ioanna-yaani-kirik',
    name: 'Церковь Яани Кирик',
    type: 'club_bar_restaurant',
    canonicalPath: '/locations/cerkov-svyatogo-apostola-ioanna-yaani-kirik-691e1ef5558b4d7999e63912',
  };
  assert.equal(venuePageTemplate(venue.type), 'institution');
  assert.equal(venueHref(venue), '/venues/cerkov-svyatogo-apostola-ioanna-yaani-kirik');
  assert.equal(venueCanonicalPath(venue), '/venues/cerkov-svyatogo-apostola-ioanna-yaani-kirik');
});

test('venueCanonicalPath keeps matching location path', () => {
  const venue = {
    id: 'venue_1',
    slug: 'park-gorkogo',
    name: 'Парк Горького',
    type: 'park',
    canonicalPath: '/locations/park-gorkogo',
  };
  assert.equal(venueCanonicalPath(venue), '/locations/park-gorkogo');
});

test('venueCanonicalPath ignores stored same-family ID suffix that redirects to the public slug', () => {
  const venue = {
    id: 'venue_5dd900bd6314a2f6642d8b07',
    slug: 'maksimilians',
    name: 'Максимилианс',
    type: 'concert_hall',
    canonicalPath: '/venues/maksimilians-5dd900bd6314a2f6642d8b07',
  };
  assert.equal(venueHref(venue), '/venues/maksimilians');
  assert.equal(venueCanonicalPath(venue), '/venues/maksimilians');
});
