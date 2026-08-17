import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  cityHasLifehacks,
  focusFromLifehackCta,
  lifehackBodyText,
  resolveCityLifehacks,
  twoGisCitySearchUrl,
  yandexMapsSearchUrl,
} from './city-hub-lifehacks.ts';

const CITY_INFO_SRC = readFileSync(fileURLToPath(new URL('./cityInfo.ts', import.meta.url)), 'utf8');
const EKB_HUB_SRC = readFileSync(fileURLToPath(new URL('./ekaterinburg-hub.ts', import.meta.url)), 'utf8');
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
    quoted.test(EKB_HUB_SRC) ||
    quoted.test(KAZAN_HUB_SRC) ||
    quoted.test(SAMARA_HUB_SRC) ||
    quoted.test(KRASNODAR_HUB_SRC) ||
    quoted.test(KRASNOYARSK_HUB_SRC) ||
    quoted.test(NOVOSIBIRSK_HUB_SRC) ||
    quoted.test(VORONEZH_HUB_SRC) ||
    quoted.test(UFA_HUB_SRC) ||
    quoted.test(RYAZAN_HUB_SRC) ||
    quoted.test(OMSK_HUB_SRC) ||
    quoted.test(CHELYABINSK_HUB_SRC) ||
    quoted.test(TYUMEN_HUB_SRC)
  );
}

function assertNoLongDash(value: string, label: string) {
  assert.equal(value.includes('\u2014'), false, label);
  assert.equal(value.includes('\u2013'), false, label);
}

test('lifehacks cover Perm, Moscow, SPB, Kaliningrad, NN, EKB, Kazan, Samara, Krasnodar, Krasnoyarsk and Novosibirsk', () => {
  assert.equal(cityHasLifehacks('perm'), true);
  assert.equal(cityHasLifehacks('moscow'), true);
  assert.equal(cityHasLifehacks('moskva'), true);
  assert.equal(cityHasLifehacks('saint-petersburg'), true);
  assert.equal(cityHasLifehacks('sankt-peterburg'), true);
  assert.equal(cityHasLifehacks('kaliningrad'), true);
  assert.equal(cityHasLifehacks('nizhny-novgorod'), true);
  assert.equal(cityHasLifehacks('nizhniy-novgorod'), true);
  assert.equal(cityHasLifehacks('ekaterinburg'), true);
  assert.equal(cityHasLifehacks('kazan'), true);
  assert.equal(cityHasLifehacks('samara'), true);
  assert.equal(cityHasLifehacks('krasnodar'), true);
  assert.equal(cityHasLifehacks('krasnoyarsk'), true);
  assert.equal(cityHasLifehacks('novosibirsk'), true);
  assert.equal(cityHasLifehacks('voronezh'), true);
  assert.equal(cityHasLifehacks('ryazan'), true);
  assert.equal(cityHasLifehacks('ufa'), true);
  assert.equal(cityHasLifehacks('chelyabinsk'), true);
  assert.equal(cityHasLifehacks('omsk'), true);
  assert.equal(cityHasLifehacks('tyumen'), true);
});

test('Perm lifehacks have 4 tabs and 5 short cards with CTA', () => {
  const pack = resolveCityLifehacks('perm');
  assert.ok(pack);
  assert.equal(pack.skipTravel, true);
  assert.deepEqual(
    pack.tabs.map((tab) => tab.id),
    ['walk', 'transit', 'fly', 'food'],
  );
  assert.deepEqual(
    pack.items.map((item) => item.id),
    ['perm-green-line', 'perm-transfer-discount', 'perm-bus-300t', 'perm-pobeda-friday', 'perm-posikunchiki'],
  );
  const byTab = Object.fromEntries(pack.tabs.map((tab) => [tab.id, pack.items.filter((item) => item.tabId === tab.id)]));
  assert.equal(byTab.walk.length, 1);
  assert.equal(byTab.transit.length, 2);
  assert.equal(byTab.fly.length, 1);
  assert.equal(byTab.food.length, 1);
  for (const item of pack.items) {
    assert.ok(item.title.trim());
    assert.ok(item.body.length);
    assert.ok(item.cta.label.trim());
    assertNoLongDash(item.title, item.id);
    assertNoLongDash(lifehackBodyText(item.body), item.id);
    assertNoLongDash(item.cta.label, `${item.id} cta`);
  }
});

test('Perm food CTA maps to cityInfo gastro slugs', () => {
  const pack = resolveCityLifehacks('perm');
  const food = pack?.items.find((item) => item.id === 'perm-posikunchiki');
  assert.ok(food);
  assert.equal(food.cta.kind, 'places');
  const focus = focusFromLifehackCta(food, food.cta);
  assert.ok(focus);
  assert.equal(focus.scrollTo, 'places');
  assert.equal(focus.label, 'Где поесть в Перми');
  for (const slug of focus.slugs) {
    assert.equal(cityInfoHasSlug(slug), true, slug);
  }
});

test('Perm fly CTA stays on-site affiche, not aviation catalog', () => {
  const pack = resolveCityLifehacks('perm');
  const fly = pack?.items.find((item) => item.id === 'perm-pobeda-friday');
  assert.ok(fly);
  assert.equal(fly.cta.kind, 'affiche');
  assert.equal(fly.cta.href, undefined);
  const blob = JSON.stringify(pack);
  assert.equal(/aviasales|яндекс путешеств|yandex\.travel|wide.?catalog/i.test(blob), false);
});

test('map search helpers encode queries', () => {
  assert.equal(
    yandexMapsSearchUrl('Зеленая линия Пермь'),
    `https://yandex.ru/maps/?text=${encodeURIComponent('Зеленая линия Пермь')}`,
  );
  assert.equal(
    twoGisCitySearchUrl('perm', 'автобус 300Т Пермь'),
    `https://2gis.ru/perm/search/${encodeURIComponent('автобус 300Т Пермь')}`,
  );
});

function assertPackCopy(pack: NonNullable<ReturnType<typeof resolveCityLifehacks>>, city: string) {
  assert.equal(pack.skipTravel, true, city);
  assert.ok(pack.items.length >= 4, city);
  for (const item of pack.items) {
    assert.ok(item.title.trim(), item.id);
    assert.ok(item.body.length, item.id);
    assert.ok(item.cta.label.trim(), item.id);
    assertNoLongDash(item.title, item.id);
    assertNoLongDash(lifehackBodyText(item.body), item.id);
    assertNoLongDash(item.cta.label, `${item.id} cta`);
    if (item.cta.kind === 'places') {
      assert.ok(item.cta.slugs?.length, item.id);
      for (const slug of item.cta.slugs || []) {
        assert.equal(cityInfoHasSlug(slug), true, `${item.id}:${slug}`);
      }
    }
  }
  const blob = JSON.stringify(pack);
  assert.equal(/aviasales|яндекс путешеств|yandex\.travel|wide.?catalog/i.test(blob), false, city);
}

test('Moscow lifehacks: Troika, MOW, Annushka, museum week, GUM canteen', () => {
  const pack = resolveCityLifehacks('moscow');
  assert.ok(pack);
  assertPackCopy(pack, 'moscow');
  assert.deepEqual(
    pack.tabs.map((tab) => tab.id),
    ['walk', 'transit', 'fly', 'food'],
  );
  const ids = pack.items.map((item) => item.id);
  assert.deepEqual(ids, [
    'msk-troika',
    'msk-mow-code',
    'msk-annushka',
    'msk-museum-week',
    'msk-stolovaya-57',
  ]);
  const week = pack.items.find((item) => item.id === 'msk-museum-week');
  assert.equal(week?.cta.kind, 'link');
  assert.equal(week?.cta.href, 'https://www.mos.ru/afisha/');
  const fly = pack.items.find((item) => item.id === 'msk-mow-code');
  assert.equal(fly?.cta.kind, 'affiche');
  assert.match(lifehackBodyText(fly?.body || []), /MOW/);
});

test('SPB lifehacks have no fly tab and keep legal rooftop CTAs', () => {
  const pack = resolveCityLifehacks('saint-petersburg');
  assert.ok(pack);
  assertPackCopy(pack, 'saint-petersburg');
  assert.deepEqual(
    pack.tabs.map((tab) => tab.id),
    ['walk', 'transit', 'food'],
  );
  assert.equal(
    pack.items.some((item) => item.tabId === 'fly'),
    false,
  );
  const peterhof = pack.items.find((item) => item.id === 'spb-peterhof');
  assert.equal(peterhof?.cta.href, 'https://peterhofmuseum.ru/');
  const food = pack.items.find((item) => item.id === 'spb-pyshechnaya');
  assert.equal(food?.cta.kind, 'places');
});

test('Kaliningrad kosa CTA points to official park site', () => {
  const pack = resolveCityLifehacks('kaliningrad');
  assert.ok(pack);
  assertPackCopy(pack, 'kaliningrad');
  const kosa = pack.items.find((item) => item.id === 'kgd-kosa');
  assert.equal(kosa?.cta.kind, 'link');
  assert.equal(kosa?.cta.href, 'https://www.park-kosa.ru/');
  const fly = pack.items.find((item) => item.id === 'kgd-subsidy');
  assert.equal(fly?.cta.kind, 'affiche');
});

test('NN lifehacks: Lastochka affiche, cableway and free kremlin', () => {
  const pack = resolveCityLifehacks('nizhny-novgorod');
  assert.ok(pack);
  assertPackCopy(pack, 'nizhny-novgorod');
  const fly = pack.items.find((item) => item.id === 'nn-lastochka');
  assert.equal(fly?.cta.kind, 'affiche');
  const cable = pack.items.find((item) => item.id === 'nn-cable');
  assert.equal(cable?.cta.kind, 'places');
  const kremlin = pack.items.find((item) => item.id === 'nn-kremlin-free');
  assert.equal(kremlin?.cta.kind, 'places');
});

test('EKB Kazan Samara Krasnodar Krasnoyarsk Novosibirsk Voronezh Ryazan Ufa lifehacks: 5 cards, no fly tab', () => {
  for (const city of [
    'ekaterinburg',
    'kazan',
    'samara',
    'krasnodar',
    'krasnoyarsk',
    'novosibirsk',
    'voronezh',
    'ryazan',
    'ufa',
    'omsk',
    'chelyabinsk',
    'tyumen',
  ] as const) {
    const pack = resolveCityLifehacks(city);
    assert.ok(pack, city);
    assertPackCopy(pack, city);
    assert.equal(pack.items.length, 5, city);
    assert.equal(
      pack.items.some((item) => item.tabId === 'fly'),
      false,
      city,
    );
    if (city === 'novosibirsk') {
      assert.ok(pack.items.some((item) => item.cta.kind === 'places'), city);
      assert.ok(pack.items.some((item) => item.cta.kind === 'gis'), city);
    } else if (
      city === 'voronezh' ||
      city === 'ufa' ||
      city === 'ryazan' ||
      city === 'omsk' ||
      city === 'chelyabinsk' ||
      city === 'tyumen'
    ) {
      assert.ok(pack.items.some((item) => item.cta.kind === 'places'), city);
      assert.ok(pack.items.some((item) => item.cta.kind === 'gis'), city);
    } else if (city === 'krasnoyarsk') {
      assert.ok(pack.items.some((item) => item.cta.kind === 'affiche'), city);
      assert.ok(pack.items.some((item) => item.cta.kind === 'gis'), city);
    } else {
      assert.ok(pack.items.some((item) => item.cta.kind === 'affiche'), city);
      assert.ok(pack.items.some((item) => item.cta.kind === 'places'), city);
    }
  }
  const ekb = resolveCityLifehacks('ekaterinburg');
  assert.equal(ekb?.items[0]?.id, 'ekb-colored-lines');
  const kazan = resolveCityLifehacks('kazan');
  assert.equal(kazan?.items[0]?.id, 'kazan-kremlin-free');
  const samara = resolveCityLifehacks('samara');
  assert.equal(samara?.items[0]?.id, 'samara-embankment-free');
  const krd = resolveCityLifehacks('krasnodar');
  assert.equal(krd?.items[0]?.id, 'krasnodar-galitskiy-free');
  const krs = resolveCityLifehacks('krasnoyarsk');
  assert.equal(krs?.items[0]?.id, 'krasnoyarsk-tatyshev-free');
  const nsk = resolveCityLifehacks('novosibirsk');
  assert.equal(nsk?.items[0]?.id, 'novosibirsk-etk');
  const voronezh = resolveCityLifehacks('voronezh');
  assert.equal(voronezh?.items[0]?.id, 'voronezh-transport-sbp');
  const ryazan = resolveCityLifehacks('ryazan');
  assert.equal(ryazan?.items[0]?.id, 'ryazan-umka-card');
  const ufa = resolveCityLifehacks('ufa');
  assert.equal(ufa?.items[0]?.id, 'ufa-alga-card');
  const omsk = resolveCityLifehacks('omsk');
  assert.equal(omsk?.items[0]?.id, 'omsk-omka-card');
  const chelyabinsk = resolveCityLifehacks('chelyabinsk');
  assert.equal(chelyabinsk?.items[0]?.id, 'chelyabinsk-transport-card');
  const tyumen = resolveCityLifehacks('tyumen');
  assert.equal(tyumen?.items[0]?.id, 'tyumen-tts-card');
});

test('Ryazan painted lines have 6 / 7 stops with coords', async () => {
  const { RYAZAN_GREEN_LINE_STOPS, RYAZAN_LINE_DAY_ROUTE_PRESETS } = await import(
    './ryazan-line-presets.ts'
  );
  assert.equal(RYAZAN_GREEN_LINE_STOPS.length, 6);
  assert.equal(
    RYAZAN_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'ryazan-red-line')?.stops
      ?.length,
    7,
  );
  assert.ok(
    RYAZAN_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        venueSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.venueSlug || stop.dayRouteId) &&
        (stop.longitude || 0) > 30 &&
        (stop.longitude || 0) < 45,
    ),
  );
});

test('Voronezh painted lines have 7 / 7 stops with coords', async () => {
  const { VORONEZH_GREEN_LINE_STOPS, VORONEZH_LINE_DAY_ROUTE_PRESETS } = await import(
    './voronezh-line-presets.ts'
  );
  assert.equal(VORONEZH_GREEN_LINE_STOPS.length, 7);
  assert.equal(
    VORONEZH_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'voronezh-red-line')
      ?.stops?.length,
    7,
  );
  assert.ok(
    VORONEZH_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.dayRouteId),
    ),
  );
});

test('Chelyabinsk painted lines have 6 / 6 stops with coords', async () => {
  const { CHELYABINSK_GREEN_LINE_STOPS, CHELYABINSK_LINE_DAY_ROUTE_PRESETS } = await import(
    './chelyabinsk-line-presets.ts'
  );
  assert.equal(CHELYABINSK_GREEN_LINE_STOPS.length, 6);
  assert.equal(
    CHELYABINSK_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'chelyabinsk-red-line')
      ?.stops?.length,
    6,
  );
  assert.ok(
    CHELYABINSK_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        venueSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.venueSlug || stop.dayRouteId) &&
        (stop.latitude || 0) > 55 &&
        (stop.longitude || 0) > 61,
    ),
  );
});

test('Ufa painted lines have 7 / 7 stops with coords', async () => {
  const { UFA_GREEN_LINE_STOPS, UFA_LINE_DAY_ROUTE_PRESETS } = await import('./ufa-line-presets.ts');
  assert.equal(UFA_GREEN_LINE_STOPS.length, 7);
  assert.equal(
    UFA_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'ufa-red-line')?.stops?.length,
    7,
  );
  assert.ok(
    UFA_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        venueSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.venueSlug || stop.dayRouteId),
    ),
  );
});

test('Omsk painted lines have 6 / 6 stops with coords', async () => {
  const { OMSK_GREEN_LINE_STOPS, OMSK_LINE_DAY_ROUTE_PRESETS } = await import('./omsk-line-presets.ts');
  assert.equal(OMSK_GREEN_LINE_STOPS.length, 6);
  assert.equal(
    OMSK_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'omsk-red-line')?.stops?.length,
    6,
  );
  assert.ok(
    OMSK_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        venueSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.venueSlug || stop.dayRouteId) &&
        (stop.longitude || 0) > 70 &&
        (stop.longitude || 0) < 76,
    ),
  );
});

test('Tyumen painted lines have 6 / 6 stops with coords', async () => {
  const { TYUMEN_GREEN_LINE_STOPS, TYUMEN_LINE_DAY_ROUTE_PRESETS } = await import(
    './tyumen-line-presets.ts'
  );
  assert.equal(TYUMEN_GREEN_LINE_STOPS.length, 6);
  assert.equal(
    TYUMEN_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'tyumen-red-line')?.stops
      ?.length,
    6,
  );
  assert.ok(
    TYUMEN_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        venueSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.venueSlug || stop.dayRouteId) &&
        (stop.longitude || 0) > 65 &&
        (stop.longitude || 0) < 66,
    ),
  );
});

test('Novosibirsk painted lines have 5 / 5 stops with coords', async () => {
  const { NOVOSIBIRSK_GREEN_LINE_STOPS, NOVOSIBIRSK_LINE_DAY_ROUTE_PRESETS } = await import(
    './novosibirsk-line-presets.ts'
  );
  assert.equal(NOVOSIBIRSK_GREEN_LINE_STOPS.length, 5);
  assert.equal(
    NOVOSIBIRSK_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'novosibirsk-red-line')
      ?.stops?.length,
    5,
  );
  assert.ok(
    NOVOSIBIRSK_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.dayRouteId),
    ),
  );
});

test('EKB painted lines have 35 / 11 / 10 stops with coords and slugs', async () => {
  const { EKB_RED_LINE_STOPS, EKB_LINE_DAY_ROUTE_PRESETS } = await import(
    './ekaterinburg-line-presets.ts'
  );
  assert.equal(EKB_RED_LINE_STOPS.length, 35);
  assert.ok(
    EKB_RED_LINE_STOPS.every(
      (stop: { latitude?: number; longitude?: number; locationSlug?: string; dayRouteId?: string }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.dayRouteId),
    ),
  );
  assert.equal(
    EKB_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'ekaterinburg-red-line')?.stops
      ?.length,
    35,
  );
  assert.equal(
    EKB_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'ekaterinburg-blue-line')?.stops
      ?.length,
    11,
  );
  assert.equal(
    EKB_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'ekaterinburg-purple-line')
      ?.stops?.length,
    10,
  );
});

test('Krasnodar painted lines have 18 / 10 stops with coords and slugs', async () => {
  const { KRASNODAR_GREEN_LINE_STOPS, KRASNODAR_LINE_DAY_ROUTE_PRESETS } = await import(
    './krasnodar-line-presets.ts'
  );
  assert.equal(KRASNODAR_GREEN_LINE_STOPS.length, 18);
  assert.ok(
    KRASNODAR_GREEN_LINE_STOPS.every(
      (stop: { latitude?: number; longitude?: number; locationSlug?: string; dayRouteId?: string }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.dayRouteId),
    ),
  );
  assert.equal(
    KRASNODAR_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'krasnodar-green-line')
      ?.stops?.length,
    18,
  );
  assert.equal(
    KRASNODAR_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'krasnodar-red-line')
      ?.stops?.length,
    10,
  );
});

test('Krasnoyarsk painted lines have 18 / 11 stops with coords and slugs', async () => {
  const { KRASNOYARSK_GREEN_LINE_STOPS, KRASNOYARSK_LINE_DAY_ROUTE_PRESETS } = await import(
    './krasnoyarsk-line-presets.ts'
  );
  assert.equal(KRASNOYARSK_GREEN_LINE_STOPS.length, 18);
  assert.ok(
    KRASNOYARSK_GREEN_LINE_STOPS.every(
      (stop: {
        latitude?: number;
        longitude?: number;
        locationSlug?: string;
        venueSlug?: string;
        dayRouteId?: string;
      }) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Boolean(stop.locationSlug || stop.venueSlug || stop.dayRouteId),
    ),
  );
  assert.equal(
    KRASNOYARSK_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'krasnoyarsk-green-line')
      ?.stops?.length,
    18,
  );
  assert.equal(
    KRASNOYARSK_LINE_DAY_ROUTE_PRESETS.find((p: { id: string }) => p.id === 'krasnoyarsk-red-line')
      ?.stops?.length,
    11,
  );
});

test('MSK NN Samara SPB KGD painted lines: compact walkable stop counts', async () => {
  const cases = [
    { mod: './moscow-line-presets.ts', green: 'MOSCOW_GREEN_LINE_STOPS', presets: 'MOSCOW_LINE_DAY_ROUTE_PRESETS', g: 12, r: 10, gid: 'moscow-green-line', rid: 'moscow-red-line' },
    { mod: './nizhny-novgorod-line-presets.ts', green: 'NIZHNY_NOVGOROD_GREEN_LINE_STOPS', presets: 'NIZHNY_NOVGOROD_LINE_DAY_ROUTE_PRESETS', g: 10, r: 8, gid: 'nizhny-novgorod-green-line', rid: 'nizhny-novgorod-red-line' },
    { mod: './samara-line-presets.ts', green: 'SAMARA_GREEN_LINE_STOPS', presets: 'SAMARA_LINE_DAY_ROUTE_PRESETS', g: 10, r: 8, gid: 'samara-green-line', rid: 'samara-red-line' },
    { mod: './saint-petersburg-line-presets.ts', green: 'SAINT_PETERSBURG_GREEN_LINE_STOPS', presets: 'SAINT_PETERSBURG_LINE_DAY_ROUTE_PRESETS', g: 10, r: 9, gid: 'saint-petersburg-green-line', rid: 'saint-petersburg-red-line' },
    { mod: './kaliningrad-line-presets.ts', green: 'KALININGRAD_GREEN_LINE_STOPS', presets: 'KALININGRAD_LINE_DAY_ROUTE_PRESETS', g: 10, r: 8, gid: 'kaliningrad-green-line', rid: 'kaliningrad-red-line' },
  ] as const;
  for (const item of cases) {
    const mod = await import(item.mod);
    const greenStops = mod[item.green];
    const presets = mod[item.presets];
    assert.equal(greenStops.length, item.g, item.gid);
    assert.ok(
      greenStops.every(
        (stop: {
          latitude?: number;
          longitude?: number;
          locationSlug?: string;
          dayRouteId?: string;
        }) =>
          Number.isFinite(stop.latitude) &&
          Number.isFinite(stop.longitude) &&
          Boolean(stop.locationSlug || stop.dayRouteId),
      ),
      item.gid,
    );
    assert.equal(presets.find((p: { id: string }) => p.id === item.gid)?.stops?.length, item.g, item.gid);
    assert.equal(presets.find((p: { id: string }) => p.id === item.rid)?.stops?.length, item.r, item.rid);
  }
  const samaraRed = (await import('./samara-line-presets.ts')).SAMARA_RED_LINE_STOPS as Array<{
    longitude?: number;
  }>;
  assert.ok(samaraRed.every((s) => (s.longitude || 0) > 40), 'samara red stays in Samara lon');
});
