import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_INFO } from './cityInfo.ts';
import {
  PERM_CATHEDRAL_SQUARE_COORDS,
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

test('any curated editorial slug always wins over nearby catalog drift', () => {
  const hermitage = pickEditorialPlaceCoordsIfStale('ermitazh', 59.9398, 30.3146);
  assert.deepEqual(hermitage, lookupEditorialPlaceCoords('ermitazh'));

  const already = pickEditorialPlaceCoordsIfStale(
    'ermitazh',
    lookupEditorialPlaceCoords('ermitazh')!.latitude,
    lookupEditorialPlaceCoords('ermitazh')!.longitude,
  );
  assert.equal(already, null);

  assert.equal(pickEditorialPlaceCoordsIfStale('unknown-place-xyz', 55, 37), null);
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

test('Perm Cathedral Square sits in Skver Mamina-Sibiryaka, not railway pin', () => {
  const square = lookupEditorialPlaceCoords('perm-sobornaya-ploschad');
  assert.ok(square);
  assert.equal(square.latitude, PERM_CATHEDRAL_SQUARE_COORDS.latitude);
  assert.equal(square.longitude, PERM_CATHEDRAL_SQUARE_COORDS.longitude);
  assert.ok(square.longitude > 56.232 && square.longitude < 56.2355);

  const place = (CITY_INFO.perm?.mustSee || []).find(
    (p) => String(p.locationSlug || '') === 'perm-sobornaya-ploschad',
  );
  assert.ok(place);
  assert.equal(place.latitude, PERM_CATHEDRAL_SQUARE_COORDS.latitude);
  assert.equal(place.longitude, PERM_CATHEDRAL_SQUARE_COORDS.longitude);

  const wikiCentroid = pickEditorialPlaceCoordsIfStale('perm-sobornaya-ploschad', 58.0163, 56.2378);
  assert.deepEqual(wikiCentroid, PERM_CATHEDRAL_SQUARE_COORDS);

  const railwayPin = pickEditorialPlaceCoordsIfStale('perm-sobornaya-ploschad', 58.0162, 56.241);
  assert.deepEqual(railwayPin, PERM_CATHEDRAL_SQUARE_COORDS);

  const alreadyYandex = pickEditorialPlaceCoordsIfStale(
    'perm-sobornaya-ploschad',
    PERM_CATHEDRAL_SQUARE_COORDS.latitude,
    PERM_CATHEDRAL_SQUARE_COORDS.longitude,
  );
  assert.equal(alreadyYandex, null);
});

test('SPB owner editor coords: Hermitage, Peter-Paul, Bronze Horseman', () => {
  const spots = [
    { slug: 'ermitazh', latitude: 59.939864, longitude: 30.314566 },
    { slug: 'saint-petersburg-petropavlovskaya-krepost', latitude: 59.950239, longitude: 30.316472 },
    { slug: 'saint-petersburg-mednyy-vsadnik', latitude: 59.936384, longitude: 30.302194 },
  ];
  const places = CITY_INFO['saint-petersburg']?.mustSee || [];
  const bySlug = new Map(
    places
      .map((p) => {
        const slug = String(p.venueSlug || p.locationSlug || '').trim();
        return slug ? ([slug, p] as const) : null;
      })
      .filter((row): row is readonly [string, (typeof places)[number]] => Boolean(row)),
  );

  for (const spot of spots) {
    const place = bySlug.get(spot.slug);
    const editorial = lookupEditorialPlaceCoords(spot.slug);
    assert.ok(place, `missing cityInfo place ${spot.slug}`);
    assert.ok(editorial, `missing editorial ${spot.slug}`);
    assert.equal(place.latitude, spot.latitude, `${spot.slug} cityInfo lat`);
    assert.equal(place.longitude, spot.longitude, `${spot.slug} cityInfo lng`);
    assert.equal(editorial.latitude, spot.latitude, `${spot.slug} editorial lat`);
    assert.equal(editorial.longitude, spot.longitude, `${spot.slug} editorial lng`);
    assert.equal(
      pickEditorialPlaceCoordsIfStale(spot.slug, spot.latitude, spot.longitude),
      null,
      `${spot.slug} should not rebase owner pin`,
    );
  }
});
