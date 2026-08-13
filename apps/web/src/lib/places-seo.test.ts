import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlacesListingCopy, buildPlacesListingSeo } from './places-seo.ts';

test('places H1 uses genitive city and unified listing copy', () => {
  assert.equal(
    buildPlacesListingCopy('Санкт-Петербург').h1,
    'Музеи, театры, площадки, локации Санкт-Петербурга',
  );
  assert.equal(buildPlacesListingCopy(null).h1, 'Музеи, театры, площадки, локации');
  assert.match(buildPlacesListingCopy('Москва').description, /площадки/i);
  assert.match(buildPlacesListingCopy('Москва').description, /локации/i);
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
  assert.equal(city.h1, 'Музеи, театры, площадки, локации Казани');

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
});
