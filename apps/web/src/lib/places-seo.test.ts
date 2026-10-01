import assert from 'node:assert/strict';
import test from 'node:test';

import { PLACES_HUB_DESCRIPTION } from './seo-meta.ts';
import {
  buildPlacesDisplayHeading,
  buildPlacesListingCopy,
  buildPlacesListingSeo,
} from './places-seo.ts';

test('places display heading stays concise while SEO copy keeps the full taxonomy', () => {
  assert.equal(buildPlacesDisplayHeading(null), 'Места');
  assert.equal(buildPlacesDisplayHeading('Санкт-Петербург'), 'Места Санкт-Петербурга');
  assert.equal(buildPlacesDisplayHeading(null, 'moscow'), 'Места Москвы');
});

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
  assert.equal(buildPlacesListingCopy(null).description, PLACES_HUB_DESCRIPTION);
  assert.ok(!moscow.description.includes('\u2014') && !moscow.description.includes('\u2013'));

  const bySlug = buildPlacesListingCopy(null, null, 'saint-petersburg');
  assert.equal(bySlug.h1, 'Музеи, театры, локации, достопримечательности Санкт-Петербурга');
  assert.match(bySlug.description, /Санкт-Петербурга/);
});

test('places listing SEO puts city in description from slug alone', () => {
  const seo = buildPlacesListingSeo({ citySlug: 'saint-petersburg' });
  assert.equal(seo.canonicalPath, '/places');
  assert.match(seo.description, /Санкт-Петербурга/);
  assert.equal(seo.h1, 'Музеи, театры, локации, достопримечательности Санкт-Петербурга');
});

test('places listing canonical: hub without family, facet path with family', () => {
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
  assert.equal(city.h1, 'Музеи, театры, локации, достопримечательности Казани');
  assert.equal(city.h1, buildPlacesListingCopy('Казань').h1);

  // Family facets are their own documents now; each gets a self-canonical path.
  const institution = buildPlacesListingSeo({ family: 'institution' });
  assert.equal(institution.canonicalPath, '/places/institution');
  assert.equal(institution.indexable, true);

  const location = buildPlacesListingSeo({ family: 'location' });
  assert.equal(location.canonicalPath, '/places/location');

  // Pagination: page 1 is the indexable document, deeper pages are not, while
  // the canonical keeps pointing at page 1.
  const deep = buildPlacesListingSeo({ family: 'institution', page: '3' });
  assert.equal(deep.canonicalPath, '/places/institution');
  assert.equal(deep.indexable, false);

  const firstPage = buildPlacesListingSeo({ family: 'location', page: '1' });
  assert.equal(firstPage.canonicalPath, '/places/location');
  assert.equal(firstPage.indexable, true);

  const junk = buildPlacesListingSeo({ family: 'institution', page: 'not-a-page' });
  assert.equal(junk.indexable, true, 'garbage page numbers fall back to page 1');


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
  // Filters do not change the facet document; family still owns the canonical.
  assert.equal(typed.canonicalPath, '/places/institution');
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
