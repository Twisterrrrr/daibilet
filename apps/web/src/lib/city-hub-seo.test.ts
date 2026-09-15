import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCityHubSeoDescription,
  buildCityHubSeoTitle,
  buildCityHubSeoTitleCore,
} from './city-hub-seo.ts';

test('city hub title uses P.2d for all cities including Kazan', () => {
  const title = buildCityHubSeoTitle('Казань', new Date('2026-07-23T12:00:00+03:00'));
  assert.match(title, /^Казань: афиша, экскурсии и билеты на сегодня,/);
  assert.match(title, /\|\s*Дайбилет$/);
  assert.ok(!title.includes('\u2014') && !title.includes('\u2013'));
  assert.equal(
    buildCityHubSeoTitleCore('Казань', new Date('2026-07-23T12:00:00+03:00')),
    title.replace(/\s*\|\s*Дайбилет\s*$/i, ''),
  );
});

test('city hub description Ekaterinburg matches SPB canon', () => {
  const description = buildCityHubSeoDescription(
    'Екатеринбург',
    new Date('2026-07-23T12:00:00+03:00'),
  );
  assert.match(description, /^Афиша, экскурсии и билеты Екатеринбурга\./);
  assert.match(description, /в Екатеринбурге:/);
  assert.match(description, /Дайбилете/);
  assert.ok(!description.includes('Daibilet.ru'));
  assert.ok(!description.includes('\u2014') && !description.includes('\u2013'));
});

test('city hub Moscow keeps live-date title', () => {
  const title = buildCityHubSeoTitle('Москва', new Date('2026-07-23T12:00:00+03:00'));
  assert.match(title, /^Москва: афиша/);
  assert.match(title, /на сегодня/);
});

test('city hub Saint-Petersburg P.2d phrase', () => {
  const description = buildCityHubSeoDescription('Санкт-Петербург');
  assert.match(description, /^Афиша, экскурсии и билеты Санкт-Петербурга\./);
});
