import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  cityHasWeatherWidget,
  cityIdentityTags,
  collectPlacesBySlugs,
  placeSlugKey,
  resolveCityLocalFlavor,
  suburbMatchesSlugs,
} from './city-hub-local-flavor.ts';

const CITY_INFO_SRC = readFileSync(fileURLToPath(new URL('./cityInfo.ts', import.meta.url)), 'utf8');

function cityInfoHasSlug(slug: string): boolean {
  const quoted = new RegExp(`['"]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  return quoted.test(CITY_INFO_SRC);
}

test('weather widget is Perm-only until other cities fill coords', () => {
  assert.equal(cityHasWeatherWidget('perm'), true);
  assert.equal(cityHasWeatherWidget('moscow'), false);
  assert.equal(cityHasWeatherWidget('saint-petersburg'), false);
  assert.equal(cityHasWeatherWidget('moskva'), false);
  const weather = resolveCityLocalFlavor('perm')?.weather;
  assert.ok(weather);
  assert.equal(weather.latitude, 58.01);
  assert.equal(weather.longitude, 56.23);
  assert.equal(weather.timezone, 'Asia/Yekaterinburg');
});

test('Perm identity tags map only to cityInfo slugs', () => {
  const tags = cityIdentityTags('perm');
  assert.equal(tags.length, 4);
  assert.deepEqual(
    tags.map((tag) => tag.hashtag),
    ['#СчастьеНеЗаГорами', '#ПермскиеБоги', '#Посикунчики', '#Загород'],
  );
  for (const tag of tags) {
    for (const slug of tag.slugs) {
      assert.equal(cityInfoHasSlug(slug), true, `missing cityInfo slug ${slug} for ${tag.id}`);
    }
  }
});

test('Moscow and SPB identity tags stay empty/hidden', () => {
  assert.deepEqual(cityIdentityTags('moscow'), []);
  assert.deepEqual(cityIdentityTags('saint-petersburg'), []);
  assert.deepEqual(cityIdentityTags('kazan'), []);
});

test('weather CTA slugs exist in Perm cityInfo', () => {
  const weather = resolveCityLocalFlavor('perm')?.weather;
  assert.ok(weather);
  for (const slug of [...weather.outdoorSlugs, ...weather.indoorSlugs]) {
    assert.equal(cityInfoHasSlug(slug), true, slug);
  }
  assert.ok(weather.indoorSlugs.includes('teatr-teatr'));
  assert.ok(weather.outdoorSlugs.includes('naberezhnaya-kamy'));
});

test('collectPlacesBySlugs keeps tag order and drops unknown', () => {
  const mustSee = [
    { name: 'Галерея', desc: '', venueSlug: 'permskaya-galereya' },
    { name: 'Посикунчики', desc: '', locationSlug: 'perm-permskie-posikunchiki' },
  ];
  const suburbs = [
    {
      name: 'Хохловка',
      desc: '',
      venueSlug: 'muzej-hohlovka',
      places: [{ name: 'Пещера', desc: '', locationSlug: 'perm-kungurskaya-ledyanaya-peshchera' }],
    },
  ];
  const resolved = collectPlacesBySlugs(
    ['permskaya-galereya', 'missing-slug', 'muzej-hohlovka', 'perm-kungurskaya-ledyanaya-peshchera'],
    mustSee,
    suburbs,
  );
  assert.deepEqual(
    resolved.map((place) => placeSlugKey(place)),
    ['permskaya-galereya', 'muzej-hohlovka', 'perm-kungurskaya-ledyanaya-peshchera'],
  );
  assert.equal(suburbMatchesSlugs(suburbs[0], ['muzej-hohlovka']), true);
});
