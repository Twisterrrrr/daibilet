import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPlacesListingCopy,
  buildPlacesListingSeo,
  pickPlacesH1Types,
} from './places-seo.ts';

test('places H1 uses genitive city and unified listing copy', () => {
  assert.equal(buildPlacesListingCopy(null).h1, 'Музеи, театры, площадки, локации');
  assert.equal(
    buildPlacesListingCopy(null, 'institution').h1,
    'Музеи, театры, концертные залы, площадки',
  );
  assert.match(buildPlacesListingCopy('Москва').description, /площадки/i);
  assert.match(buildPlacesListingCopy('Москва').description, /локации/i);

  const spb = buildPlacesListingCopy('Санкт-Петербург', null, 'saint-petersburg');
  assert.match(spb.h1, /^[А-ЯЁ].+ Санкт-Петербурга$/);
  assert.equal(spb.title, spb.h1);
  assert.equal(
    spb.h1,
    buildPlacesListingCopy('Санкт-Петербург', null, 'saint-petersburg').h1,
  );
  assert.notEqual(
    buildPlacesListingCopy('Казань', null, 'kazan').h1,
    buildPlacesListingCopy('Пермь', null, 'perm').h1,
  );
});

test('places H1 types are stable per city seed and not Math.random', () => {
  const first = pickPlacesH1Types('saint-petersburg');
  const second = pickPlacesH1Types('saint-petersburg');
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.notDeepEqual(pickPlacesH1Types('kazan'), pickPlacesH1Types('perm'));
  assert.deepEqual(pickPlacesH1Types(''), ['музеи', 'театры', 'площадки', 'локации']);
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
  assert.match(city.h1, /Казани$/);
  assert.equal(city.h1, buildPlacesListingCopy('Казань', null, 'kazan').h1);

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
