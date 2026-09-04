import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RYAZAN_DAY_ROUTE_PRESETS,
  RYAZAN_FAQ,
  RYAZAN_MUST_SEE,
  RYAZAN_SUBURBS,
} from './ryazan-hub.ts';

function empty(value: unknown): boolean {
  return !String(value ?? '').trim();
}

function slugOf(place: { locationSlug?: string; venueSlug?: string; dayRouteId?: string }): string {
  return String(place.locationSlug || place.venueSlug || place.dayRouteId || '');
}

test('Ryazan hub mustSee has 50 core plus monuments and mushroom quest', () => {
  assert.ok(RYAZAN_MUST_SEE.length >= 70);
  const monuments = RYAZAN_MUST_SEE.filter((place: { mustSeeFilter?: string }) => place.mustSeeFilter === 'monument');
  const secrets = RYAZAN_MUST_SEE.filter((place: { mustSeeFilter?: string }) => place.mustSeeFilter === 'secret');
  assert.equal(monuments.length, 15);
  assert.equal(secrets.length, 7);
  const theatre = RYAZAN_MUST_SEE.find(
    (place: { venueSlug?: string }) => place.venueSlug === 'ryazan-muzykalnyy-teatr',
  ) as { longitude?: number } | undefined;
  assert.ok(theatre);
  assert.ok(Math.abs((theatre?.longitude || 0) - 39.752901) < 0.001);
  assert.ok((theatre?.longitude || 0) < 50);
  for (const place of RYAZAN_MUST_SEE) {
    assert.equal(empty(place.desc), false, place.name);
    assert.equal(empty(place.address), false, place.name);
    assert.ok(Number.isFinite(place.latitude), `${place.name} lat`);
    assert.ok(Number.isFinite(place.longitude), `${place.name} lng`);
    const slug = slugOf(place);
    assert.match(slug, /^ryazan-/);
    assert.equal(JSON.stringify(place).includes('\u2014'), false, place.name);
    assert.equal(JSON.stringify(place).includes('\u2013'), false, place.name);
  }
});

test('Ryazan suburbs Konstantinovo and Solotcha keep nested POIs', () => {
  const bySlug = new Map(
    RYAZAN_SUBURBS.map((suburb: { locationSlug?: string }) => [suburb.locationSlug, suburb]),
  );
  for (const slug of ['ryazan-konstantinovo', 'ryazan-solotcha']) {
    const suburb = bySlug.get(slug) as
      | {
          desc?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          travelVectorBlurb?: string;
          places?: Array<{
            name: string;
            desc?: string;
            address?: string;
            latitude?: number;
            longitude?: number;
            locationSlug?: string;
          }>;
        }
      | undefined;
    assert.ok(suburb, slug);
    assert.equal(empty(suburb?.desc), false, slug);
    assert.equal(empty(suburb?.address), false, `${slug} address`);
    assert.ok(Number.isFinite(suburb?.latitude), `${slug} lat`);
    assert.ok(Number.isFinite(suburb?.longitude), `${slug} lng`);
    assert.ok((suburb?.places || []).length >= 7, `${slug} nested`);
    for (const nested of suburb?.places || []) {
      assert.equal(empty(nested.desc), false, `${slug} / ${nested.name}`);
      assert.match(String(nested.locationSlug), /^ryazan-/);
      assert.equal(empty(nested.address), false, nested.name);
      assert.ok(Number.isFinite(nested.latitude), nested.name);
      assert.ok(Number.isFinite(nested.longitude), nested.name);
    }
  }
  assert.match(String(bySlug.get('ryazan-konstantinovo')?.travelVectorBlurb), /132/);
  assert.match(String(bySlug.get('ryazan-solotcha')?.travelVectorBlurb), /108/);
  const kon = bySlug.get('ryazan-konstantinovo') as { longitude?: number } | undefined;
  assert.ok(
    Math.abs((kon?.longitude || 0) - 39.598984) < 0.01,
    'Konstantinovo pin must sit in the village (OSM museum), not 10 km west',
  );
});

test('Ryazan day presets include two walks, mushroom map and painted lines', () => {
  const ids = RYAZAN_DAY_ROUTE_PRESETS.map((preset: { id: string }) => preset.id);
  assert.ok(ids.includes('ryazan-kremlin-merchant'));
  assert.ok(ids.includes('ryazan-wooden-lace'));
  assert.ok(ids.includes('ryazan-bronze-mushrooms'));
  assert.ok(ids.includes('ryazan-green-line'));
  assert.ok(ids.includes('ryazan-red-line'));
  const mushrooms = RYAZAN_DAY_ROUTE_PRESETS.find(
    (preset: { id: string }) => preset.id === 'ryazan-bronze-mushrooms',
  ) as { stops?: Array<{ locationSlug?: string }> } | undefined;
  assert.deepEqual(
    (mushrooms?.stops || []).map((stop) => stop.locationSlug),
    [
      'ryazan-grib-borovik',
      'ryazan-grib-rybak',
      'ryazan-grib-gribniki',
      'ryazan-grib-korobeynik',
      'ryazan-grib-mudrets',
      'ryazan-grib-sportsmen',
      'ryazan-grib-puteshestvennik',
    ],
  );
});

test('Ryazan FAQ has 4 owner questions without long dashes', () => {
  assert.equal(RYAZAN_FAQ.length, 4);
  assert.ok(RYAZAN_FAQ.some((item) => /вокзал/i.test(item.q)));
  assert.ok(RYAZAN_FAQ.some((item) => /грибы с глазами/i.test(item.q)));
  assert.ok(RYAZAN_FAQ.some((item) => /кремл/i.test(item.q)));
  assert.ok(RYAZAN_FAQ.some((item) => /константиново/i.test(item.q)));
  assert.ok(
    RYAZAN_FAQ.every((item) => !JSON.stringify(item).includes('\u2014') && !JSON.stringify(item).includes('\u2013')),
  );
});
