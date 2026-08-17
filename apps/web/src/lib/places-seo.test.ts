import assert from 'node:assert/strict';
import test from 'node:test';

import { PLACES_HUB_DESCRIPTION } from './seo-meta.ts';
import { buildPlacesListingCopy, buildPlacesListingSeo } from './places-seo.ts';

test('places H1 is umbrella plus genitive city', () => {
  assert.equal(buildPlacesListingCopy(null).h1, 'Места и достопримечательности');
  assert.equal(buildPlacesListingCopy(null, 'institution').h1, 'Места и достопримечательности');

  const spb = buildPlacesListingCopy('Санкт-Петербург');
  assert.equal(spb.h1, 'Места и достопримечательности Санкт-Петербурга');
  assert.equal(spb.title, spb.h1);

  const moscow = buildPlacesListingCopy('Москва');
  assert.equal(moscow.h1, 'Места и достопримечательности Москвы');
  assert.match(moscow.description, /площадки/i);
  assert.match(moscow.description, /локации/i);
  assert.match(moscow.description, /Москвы/);
  assert.ok(moscow.description.length > 140);
  assert.ok(buildPlacesListingCopy(null).description.length > 140);
  assert.equal(buildPlacesListingCopy(null).description, PLACES_HUB_DESCRIPTION);
  assert.ok(!moscow.description.includes('\u2014') && !moscow.description.includes('\u2013'));

  const bySlug = buildPlacesListingCopy(null, null, 'saint-petersburg');
  assert.equal(bySlug.h1, 'Места и достопримечательности Санкт-Петербурга');
  assert.match(bySlug.description, /Санкт-Петербурга/);
});

test('places listing SEO puts city in description from slug alone', () => {
  const seo = buildPlacesListingSeo({ citySlug: 'saint-petersburg' });
  assert.equal(seo.canonicalPath, '/places');
  assert.match(seo.description, /Санкт-Петербурга/);
  assert.equal(seo.h1, 'Места и достопримечательности Санкт-Петербурга');
});

test('places listing canonical strips query junk to hub; never homepage', () => {
  assert.deepEqual(
    buildPlacesListingSeo({}),
    {
      ...buildPlacesListingCopy(null),
      canonicalPath: '/places',
      indexable: true,
    },
  );

  const city = buildPlacesListingSeo({
    cityName: 'Казань',
    citySlug: 'kazan',
  });
  assert.equal(city.canonicalPath, '/places');
  assert.equal(city.indexable, true);
  assert.equal(city.h1, 'Места и достопримечательности Казани');
  assert.equal(city.h1, buildPlacesListingCopy('Казань').h1);

  const family = buildPlacesListingSeo({ family: 'institution' });
  assert.equal(family.canonicalPath, '/places');
  assert.equal(family.indexable, true);

  const category = buildPlacesListingSeo({
    category: 'museums',
    citySlug: 'sankt-peterburg',
  });
  assert.equal(category.canonicalPath, '/places');
  assert.notEqual(category.canonicalPath, '/');
  assert.ok(category.description.trim().length > 80);

  const search = buildPlacesListingSeo({
    citySlug: 'saint-petersburg',
    cityName: 'Санкт-Петербург',
    q: 'эрмитаж',
  });
  assert.equal(search.canonicalPath, '/places');
  assert.equal(search.indexable, true);

  const typed = buildPlacesListingSeo({
    citySlug: 'moscow',
    type: 'museum',
    family: 'institution',
  });
  assert.equal(typed.canonicalPath, '/places');
  assert.equal(typed.indexable, true);

  const withEvents = buildPlacesListingSeo({
    citySlug: 'perm',
    hasEvents: '1',
  });
  assert.equal(withEvents.canonicalPath, '/places');

  const sorted = buildPlacesListingSeo({
    citySlug: 'perm',
    sort: 'asc',
  });
  assert.equal(sorted.canonicalPath, '/places');
});
