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
