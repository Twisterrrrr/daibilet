import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlacesListingCopy, buildPlacesListingSeo } from './places-seo.ts';

test('places H1 is the fixed kinds list plus genitive city', () => {
  assert.equal(buildPlacesListingCopy(null).h1, 'Музеи, театры, локации, достопримечательности');
  assert.equal(
    buildPlacesListingCopy(null, 'institution').h1,
    'Музеи, театры, локации, достопримечательности',
  );

  const spb = buildPlacesListingCopy('Санкт-Петербург');
  assert.equal(spb.h1, 'Музеи, театры, локации, достопримечательности Санкт-Петербурга');
  assert.equal(spb.title, spb.h1);

  const moscow = buildPlacesListingCopy('Москва');
  assert.equal(moscow.h1, 'Музеи, театры, локации, достопримечательности Москвы');
  assert.match(moscow.description, /площадки/i);
  assert.match(moscow.description, /локации/i);
  assert.match(moscow.description, /Москвы/);
  assert.ok(moscow.description.length > 140);
  assert.ok(buildPlacesListingCopy(null).description.length > 140);

  const bySlug = buildPlacesListingCopy(null, null, 'saint-petersburg');
  assert.equal(bySlug.h1, 'Музеи, театры, локации, достопримечательности Санкт-Петербурга');
  assert.match(bySlug.description, /Санкт-Петербурга/);
});

test('places listing SEO puts city in description from slug alone', () => {
  const seo = buildPlacesListingSeo({ citySlug: 'saint-petersburg' });
  assert.equal(seo.canonicalPath, '/places?city=saint-petersburg');
  assert.match(seo.description, /Санкт-Петербурга/);
  assert.equal(seo.h1, 'Музеи, театры, локации, достопримечательности Санкт-Петербурга');
});

test('places listing canonical indexes hub, city and family; noindexes thin filters', () => {
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
  assert.equal(city.canonicalPath, '/places?city=kazan');
  assert.equal(city.indexable, true);
  assert.equal(city.h1, 'Музеи, театры, локации, достопримечательности Казани');
  assert.equal(city.h1, buildPlacesListingCopy('Казань').h1);

  const family = buildPlacesListingSeo({ family: 'institution' });
  assert.equal(family.canonicalPath, '/places?family=institution');
  assert.equal(family.indexable, true);

  const search = buildPlacesListingSeo({
    citySlug: 'saint-petersburg',
    cityName: 'Санкт-Петербург',
    q: 'эрмитаж',
  });
  assert.equal(search.canonicalPath, '/places?city=saint-petersburg');
  assert.equal(search.indexable, false);

  const typed = buildPlacesListingSeo({
    citySlug: 'moscow',
    type: 'museum',
    family: 'institution',
  });
  assert.equal(typed.canonicalPath, '/places?city=moscow');
  assert.equal(typed.indexable, false);

  const withEvents = buildPlacesListingSeo({
    citySlug: 'perm',
    hasEvents: '1',
  });
  assert.equal(withEvents.canonicalPath, '/places?city=perm');
  assert.equal(withEvents.indexable, false);

  const sorted = buildPlacesListingSeo({
    citySlug: 'perm',
    sort: 'asc',
  });
  assert.equal(sorted.canonicalPath, '/places?city=perm');
  assert.equal(sorted.indexable, false);
});
