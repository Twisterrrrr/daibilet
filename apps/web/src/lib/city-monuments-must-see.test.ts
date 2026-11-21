import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_INFO } from './cityInfo.ts';
import { CITY_MONUMENTS_MUST_SEE } from './city-monuments-must-see.ts';

const CITIES = ['saint-petersburg', 'moscow', 'nizhny-novgorod', 'kaliningrad', 'perm'] as const;

test('monument pack is merged into CITY_INFO mustSee for 5 cities', () => {
  const norm = (name: string) =>
    String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[«»""']/g, '')
      .replace(/\s+/g, ' ');
  for (const city of CITIES) {
    const must = CITY_INFO[city]?.mustSee || [];
    const pack = CITY_MONUMENTS_MUST_SEE[city] || [];
    assert.ok(pack.length > 0, `${city}: pack empty`);
    const mustSlugs = new Set(
      must.map((p) => String(p.locationSlug || '').trim()).filter(Boolean),
    );
    const mustNames = new Set(must.map((p) => norm(String(p.name || ''))).filter(Boolean));
    for (const item of pack) {
      assert.ok(
        mustSlugs.has(item.locationSlug) || mustNames.has(norm(item.name)),
        `${city}: missing ${item.locationSlug} / ${item.name} in mustSee`,
      );
    }
  }
});

test('Moscow Okudzhava is not duplicated by monument pack after expand wire', () => {
  const moscow = CITY_INFO.moscow?.mustSee || [];
  const okud = moscow.filter((p) => /Окуджаве/i.test(String(p.name || '')));
  assert.equal(okud.length, 1, `expected 1 Okudzhava card, got ${okud.length}`);
  assert.match(String(okud[0].desc || ''), /Окуджава на Арбате/);
});

test('Moscow pack monuments land on Памятники / Необычное chips', () => {
  const moscow = CITY_INFO.moscow?.mustSee || [];
  // Expand already owns «Минин и Пожарский» on Василий - pack slug skipped by name.
  const minin = moscow.filter((p) => /Минину и Пожарскому/i.test(String(p.name || '')));
  assert.equal(minin.length, 1, `expected 1 Minin card, got ${minin.length}`);
  assert.equal(minin[0].mustSeeFilter, 'monument');
  const nikulin = moscow.find((p) => p.locationSlug === 'moscow-pamyatnik-yuriyu-nikulinu');
  assert.ok(nikulin, 'Nikulin missing');
  assert.equal(nikulin.mustSeeFilter, 'creative');
});
