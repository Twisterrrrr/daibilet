import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CITY_HUB_LOCAL_FLAVOR,
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
import { CITY_INFO } from './cityInfo.ts';

const CITY_INFO_SRC = readFileSync(fileURLToPath(new URL('./cityInfo.ts', import.meta.url)), 'utf8');
const MONUMENTS_SRC = readFileSync(
  fileURLToPath(new URL('./city-monuments-must-see.ts', import.meta.url)),
  'utf8',
);
const EKB_HUB_SRC = readFileSync(
  fileURLToPath(new URL('./ekaterinburg-hub.ts', import.meta.url)),
  'utf8',
);
const KAZAN_HUB_SRC = readFileSync(fileURLToPath(new URL('./kazan-hub.ts', import.meta.url)), 'utf8');
const SAMARA_HUB_SRC = readFileSync(fileURLToPath(new URL('./samara-hub.ts', import.meta.url)), 'utf8');
const KRASNODAR_HUB_SRC = readFileSync(
  fileURLToPath(new URL('./krasnodar-hub.ts', import.meta.url)),
  'utf8',
);
const KRASNOYARSK_HUB_SRC = readFileSync(
  fileURLToPath(new URL('./krasnoyarsk-hub.ts', import.meta.url)),
  'utf8',
);
const NOVOSIBIRSK_HUB_SRC = readFileSync(
  fileURLToPath(new URL('./novosibirsk-hub.ts', import.meta.url)),
  'utf8',
);
const VORONEZH_HUB_SRC = readFileSync(
  fileURLToPath(new URL('./voronezh-hub.ts', import.meta.url)),
  'utf8',
);
const ROSTOV_HUB_SRC = readFileSync(
  fileURLToPath(new URL('./rostov-na-donu-hub.ts', import.meta.url)),
  'utf8',
);
const PENZA_HUB_SRC = readFileSync(fileURLToPath(new URL('./penza-hub.ts', import.meta.url)), 'utf8');
const TVER_HUB_SRC = readFileSync(fileURLToPath(new URL('./tver-hub.ts', import.meta.url)), 'utf8');
const UFA_HUB_SRC = readFileSync(fileURLToPath(new URL('./ufa-hub.ts', import.meta.url)), 'utf8');
const RYAZAN_HUB_SRC = readFileSync(fileURLToPath(new URL('./ryazan-hub.ts', import.meta.url)), 'utf8');
const OMSK_HUB_SRC = readFileSync(fileURLToPath(new URL('./omsk-hub.ts', import.meta.url)), 'utf8');
const CHELYABINSK_HUB_SRC = readFileSync(
  fileURLToPath(new URL('./chelyabinsk-hub.ts', import.meta.url)),
  'utf8',
);
const TYUMEN_HUB_SRC = readFileSync(fileURLToPath(new URL('./tyumen-hub.ts', import.meta.url)), 'utf8');

function cityInfoHasSlug(slug: string): boolean {
  const quoted = new RegExp(`['"]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  return (
    quoted.test(CITY_INFO_SRC) ||
    quoted.test(MONUMENTS_SRC) ||
    quoted.test(EKB_HUB_SRC) ||
    quoted.test(KAZAN_HUB_SRC) ||
    quoted.test(SAMARA_HUB_SRC) ||
    quoted.test(KRASNODAR_HUB_SRC) ||
    quoted.test(KRASNOYARSK_HUB_SRC) ||
    quoted.test(NOVOSIBIRSK_HUB_SRC) ||
    quoted.test(VORONEZH_HUB_SRC) ||
    quoted.test(ROSTOV_HUB_SRC) ||
    quoted.test(PENZA_HUB_SRC) ||
    quoted.test(TVER_HUB_SRC) ||
    quoted.test(UFA_HUB_SRC) ||
    quoted.test(RYAZAN_HUB_SRC) ||
    quoted.test(OMSK_HUB_SRC) ||
    quoted.test(CHELYABINSK_HUB_SRC) ||
    quoted.test(TYUMEN_HUB_SRC)
  );
}

test('weather widget covers Perm, Moscow, SPB, Kaliningrad, NN, EKB, Kazan, Samara, Krasnodar and Krasnoyarsk', () => {
  assert.equal(cityHasWeatherWidget('perm'), true);
  assert.equal(cityHasWeatherWidget('moscow'), true);
  assert.equal(cityHasWeatherWidget('moskva'), true);
  assert.equal(cityHasWeatherWidget('saint-petersburg'), true);
  assert.equal(cityHasWeatherWidget('sankt-peterburg'), true);
  assert.equal(cityHasWeatherWidget('kaliningrad'), true);
  assert.equal(cityHasWeatherWidget('nizhny-novgorod'), true);
  assert.equal(cityHasWeatherWidget('nizhniy-novgorod'), true);
  assert.equal(cityHasWeatherWidget('ekaterinburg'), true);
  assert.equal(cityHasWeatherWidget('kazan'), true);
  assert.equal(cityHasWeatherWidget('samara'), true);
  assert.equal(cityHasWeatherWidget('krasnodar'), true);
  assert.equal(cityHasWeatherWidget('krasnoyarsk'), true);
  assert.equal(cityHasWeatherWidget('novosibirsk'), true);
  assert.equal(cityHasWeatherWidget('voronezh'), true);
  assert.equal(cityHasWeatherWidget('rostov-na-donu'), true);
  assert.equal(cityHasWeatherWidget('penza'), true);
  assert.equal(cityHasWeatherWidget('tver'), true);
  assert.equal(cityHasWeatherWidget('ryazan'), true);
  assert.equal(cityHasWeatherWidget('ufa'), true);
  assert.equal(cityHasWeatherWidget('omsk'), true);
  assert.equal(cityHasWeatherWidget('tyumen'), true);
  assert.equal(cityHasWeatherWidget('chelyabinsk'), true);
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
    {
      slug: 'ekaterinburg',
      heading: 'Чем уникален Екатеринбург',
      ids: ['ural-rock', 'stenograffia', 'posikunchiki', 'avangard'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'kazan',
      heading: 'Чем уникальна Казань',
      ids: ['crossroads', 'tatar-avantgarde', 'echpochmak', 'white-stone'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'krasnodar',
      heading: 'Чем уникален Краснодар',
      ids: ['southern-chill', 'cossack-avantgarde', 'borsch-tomatoes', 'ekaterinodar-baroque'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'krasnoyarsk',
      heading: 'Чем уникален Красноярск',
      ids: ['mighty-siberia', 'surikov-hvorostovsky', 'siberian-game', 'yenisei-bridges'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'novosibirsk',
      heading: 'Чем уникален Новосибирск',
      ids: ['akademgorodok', 'novat', 'siberian-gastro', 'constructivism'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'voronezh',
      heading: 'Чем уникален Воронеж',
      ids: ['petrovsky-fleet', 'literary-city', 'chernozem-meat', 'merchant-spire'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'rostov-na-donu',
      heading: 'Чем уникален Ростов-на-Дону',
      ids: ['don-bridge', 'merchant-yards', 'don-crayfish', 'tractor-theatre'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'penza',
      heading: 'Чем уникальна Пенза',
      ids: ['old-fortress', 'meyerhold-city', 'quiet-moscow', 'lermontov-tarhany'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'tver',
      heading: 'Чем уникальна Тверь',
      ids: ['starovolzhsky-bridge', 'travel-palace', 'pozharskaya-goat', 'morozov-town'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'ryazan',
      heading: 'Чем уникальна Рязань',
      ids: ['ryazan-kremlin', 'yesenin-meshchera', 'karavaets-kalinnik', 'saltykov-wood'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'ufa',
      heading: 'Чем уникальна Уфа',
      ids: ['salavat-yulaev', 'ufa-rock', 'bashkir-honey', 'lyalya-tyulpan'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'omsk',
      heading: 'Чем уникален Омск',
      ids: ['tara-gates', 'siberian-punk', 'lyubinsky-milk', 'kamergersky'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'chelyabinsk',
      heading: 'Чем уникален Челябинск',
      ids: ['chelyabinsk-meteorite', 'tankograd', 'ural-pelmeni', 'gosbank-elevator'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
    },
    {
      slug: 'tyumen',
      heading: 'Чем уникальна Тюмень',
      ids: ['tura-quay', 'wooden-lace', 'stroganina-kvartet', 'dzerzhinskogo-arbat'],
      badges: ['Символ', 'Искусство', 'Гастро', 'Архитектура'],
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
});

test('weather CTA slugs exist in cityInfo', () => {
  for (const slug of [
    'perm',
    'moscow',
    'saint-petersburg',
    'kaliningrad',
    'nizhny-novgorod',
    'ekaterinburg',
    'kazan',
    'samara',
    'krasnodar',
    'krasnoyarsk',
    'novosibirsk',
    'voronezh',
    'rostov-na-donu',
    'penza',
    'tver',
    'ryazan',
    'ufa',
    'omsk',
    'chelyabinsk',
    'tyumen',
  ]) {
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

test('when-to-go covers Perm, Moscow, SPB, Kaliningrad, NN, EKB, Kazan, Samara, Krasnodar and Krasnoyarsk', () => {
  assert.equal(cityHasWhenToGo('perm'), true);
  assert.equal(cityHasWhenToGo('moscow'), true);
  assert.equal(cityHasWhenToGo('moskva'), true);
  assert.equal(cityHasWhenToGo('saint-petersburg'), true);
  assert.equal(cityHasWhenToGo('kaliningrad'), true);
  assert.equal(cityHasWhenToGo('nizhny-novgorod'), true);
  assert.equal(cityHasWhenToGo('ekaterinburg'), true);
  assert.equal(cityHasWhenToGo('kazan'), true);
  assert.equal(cityHasWhenToGo('samara'), true);
  assert.equal(cityHasWhenToGo('krasnodar'), true);
  assert.equal(cityHasWhenToGo('krasnoyarsk'), true);
  assert.equal(cityHasWhenToGo('novosibirsk'), true);
  assert.equal(cityHasWhenToGo('voronezh'), true);
  assert.equal(cityHasWhenToGo('rostov-na-donu'), true);
  assert.equal(cityHasWhenToGo('penza'), true);
  assert.equal(cityHasWhenToGo('tver'), true);
  assert.equal(cityHasWhenToGo('ryazan'), true);
  assert.equal(cityHasWhenToGo('ufa'), true);
  assert.equal(cityHasWhenToGo('omsk'), true);
  assert.equal(cityHasWhenToGo('chelyabinsk'), true);
  assert.equal(cityHasWhenToGo('tyumen'), true);
  for (const slug of [
    'perm',
    'moscow',
    'saint-petersburg',
    'kaliningrad',
    'nizhny-novgorod',
    'ekaterinburg',
    'kazan',
    'samara',
    'krasnodar',
    'krasnoyarsk',
    'novosibirsk',
    'voronezh',
    'rostov-na-donu',
    'penza',
    'tver',
    'ryazan',
    'ufa',
    'omsk',
    'chelyabinsk',
    'tyumen',
  ]) {
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

  const nskOctober = resolveWhenToGoBlurb('novosibirsk', new Date('2026-10-15T06:00:00Z'));
  assert.equal(nskOctober?.seasonId, 'autumn');
  assert.equal(nskOctober?.tab, 'autumn');
  assert.match(nskOctober?.body || '', /Заельцовского|театральных/);
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

function emptyHubDesc(value: unknown): boolean {
  return !String(value ?? '').trim();
}

test('editorial hub mustSee, suburb roots and nested places have non-empty desc', () => {
  const cities = Object.keys(CITY_HUB_LOCAL_FLAVOR);
  const seen = new Set<string>();
  for (const city of cities) {
    if (seen.has(city)) continue;
    seen.add(city);
    const info = CITY_INFO[city];
    assert.ok(info, `${city}: missing CITY_INFO`);
    assert.ok((info.mustSee || []).length > 0, `${city}: mustSee empty`);
    if (city === 'voronezh') {
      assert.ok((info.mustSee || []).length >= 50, 'voronezh mustSee floor ~50');
    }
    if (city === 'sochi' || city === 'saratov' || city === 'yaroslavl' || city === 'volgograd') {
      assert.ok((info.mustSee || []).length >= 50, `${city} mustSee floor ~50`);
    }
    if (city === 'rostov-na-donu') {
      assert.ok((info.mustSee || []).length >= 50, 'rostov mustSee floor ~50');
      const suburbSlugs = (info.significantSuburbs || []).map((suburb) => suburb.locationSlug);
      assert.ok(suburbSlugs.includes('rostov-na-donu-aksayskaya-tamozhennaya-zastava'), 'rostov suburb Aksai');
    }
    if (city === 'penza') {
      assert.ok((info.mustSee || []).length >= 50, 'penza mustSee floor ~50');
      const suburbSlugs = (info.significantSuburbs || []).map((suburb) => suburb.locationSlug);
      assert.ok(suburbSlugs.includes('penza-ahunskiy-sosnovyy-bor'), 'penza suburb Akhuny');
    }
    if (city === 'tver') {
      assert.ok((info.mustSee || []).length >= 50, 'tver mustSee floor ~50');
      const suburbSlugs = (info.significantSuburbs || []).map((suburb) => suburb.locationSlug);
      assert.ok(suburbSlugs.includes('tver-torzhok'), 'tver suburb Torzhok');
      assert.ok(suburbSlugs.includes('tver-domotkanovo'), 'tver suburb Domotkanovo');
      assert.ok(suburbSlugs.includes('tver-staritsa'), 'tver suburb Staritsa');
    }
    if (city === 'ryazan') {
      assert.ok((info.mustSee || []).length >= 70, 'ryazan mustSee floor 50+15+7');
    }
    if (city === 'ufa') {
      assert.ok((info.mustSee || []).length >= 50, 'ufa mustSee floor ~50');
      assert.ok((info.mustSee || []).length <= 58, 'ufa mustSee cap ~55');
      const suburbSlugs = (info.significantSuburbs || []).map((suburb) => suburb.locationSlug);
      assert.ok(suburbSlugs.includes('ufa-muradymovskoe-ushchele'), 'ufa suburb Muradymovo');
      assert.ok(suburbSlugs.includes('ufa-rozovye-skaly-inzer'), 'ufa suburb Inzer rocks');
    }
    if (city === 'krasnoyarsk') {
      const suburbSlugs = (info.significantSuburbs || []).map((suburb) => suburb.locationSlug);
      assert.ok(suburbSlugs.includes('krasnoyarsk-ovsyanka-astafev'), 'krasnoyarsk suburb Ovsyanka');
    }
    if (city === 'krasnodar') {
      const suburbSlugs = (info.significantSuburbs || []).map((suburb) => suburb.locationSlug);
      assert.ok(suburbSlugs.includes('krasnodar-pshada-dolmeny'), 'krasnodar suburb Pshada');
      assert.ok(suburbSlugs.includes('krasnodar-guamskoe-ushchele'), 'krasnodar suburb Guamka');
    }
    if (city === 'samara') {
      const suburbSlugs = (info.significantSuburbs || []).map((suburb) => suburb.locationSlug);
      assert.ok(suburbSlugs.includes('samara-zamok-garibaldi'), 'samara suburb Garibaldi');
      assert.ok(suburbSlugs.includes('samara-sergievskie-mineralnye-vody'), 'samara suburb Sergievskie');
    }
    if (city === 'omsk') {
      assert.ok((info.mustSee || []).length >= 60, 'omsk mustSee floor 15+50');
    }
    if (city === 'chelyabinsk') {
      assert.ok((info.mustSee || []).length >= 60, 'chelyabinsk mustSee floor 15+50');
    }
    for (const place of info.mustSee || []) {
      assert.equal(emptyHubDesc(place.desc), false, `${city} mustSee: ${place.name}`);
    }
    for (const suburb of info.significantSuburbs || []) {
      assert.equal(emptyHubDesc(suburb.desc), false, `${city} suburb: ${suburb.name}`);
      for (const nested of suburb.places || []) {
        assert.equal(
          emptyHubDesc(nested.desc),
          false,
          `${city} nested: ${suburb.name} / ${nested.name}`,
        );
      }
    }
  }
});

test('Novosibirsk day-trip suburbs keep Akademgorodok and add Suzun Iskitim Koltsovo Berdskie', () => {
  const suburbs = CITY_INFO.novosibirsk?.significantSuburbs || [];
  const bySlug = new Map(suburbs.map((suburb) => [suburb.locationSlug, suburb]));
  for (const slug of [
    'novosibirsk-akademgorodok',
    'novosibirsk-suzun',
    'novosibirsk-iskitim-lozhok',
    'novosibirsk-koltsovo',
    'novosibirsk-berdskie-skaly',
  ]) {
    const suburb = bySlug.get(slug);
    assert.ok(suburb, slug);
    assert.equal(emptyHubDesc(suburb?.desc), false, slug);
    assert.equal(emptyHubDesc(suburb?.address), false, `${slug} address`);
    assert.ok(Number.isFinite(suburb?.latitude), `${slug} lat`);
    assert.ok(Number.isFinite(suburb?.longitude), `${slug} lng`);
    assert.ok((suburb?.places || []).length >= 4, `${slug} nested`);
    for (const nested of suburb?.places || []) {
      assert.equal(emptyHubDesc(nested.desc), false, `${slug} / ${nested.name}`);
      const nestedSlug = nested.locationSlug || nested.dayRouteId;
      assert.ok(nestedSlug, `${nested.name} slug`);
      assert.match(String(nestedSlug), /^novosibirsk-/);
      if (nested.locationSlug && suburb?.locationSlug !== 'novosibirsk-akademgorodok') {
        assert.equal(emptyHubDesc(nested.address), false, `${nestedSlug} address`);
        assert.ok(Number.isFinite(nested.latitude), `${nestedSlug} lat`);
        assert.ok(Number.isFinite(nested.longitude), `${nestedSlug} lng`);
      }
    }
  }
  const coffee = suburbs
    .flatMap((suburb) => suburb.places || [])
    .find((place) => place.locationSlug === 'novosibirsk-koltsovo-akademiya-kofe');
  assert.ok(coffee);
  assert.equal(/чернозем/i.test(String(coffee?.desc)), false);
  assert.match(String(coffee?.desc), /наукоград|за Уралом/i);
  const faq = CITY_INFO.novosibirsk?.faq || [];
  assert.ok(faq.some((item) => /спортивн/i.test(item.q)));
  assert.ok(faq.some((item) => /большевистск/i.test(item.q)));
  assert.ok(faq.some((item) => /бункер/i.test(item.q)));
  assert.ok(faq.some((item) => /обск/i.test(item.q)));
});
