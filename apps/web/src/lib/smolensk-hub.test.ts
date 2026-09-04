import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SMOLENSK_DAY_ROUTE_PRESETS,
  SMOLENSK_FAQ,
  SMOLENSK_MUST_SEE,
  SMOLENSK_SUBURBS,
  SMOLENSK_TRAVEL,
} from './smolensk-hub.ts';

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

test('Smolensk hub mustSee has exactly 50 places with unique slugs', () => {
  assert.equal(SMOLENSK_MUST_SEE.length, 50);
  const slugs = SMOLENSK_MUST_SEE.map((place) => slugOf(place));
  assert.equal(new Set(slugs).size, 50);
  for (const place of SMOLENSK_MUST_SEE) {
    assert.equal(empty(place.desc), false, place.name);
    assert.equal(empty(place.address), false, place.name);
    assert.ok(Number.isFinite(place.latitude), `${place.name} lat`);
    assert.ok(Number.isFinite(place.longitude), `${place.name} lng`);
    assert.match(slugOf(place), /^smolensk-/);
    assert.ok(noDash(place), place.name);
  }
  assert.ok(
    SMOLENSK_MUST_SEE.some(
      (place) => place.locationSlug === 'smolensk-smolenskaya-krepostnaya-stena',
    ),
  );
  assert.ok(
    SMOLENSK_MUST_SEE.some(
      (place) => place.venueSlug === 'smolensk-svyato-uspenskiy-kafedralnyy-sobor',
    ),
  );
  assert.ok(SMOLENSK_MUST_SEE.some((place) => place.locationSlug === 'smolensk-gromovaya-bashnya'));
  assert.ok(SMOLENSK_MUST_SEE.some((place) => place.locationSlug === 'smolensk-lopatinskiy-sad'));
  assert.ok(
    SMOLENSK_MUST_SEE.some(
      (place) =>
        place.locationSlug ===
        'smolensk-pamyatnik-blagodarnaya-rossiya-geroyam-1812-goda-pamyatnik-s-orlami',
    ),
  );
});

test('Smolensk suburbs are 5 with nested places and KEEP teremok slug', () => {
  assert.equal(SMOLENSK_SUBURBS.length, 5);
  assert.ok(
    SMOLENSK_SUBURBS.some(
      (suburb: { locationSlug?: string }) =>
        suburb.locationSlug === 'smolensk-istoriko-arhitekturnyy-kompleks-teremok-flenovo',
    ),
  );
  for (const suburb of SMOLENSK_SUBURBS) {
    assert.equal(empty(suburb.desc), false, suburb.name);
    assert.equal(empty(suburb.address), false, suburb.name);
    assert.ok(Number.isFinite(suburb.latitude), suburb.name);
    assert.ok((suburb.places || []).length >= 6, suburb.name);
    for (const nested of suburb.places || []) {
      assert.match(slugOf(nested), /^smolensk-/);
      assert.equal(empty(nested.desc), false, nested.name);
      assert.ok(noDash(nested), nested.name);
    }
    assert.ok(noDash(suburb), suburb.name);
  }
});

test('Smolensk day presets include two classics and painted lines', () => {
  const ids = SMOLENSK_DAY_ROUTE_PRESETS.map((preset: { id: string }) => preset.id);
  assert.ok(ids.includes('smolensk-krepostnoy-shchit'));
  assert.ok(ids.includes('smolensk-holmy-i-tayny'));
  assert.ok(ids.includes('smolensk-green-line'));
  assert.ok(ids.includes('smolensk-red-line'));
});

test('Smolensk FAQ has 4 owner topics without long dashes', () => {
  assert.equal(SMOLENSK_FAQ.length, 4);
  assert.ok(SMOLENSK_FAQ.some((item) => /Ласточк/i.test(item.q + item.a)));
  assert.ok(SMOLENSK_FAQ.some((item) => /стен/i.test(item.q)));
  assert.ok(SMOLENSK_FAQ.some((item) => /Лапач|Лопатин/i.test(item.q + item.a)));
  assert.ok(SMOLENSK_FAQ.some((item) => /обув|холм/i.test(item.q + item.a)));
  assert.ok(noDash(SMOLENSK_FAQ));
  assert.ok(noDash(SMOLENSK_TRAVEL));
});
