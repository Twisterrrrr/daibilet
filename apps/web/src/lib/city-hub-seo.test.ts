import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCityHubSeoDescription,
  buildCityHubSeoTitle,
  buildCityHubSeoTitleCore,
} from '@/lib/city-hub-seo';

test('city hub title Kazan year template', () => {
  const title = buildCityHubSeoTitle('Казань', new Date('2026-07-23T12:00:00+03:00'));
  assert.equal(
    title,
    'Афиша Казани 2026 - куда сходить, купить билеты на события в Казани',
  );
  assert.ok(!title.includes('\u2014') && !title.includes('\u2013'));
  assert.equal(buildCityHubSeoTitleCore('Казань', new Date('2026-07-23T12:00:00+03:00')), title);
});

test('city hub description Ekaterinburg', () => {
  const description = buildCityHubSeoDescription(
    'Екатеринбург',
    new Date('2026-07-23T12:00:00+03:00'),
  );
  assert.match(description, /^Все развлечения, экскурсии и концерты Екатеринбурга/);
  assert.match(description, /на 2026 год/);
  assert.match(description, /Daibilet\.ru/);
  assert.ok(!description.includes('\u2014') && !description.includes('\u2013'));
});

test('city hub Moscow keeps live-date title', () => {
  const title = buildCityHubSeoTitle('Москва', new Date('2026-07-23T12:00:00+03:00'));
  assert.match(title, /^Москва: афиша/);
  assert.match(title, /на сегодня/);
});
