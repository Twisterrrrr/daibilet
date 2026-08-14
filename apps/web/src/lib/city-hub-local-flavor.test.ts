import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  cityHasWeatherWidget,
  cityHasWhenToGo,
  cityIdentitySlides,
  cityIdentityTags,
  collectPlacesBySlugs,
  placeSlugKey,
  resolveCityLocalFlavor,
  resolveWhenToGoBlurb,
  seasonGuideForTab,
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

test('Perm identity slides map only to cityInfo slugs', () => {
  const slides = cityIdentitySlides('perm');
  assert.equal(slides.length, 4);
  assert.deepEqual(
    slides.map((slide) => slide.id),
    ['medved', 'bogi', 'posikunchiki', 'schaste'],
  );
  assert.equal(resolveCityLocalFlavor('perm')?.identityHeading, 'Чем уникальна Пермь?');
  for (const slide of slides) {
    assert.equal(slide.text.includes('\u2014'), false, slide.id);
    for (const slug of slide.slugs) {
      assert.equal(cityInfoHasSlug(slug), true, `missing cityInfo slug ${slug} for ${slide.id}`);
    }
  }
  const tags = cityIdentityTags('perm');
  assert.equal(tags.length, 4);
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
  assert.equal(flavor.tabs.length, 4);
  const covered = flavor.seasons.flatMap((season) => season.months).sort((a, b) => a - b);
  assert.deepEqual(covered, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const season of flavor.seasons) {
    assert.equal(season.body.includes('\u2014'), false, season.id);
    assert.equal(season.body.includes('\u2013'), false, season.id);
    assert.ok(season.headline);
  }
  for (const tab of flavor.tabs) {
    assert.equal(tab.body.includes('\u2014'), false, tab.id);
  }
});

test('Perm when-to-go maps months to honest seasonal copy', () => {
  const august = resolveWhenToGoBlurb('perm', new Date('2026-08-14T08:00:00Z'));
  assert.equal(august?.seasonId, 'lateSummer');
  assert.equal(august?.month, 8);
  assert.equal(august?.headline, 'Конец лета');
  assert.equal(august?.monthLabel, 'Август');
  assert.equal(august?.tab, 'summer');
  assert.match(august?.body || '', /Хохловка/);
  assert.match(august?.body || '', /Усьва/);

  const january = resolveWhenToGoBlurb('perm', new Date('2026-01-15T12:00:00Z'));
  assert.equal(january?.seasonId, 'winter');
  assert.equal(january?.tab, 'winter');
  assert.match(january?.body || '', /Кунгурская ледяная пещера/);

  const may = resolveWhenToGoBlurb('perm', new Date('2026-05-10T12:00:00Z'));
  assert.equal(may?.seasonId, 'spring');
  assert.match(may?.body || '', /Межсезонье/);

  const june = resolveWhenToGoBlurb('perm', new Date('2026-06-20T12:00:00Z'));
  assert.equal(june?.seasonId, 'summer');
  assert.match(june?.body || '', /Речной сезон/);

  const september = resolveWhenToGoBlurb('perm', new Date('2026-09-05T12:00:00Z'));
  assert.equal(september?.seasonId, 'earlyAutumn');
  assert.equal(september?.tab, 'autumn');

  const november = resolveWhenToGoBlurb('perm', new Date('2026-11-02T12:00:00Z'));
  assert.equal(november?.seasonId, 'lateAutumn');
  assert.match(november?.body || '', /тропы/);

  assert.equal(resolveWhenToGoBlurb('moscow', new Date('2026-08-14T08:00:00Z')), null);
});

test('season tabs do not keep August copy when Winter is selected', () => {
  const flavor = resolveCityLocalFlavor('perm')?.whenToGo;
  const august = resolveWhenToGoBlurb('perm', new Date('2026-08-14T08:00:00Z'));
  assert.ok(flavor);
  assert.ok(august);
  const summer = seasonGuideForTab(flavor, august, 'summer');
  assert.equal(summer.isCurrent, true);
  assert.equal(summer.nowLabel, 'Конец лета (Август)');
  assert.match(summer.body, /Хохловка/);
  const winter = seasonGuideForTab(flavor, august, 'winter');
  assert.equal(winter.isCurrent, false);
  assert.equal(winter.nowLabel, null);
  assert.match(winter.body, /Губахе/);
  assert.equal(winter.body.includes('Конец лета'), false);
  assert.equal(winter.body.includes('август'), false);
});
