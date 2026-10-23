import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCityHubSeoDescription,
  buildCityHubSeoTitle,
  buildCityHubSeoTitleCore,
  buildCityHubSeoPhrase,
} from './city-hub-seo.ts';

test('city hub title describes sightseeing and getting around the city', () => {
  const title = buildCityHubSeoTitle('Уфа', new Date('2026-07-23T12:00:00+03:00'));
  assert.equal(
    title,
    'Уфа: зачем ехать, что посмотреть, ближайшие события на сегодня, 23 июля | Дайбилет',
  );
  assert.equal(
    buildCityHubSeoTitleCore('Уфа', new Date('2026-07-23T12:00:00+03:00')),
    title.replace(/\s*\|\s*Дайбилет\s*$/i, ''),
  );
});

test('city hub description explains main places, routes, museums and events', () => {
  const description = buildCityHubSeoDescription('Екатеринбург');
  assert.match(description, /^Что посмотреть в Екатеринбурге:/);
  assert.match(description, /главным местам в Екатеринбурге/);
  assert.match(description, /маршруты на день, музеи и события/);
  assert.match(description, /билеты онлайн на Дайбилете/);
});

test('city hub phrase supports unusual declensions', () => {
  assert.equal(
    buildCityHubSeoPhrase('Санкт-Петербург'),
    'Что посмотреть в Санкт-Петербурге: главные достопримечательности, места и экскурсии',
  );
});
