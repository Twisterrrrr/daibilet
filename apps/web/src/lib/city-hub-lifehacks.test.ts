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

function cityInfoHasSlug(slug: string): boolean {
  const quoted = new RegExp(`['"]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  return (
    quoted.test(CITY_INFO_SRC) ||
    quoted.test(EKB_HUB_SRC) ||
    quoted.test(KAZAN_HUB_SRC) ||
    quoted.test(SAMARA_HUB_SRC)
  );
}

function assertNoLongDash(value: string, label: string) {
  assert.equal(value.includes('\u2014'), false, label);
  assert.equal(value.includes('\u2013'), false, label);
}

test('lifehacks cover Perm, Moscow, SPB, Kaliningrad, NN, EKB, Kazan and Samara', () => {
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
  assert.equal(cityHasLifehacks('ufa'), false);
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

test('EKB Kazan Samara lifehacks: 5 cards, no fly tab, places CTAs resolve', () => {
  for (const city of ['ekaterinburg', 'kazan', 'samara'] as const) {
    const pack = resolveCityLifehacks(city);
    assert.ok(pack, city);
    assertPackCopy(pack, city);
    assert.equal(pack.items.length, 5, city);
    assert.equal(
      pack.items.some((item) => item.tabId === 'fly'),
      false,
      city,
    );
    assert.ok(pack.items.some((item) => item.cta.kind === 'affiche'), city);
    assert.ok(pack.items.some((item) => item.cta.kind === 'places'), city);
  }
  const ekb = resolveCityLifehacks('ekaterinburg');
  assert.equal(ekb?.items[0]?.id, 'ekb-colored-lines');
  const kazan = resolveCityLifehacks('kazan');
  assert.equal(kazan?.items[0]?.id, 'kazan-kremlin-free');
  const samara = resolveCityLifehacks('samara');
  assert.equal(samara?.items[0]?.id, 'samara-embankment-free');
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
