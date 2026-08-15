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
const MONUMENTS_SRC = readFileSync(
  fileURLToPath(new URL('./city-monuments-must-see.ts', import.meta.url)),
  'utf8',
);

function cityInfoHasSlug(slug: string): boolean {
  const quoted = new RegExp(`['"]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  return quoted.test(CITY_INFO_SRC) || quoted.test(MONUMENTS_SRC);
}

test('weather widget covers Perm, Moscow, SPB, Kaliningrad and NN', () => {
  assert.equal(cityHasWeatherWidget('perm'), true);
  assert.equal(cityHasWeatherWidget('moscow'), true);
  assert.equal(cityHasWeatherWidget('moskva'), true);
  assert.equal(cityHasWeatherWidget('saint-petersburg'), true);
  assert.equal(cityHasWeatherWidget('sankt-peterburg'), true);
  assert.equal(cityHasWeatherWidget('kaliningrad'), true);
  assert.equal(cityHasWeatherWidget('nizhny-novgorod'), true);
  assert.equal(cityHasWeatherWidget('nizhniy-novgorod'), true);
  assert.equal(cityHasWeatherWidget('ekaterinburg'), false);
  assert.equal(cityHasWeatherWidget('ufa'), false);
  const weather = resolveCityLocalFlavor('perm')?.weather;
  assert.ok(weather);
  assert.equal(weather.latitude, 58.01);
  assert.equal(weather.longitude, 56.23);
  assert.equal(weather.timezone, 'Asia/Yekaterinburg');
  const msk = resolveCityLocalFlavor('moskva')?.weather;
  assert.ok(msk);
  assert.equal(msk.latitude, 55.76);
  assert.equal(msk.longitude, 37.62);
});

test('Perm identity slides map only to cityInfo slugs', () => {
  const slides = cityIdentitySlides('perm');
  assert.equal(slides.length, 4);
  assert.deepEqual(
    slides.map((slide) => slide.id),
    ['medved', 'bogi', 'posikunchiki', 'schaste'],
  );
  assert.equal(resolveCityLocalFlavor('perm')?.identityHeading, 'Чем уникальна Пермь');
  assert.equal(
    resolveCityLocalFlavor('perm')?.identityLead,
    'Четыре вещи, за которыми сюда едут в первую очередь',
  );
  assert.deepEqual(
    slides.map((slide) => slide.badge),
    ['Символ', 'Искусство', 'Гастро', 'Арт-объект'],
  );
  for (const slide of slides) {
    assert.equal(slide.text.includes('\u2014'), false, slide.id);
    for (const slug of slide.slugs) {
      assert.equal(cityInfoHasSlug(slug), true, `missing cityInfo slug ${slug} for ${slide.id}`);
    }
  }
  const tags = cityIdentityTags('perm');
  assert.equal(tags.length, 4);
});

test('Moscow SPB NN Kaliningrad identity packs have 4 slides', () => {
  const packs: Array<{
    slug: string;
    heading: string;
    ids: string[];
    badges: string[];
  }> = [
    {
      slug: 'moscow',
      heading: 'Чем уникальна Москва',
      ids: ['moskva-siti', 'usadby', 'foodmalls', 'vysotki'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'saint-petersburg',
      heading: 'Чем уникален Санкт-Петербург',
      ids: ['razvod-mostov', 'dvory', 'pyshki', 'sevkabel'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Арт-объект'],
    },
    {
      slug: 'nizhny-novgorod',
      heading: 'Чем уникален Нижний Новгород',
      ids: ['zakaty', 'street-art', 'shaverma', 'pakgauzy'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'kaliningrad',
      heading: 'Чем уникален Калининград',
      ids: ['homliny', 'gotika', 'klopsy', 'kosa'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Арт-объект'],
    },
  ];

  for (const pack of packs) {
    const slides = cityIdentitySlides(pack.slug);
    assert.equal(slides.length, 4, pack.slug);
    assert.equal(resolveCityLocalFlavor(pack.slug)?.identityHeading, pack.heading);
    assert.deepEqual(
      slides.map((slide) => slide.id),
      pack.ids,
    );
    assert.deepEqual(
      slides.map((slide) => slide.badge),
      pack.badges,
    );
    for (const slide of slides) {
      assert.equal(slide.text.includes('\u2014'), false, `${pack.slug}:${slide.id}`);
      assert.equal(slide.text.includes('\u2013'), false, `${pack.slug}:${slide.id}`);
      assert.equal(slide.title.includes('\u2014'), false, `${pack.slug}:${slide.id}`);
      for (const slug of slide.slugs) {
        assert.equal(
          cityInfoHasSlug(slug),
          true,
          `missing cityInfo slug ${slug} for ${pack.slug}:${slide.id}`,
        );
      }
    }
    assert.equal(cityIdentityTags(pack.slug).length, 4, pack.slug);
  }

  assert.deepEqual(cityIdentityTags('kazan'), []);
});

test('weather CTA slugs exist in cityInfo', () => {
  for (const slug of ['perm', 'moscow', 'saint-petersburg', 'kaliningrad', 'nizhny-novgorod']) {
    const weather = resolveCityLocalFlavor(slug)?.weather;
    assert.ok(weather, slug);
    for (const placeSlug of [...weather.outdoorSlugs, ...weather.indoorSlugs]) {
      assert.equal(cityInfoHasSlug(placeSlug), true, `${slug}:${placeSlug}`);
    }
  }
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

test('when-to-go covers Perm, Moscow, SPB, Kaliningrad and NN', () => {
  assert.equal(cityHasWhenToGo('perm'), true);
  assert.equal(cityHasWhenToGo('moscow'), true);
  assert.equal(cityHasWhenToGo('moskva'), true);
  assert.equal(cityHasWhenToGo('saint-petersburg'), true);
  assert.equal(cityHasWhenToGo('kaliningrad'), true);
  assert.equal(cityHasWhenToGo('nizhny-novgorod'), true);
  for (const slug of ['perm', 'moscow', 'saint-petersburg', 'kaliningrad', 'nizhny-novgorod']) {
    const flavor = resolveCityLocalFlavor(slug)?.whenToGo;
    assert.ok(flavor, slug);
    assert.equal(flavor.tabs.length, 4);
    const covered = flavor.seasons.flatMap((season) => season.months).sort((a, b) => a - b);
    assert.deepEqual(covered, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], slug);
    for (const season of flavor.seasons) {
      assert.equal(season.body.includes('\u2014'), false, `${slug}:${season.id}`);
      assert.equal(season.body.includes('\u2013'), false, `${slug}:${season.id}`);
      assert.ok(season.headline);
    }
    for (const tab of flavor.tabs) {
      assert.equal(tab.body.includes('\u2014'), false, `${slug}:${tab.id}`);
    }
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

  assert.ok(resolveWhenToGoBlurb('moscow', new Date('2026-08-14T08:00:00Z')));

  const spbAugust = resolveWhenToGoBlurb('saint-petersburg', new Date('2026-08-14T08:00:00Z'));
  assert.equal(spbAugust?.tab, 'summer');
  assert.match(spbAugust?.body || '', /Петергофа/);
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
