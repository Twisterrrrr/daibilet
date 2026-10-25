import assert from 'node:assert/strict';
import test from 'node:test';
import { cityCanonicalPath, venueCanonicalPath, venueHref, venuePageTemplate } from './routes.ts';

test('cityCanonicalPath normalizes a stored Cyrillic path for the same Latin city route', () => {
  const city = {
    slug: 'moskva',
    sourceSlug: 'москва',
    name: 'Москва',
    canonicalPath: '/cities/%D0%BC%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
  };
  assert.equal(cityCanonicalPath(city), '/cities/moskva');
});

test('cityCanonicalPath keeps intentional canonical paths to another city', () => {
  const city = {
    slug: 'moskva',
    name: 'Москва',
    canonicalPath: '/cities/another-city',
  };
  assert.equal(cityCanonicalPath(city), '/cities/another-city');
});

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
