import assert from 'node:assert/strict';
import test from 'node:test';

import { CITY_INFO } from './cityInfo.ts';
import { CITY_MONUMENTS_MUST_SEE } from './city-monuments-must-see.ts';

const CITIES = ['saint-petersburg', 'moscow', 'nizhny-novgorod', 'kaliningrad', 'perm'] as const;

test('monument pack is merged into CITY_INFO mustSee for 5 cities', () => {
  for (const city of CITIES) {
    const must = CITY_INFO[city]?.mustSee || [];
    const pack = CITY_MONUMENTS_MUST_SEE[city] || [];
    assert.ok(pack.length > 0, `${city}: pack empty`);
    const mustSlugs = new Set(
      must.map((p) => String(p.locationSlug || '').trim()).filter(Boolean),
    );
    for (const item of pack) {
      assert.ok(
        mustSlugs.has(item.locationSlug),
        `${city}: missing ${item.locationSlug} in mustSee`,
      );
    }
  }
});

test('new Moscow monuments land in Главные (mustSeeFilter main)', () => {
  const moscow = CITY_INFO.moscow?.mustSee || [];
  const minin = moscow.find((p) => p.locationSlug === 'moscow-pamyatnik-mininu-i-pozharskomu');
  assert.ok(minin, 'Minin/Pozharsky missing');
  assert.equal(minin.mustSeeFilter, 'main');
  const nikulin = moscow.find((p) => p.locationSlug === 'moscow-pamyatnik-yuriyu-nikulinu');
  assert.ok(nikulin, 'Nikulin missing');
  assert.equal(nikulin.mustSeeFilter, 'creative');
});
