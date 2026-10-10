import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BARNAUL_DAY_ROUTE_PRESETS,
  BARNAUL_FAQ,
  BARNAUL_MUST_SEE,
  BARNAUL_SUBURBS,
  BARNAUL_TRAVEL,
} from './barnaul-hub.ts';

function empty(value: unknown): boolean {
  return !String(value ?? '').trim();
}

function slugOf(place: { locationSlug?: string; venueSlug?: string; dayRouteId?: string }): string {
  return String(place.locationSlug || place.venueSlug || place.dayRouteId || '');
}

function noDash(value: unknown): boolean {
  const text = JSON.stringify(value);
  return !text.includes('\u2014') && !text.includes('\u2013');
}

test('Barnaul hub mustSee has exactly 50 places with unique slugs', () => {
  assert.equal(BARNAUL_MUST_SEE.length, 50);
  const slugs = BARNAUL_MUST_SEE.map((place) => slugOf(place));
  assert.equal(new Set(slugs).size, 50);
  for (const place of BARNAUL_MUST_SEE) {
    assert.equal(empty(place.desc), false, place.name);
    assert.equal(empty(place.address), false, place.name);
    assert.ok(Number.isFinite(place.latitude), `${place.name} lat`);
    assert.ok(Number.isFinite(place.longitude), `${place.name} lng`);
    assert.match(slugOf(place), /^barnaul-/);
    assert.ok(noDash(place), place.name);
  }
  assert.ok(
    BARNAUL_MUST_SEE.some(
      (place) => place.locationSlug === 'barnaul-nagornyy-park-i-bukvy-barnaul',
    ),
  );
  assert.ok(
    BARNAUL_MUST_SEE.some(
      (place) => place.locationSlug === 'barnaul-malo-tobol-skaya-ulitsa-barnaul-skiy-arbat',
    ),
  );
  assert.ok(
    BARNAUL_MUST_SEE.some(
      (place) => place.locationSlug === 'barnaul-barnaul-skiy-serebroplavil-nyy-zavod-spichka',
    ),
  );
  assert.ok(
    BARNAUL_MUST_SEE.some(
      (place) => place.venueSlug === 'barnaul-muzey-avtougona-imeni-yuriya-detochkina',
    ),
  );
  assert.ok(
    BARNAUL_MUST_SEE.some(
      (place) =>
        place.venueSlug === 'barnaul-gosudarstvennyy-hudozhestvennyy-muzey-altayskogo-kraya-ghmak',
    ),
  );
  assert.ok(
    BARNAUL_MUST_SEE.some((place) => place.venueSlug === 'barnaul-muzey-mir-vremeni'),
  );
});

test('Barnaul suburbs are 3 with nested places', () => {
  assert.equal(BARNAUL_SUBURBS.length, 3);
  assert.ok(
    BARNAUL_SUBURBS.some(
      (suburb: { locationSlug?: string }) => suburb.locationSlug === 'barnaul-ozero-krasilovo',
    ),
  );
  assert.ok(
    BARNAUL_SUBURBS.some(
      (suburb: { locationSlug?: string }) =>
        suburb.locationSlug === 'barnaul-strausinaya-rancho-vlasikha',
    ),
  );
  assert.ok(
    BARNAUL_SUBURBS.some(
      (suburb: { locationSlug?: string }) => suburb.locationSlug === 'barnaul-pavlovsk-serebryanyy-bor',
    ),
  );
  for (const suburb of BARNAUL_SUBURBS) {
    assert.equal(empty(suburb.desc), false, suburb.name);
    assert.equal(empty(suburb.address), false, suburb.name);
    assert.ok(Number.isFinite(suburb.latitude), suburb.name);
    assert.ok((suburb.places || []).length >= 6, suburb.name);
    for (const nested of suburb.places || []) {
      assert.match(slugOf(nested), /^barnaul-/);
      assert.equal(empty(nested.desc), false, nested.name);
      assert.ok(noDash(nested), nested.name);
    }
    assert.ok(noDash(suburb), suburb.name);
  }
});

test('Barnaul day presets include two classics and painted lines', () => {
  const ids = BARNAUL_DAY_ROUTE_PRESETS.map((preset: { id: string }) => preset.id);
  assert.ok(ids.includes('barnaul-gornozavodskoy-kupecheskiy'));
  assert.ok(ids.includes('barnaul-aristokraticheskiy-prospekt'));
  assert.ok(ids.includes('barnaul-green-line'));
  assert.ok(ids.includes('barnaul-red-line'));
});

test('Barnaul FAQ has 4 owner topics without long dashes', () => {
  assert.equal(BARNAUL_FAQ.length, 4);
  assert.ok(BARNAUL_FAQ.some((item) => /аэропорт|автобус/i.test(item.q + item.a)));
  assert.ok(BARNAUL_FAQ.some((item) => /подзем/i.test(item.q)));
  assert.ok(BARNAUL_FAQ.some((item) => /Ленточн/i.test(item.q + item.a)));
  assert.ok(BARNAUL_FAQ.some((item) => /пробк|мост/i.test(item.q + item.a)));
  assert.ok(noDash(BARNAUL_FAQ));
  assert.ok(noDash(BARNAUL_TRAVEL));
});
