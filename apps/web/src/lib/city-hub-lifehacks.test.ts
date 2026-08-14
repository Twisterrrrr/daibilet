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

function cityInfoHasSlug(slug: string): boolean {
  const quoted = new RegExp(`['"]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  return quoted.test(CITY_INFO_SRC);
}

function assertNoLongDash(value: string, label: string) {
  assert.equal(value.includes('\u2014'), false, label);
  assert.equal(value.includes('\u2013'), false, label);
}

test('lifehacks are Perm-only until other cities fill packs', () => {
  assert.equal(cityHasLifehacks('perm'), true);
  assert.equal(cityHasLifehacks('moscow'), false);
  assert.equal(cityHasLifehacks('saint-petersburg'), false);
  assert.equal(cityHasLifehacks('kazan'), false);
  assert.equal(resolveCityLifehacks('moskva'), null);
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
