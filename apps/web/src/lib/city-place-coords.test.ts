import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_INFO } from './cityInfo.ts';
import {
  PERM_KAMA_WATERFRONT_MAX_LAT,
  PERM_NABEREZHNAYA_KAMY_COORDS,
  PERM_SCHASTE_COORDS,
  lookupEditorialPlaceCoords,
  pickEditorialPlaceCoordsIfStale,
} from './city-place-coords.ts';

test('Perm embankment editorial coords sit on south bank, not mid-Kama', () => {
  const nab = lookupEditorialPlaceCoords('naberezhnaya-kamy');
  const schaste = lookupEditorialPlaceCoords('perm-schaste-ne-za-gorami');
  const meshkov = lookupEditorialPlaceCoords('perm-dom-meshkova');

  assert.ok(nab);
  assert.ok(schaste);
  assert.ok(meshkov);

  assert.ok(
    nab.latitude <= PERM_KAMA_WATERFRONT_MAX_LAT,
    `naberezhnaya lat ${nab.latitude} is north of land threshold ${PERM_KAMA_WATERFRONT_MAX_LAT}`,
  );
  assert.ok(
    schaste.latitude <= PERM_KAMA_WATERFRONT_MAX_LAT,
    `schaste lat ${schaste.latitude} is north of land threshold ${PERM_KAMA_WATERFRONT_MAX_LAT}`,
  );
  assert.ok(
    meshkov.latitude <= PERM_KAMA_WATERFRONT_MAX_LAT,
    `meshkov lat ${meshkov.latitude} is north of land threshold ${PERM_KAMA_WATERFRONT_MAX_LAT}`,
  );

  // Lon cluster around Monastyrskaya / river station, not swapped or city-centroid.
  assert.ok(nab.longitude > 56.2455 && nab.longitude < 56.2475);
  assert.ok(schaste.longitude > 56.2495 && schaste.longitude < 56.2515);
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

test('stale Perm water / previous-fix pins rebase onto south-bank editorial', () => {
  const midRiver = pickEditorialPlaceCoordsIfStale('naberezhnaya-kamy', 58.021111, 56.243889);
  assert.deepEqual(midRiver, PERM_NABEREZHNAYA_KAMY_COORDS);

  const previousFix = pickEditorialPlaceCoordsIfStale('naberezhnaya-kamy', 58.01985, 56.2467);
  assert.deepEqual(previousFix, PERM_NABEREZHNAYA_KAMY_COORDS);

  const schasteWater = pickEditorialPlaceCoordsIfStale('perm-schaste-ne-za-gorami', 58.0205, 56.2507);
  assert.deepEqual(schasteWater, PERM_SCHASTE_COORDS);

  const alreadyLand = pickEditorialPlaceCoordsIfStale(
    'naberezhnaya-kamy',
    PERM_NABEREZHNAYA_KAMY_COORDS.latitude,
    PERM_NABEREZHNAYA_KAMY_COORDS.longitude,
  );
  assert.equal(alreadyLand, null);
});
