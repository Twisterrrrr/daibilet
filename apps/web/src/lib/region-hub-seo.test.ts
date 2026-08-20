import assert from 'node:assert/strict';
import test from 'node:test';

import { cityToGenitive } from './city-declension.ts';
import {
  buildChildCityScopeLabel,
  buildChildCityScopeLead,
  buildChildCityScopeSeoTitle,
  buildChildCityScopeSeoTitleCore,
  buildRegionHubSeoTitle,
  childCityTitleGenitive,
} from './region-hub-seo.ts';

test('H1 locator is nominative without Афиша', () => {
  assert.equal(
    buildChildCityScopeLabel('Раменское', 'Московская область'),
    'Раменское, Московская область • Ближайшие события',
  );
  assert.ok(!buildChildCityScopeLabel('Раменское', 'Московская область').includes('Афиша'));
});

test('child SERP title uses manual genitive, year, and Дайбилет brand', () => {
  assert.equal(childCityTitleGenitive('Раменское'), 'Раменского');
  assert.equal(cityToGenitive('Раменское'), 'Раменского');
  const title = buildChildCityScopeSeoTitle('Раменское', new Date('2026-08-17T12:00:00+03:00'));
  assert.equal(title, 'Афиша Раменского: главные события и мероприятия 2026 | Дайбилет');
  assert.equal(
    buildChildCityScopeSeoTitleCore('Раменское', new Date('2026-08-17T12:00:00+03:00')),
    'Афиша Раменского: главные события и мероприятия 2026',
  );
  assert.notEqual(title, buildRegionHubSeoTitle('Московская область'));
});

test('lead absorbs куда сходить; not H1 or title', () => {
  const lead = buildChildCityScopeLead('Раменское', 'Московская область');
  assert.match(lead, /^Ищете, куда сходить в выходные\?/);
  assert.match(lead, /в Раменском и ближайших населенных пунктах Московской области/);
  assert.notEqual(lead, buildChildCityScopeLabel('Раменское', 'Московская область'));
  assert.ok(!lead.startsWith('Куда сходить в Раменском и Московской области?'));
});

test('Выборг formula A copy for LO hub', () => {
  assert.equal(
    buildChildCityScopeLabel('Выборг', 'Ленинградская область'),
    'Выборг, Ленинградская область • Ближайшие события',
  );
  assert.equal(childCityTitleGenitive('Выборг'), 'Выборга');
  const lead = buildChildCityScopeLead('Выборг', 'Ленинградская область');
  assert.match(lead, /в Выборге и ближайших населенных пунктах Ленинградской области/);
  assert.ok(!lead.includes('—') && !lead.includes('–'));
  assert.equal(
    buildChildCityScopeSeoTitle('Выборг', new Date('2026-08-17T12:00:00+03:00')),
    'Афиша Выборга: главные события и мероприятия 2026 | Дайбилет',
  );
});

test('catalog disambiguator is not repeated next to region in Formula A', () => {
  assert.equal(
    buildChildCityScopeLabel('Отрадное (Ленинградская область)', 'Ленинградская область'),
    'Отрадное, Ленинградская область • Ближайшие события',
  );
  const lead = buildChildCityScopeLead('Отрадное (Ленинградская область)', 'Ленинградская область');
  assert.match(lead, /в Отрадном и ближайших населенных пунктах Ленинградской области/);
  assert.ok(!lead.includes('(Ленинградская область)'));
});
