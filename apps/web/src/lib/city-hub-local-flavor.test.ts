import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  cityHasWeatherWidget,
  cityHasWhenToGo,
  cityIdentityTags,
  collectPlacesBySlugs,
  placeSlugKey,
  resolveCityLocalFlavor,
  resolveWhenToGoBlurb,
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

test('when-to-go is Perm-only editorial seasonality, not a daily forecast', () => {
  assert.equal(cityHasWhenToGo('perm'), true);
  assert.equal(cityHasWhenToGo('moscow'), false);
  assert.equal(cityHasWhenToGo('saint-petersburg'), false);
  const flavor = resolveCityLocalFlavor('perm')?.whenToGo;
  assert.ok(flavor);
  assert.equal(flavor.timeZone, 'Asia/Yekaterinburg');
  const covered = flavor.seasons.flatMap((season) => season.months).sort((a, b) => a - b);
  assert.deepEqual(covered, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const season of flavor.seasons) {
    assert.equal(season.body.includes('\u2014'), false, season.id);
    assert.equal(season.body.includes('\u2013'), false, season.id);
  }
});

test('Perm when-to-go maps months to honest seasonal copy', () => {
  const august = resolveWhenToGoBlurb('perm', new Date('2026-08-14T08:00:00Z'));
  assert.equal(august?.seasonId, 'lateSummer');
  assert.equal(august?.month, 8);
  assert.match(august?.body || '', /Август/);
  assert.match(august?.body || '', /Хохловка/);
  assert.match(august?.body || '', /Усьва/);

  const january = resolveWhenToGoBlurb('perm', new Date('2026-01-15T12:00:00Z'));
  assert.equal(january?.seasonId, 'winter');
  assert.match(january?.body || '', /Кунгурская ледяная пещера/);
  assert.match(january?.body || '', /мороз/);

  const may = resolveWhenToGoBlurb('perm', new Date('2026-05-10T12:00:00Z'));
  assert.equal(may?.seasonId, 'spring');
  assert.match(may?.body || '', /межсезонье/);

  const june = resolveWhenToGoBlurb('perm', new Date('2026-06-20T12:00:00Z'));
  assert.equal(june?.seasonId, 'summer');
  assert.match(june?.body || '', /июнь и июль/);

  const september = resolveWhenToGoBlurb('perm', new Date('2026-09-05T12:00:00Z'));
  assert.equal(september?.seasonId, 'earlyAutumn');

  const november = resolveWhenToGoBlurb('perm', new Date('2026-11-02T12:00:00Z'));
  assert.equal(november?.seasonId, 'lateAutumn');
  assert.match(november?.body || '', /гряз/);

  assert.equal(resolveWhenToGoBlurb('moscow', new Date('2026-08-14T08:00:00Z')), null);
});
