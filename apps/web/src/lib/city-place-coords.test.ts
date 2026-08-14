import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_INFO } from './cityInfo.ts';
import { lookupEditorialPlaceCoords } from './city-place-coords.ts';

/** South-bank Kama promenade must stay south of mid-channel / waterline pins. */
const PERM_WATERFRONT_MAX_LAT = 58.021;

test('Perm embankment editorial coords sit on south bank, not mid-Kama', () => {
  const nab = lookupEditorialPlaceCoords('naberezhnaya-kamy');
  const schaste = lookupEditorialPlaceCoords('perm-schaste-ne-za-gorami');
  const meshkov = lookupEditorialPlaceCoords('perm-dom-meshkova');

  assert.ok(nab);
  assert.ok(schaste);
  assert.ok(meshkov);

  assert.ok(nab.latitude < PERM_WATERFRONT_MAX_LAT, `naberezhnaya lat ${nab.latitude}`);
  assert.ok(schaste.latitude < PERM_WATERFRONT_MAX_LAT, `schaste lat ${schaste.latitude}`);
  assert.ok(meshkov.latitude < PERM_WATERFRONT_MAX_LAT, `meshkov lat ${meshkov.latitude}`);

  // Lon cluster around Monastyrskaya / river station, not swapped or city-centroid.
  assert.ok(nab.longitude > 56.24 && nab.longitude < 56.25);
  assert.ok(schaste.longitude > 56.249 && schaste.longitude < 56.252);
  assert.ok(meshkov.longitude > 56.245 && meshkov.longitude < 56.248);
});

test('Perm cityInfo mustSee waterfront coords match editorial map', () => {
  const places = CITY_INFO.perm?.mustSee || [];
  const bySlug = new Map(
    places
      .map((p) => {
        const slug = String(p.locationSlug || p.venueSlug || '').trim();
        return slug ? ([slug, p] as const) : null;
      })
      .filter((row): row is readonly [string, (typeof places)[number]] => Boolean(row)),
  );

  for (const slug of ['naberezhnaya-kamy', 'perm-schaste-ne-za-gorami', 'perm-dom-meshkova']) {
    const place = bySlug.get(slug);
    const editorial = lookupEditorialPlaceCoords(slug);
    assert.ok(place, `missing cityInfo place ${slug}`);
    assert.ok(editorial, `missing editorial ${slug}`);
    assert.equal(place.latitude, editorial.latitude, slug);
    assert.equal(place.longitude, editorial.longitude, slug);
  }
});
