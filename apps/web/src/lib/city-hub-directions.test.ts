import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCityHubConfig } from './city-hub-config.ts';
import { resolveFeaturedDirections } from './city-hub-directions.ts';

test('SPb museums resolve via exhibitions landing, not moscow-museums', () => {
  const config = resolveCityHubConfig('sankt-peterburg');
  const rows = resolveFeaturedDirections({
    config,
    landings: [
      { slug: 'river-cruises', title: 'Речные прогулки', events: 26 },
      { slug: 'exhibitions', title: 'Выставки и музеи', events: 54 },
      { slug: 'bridges-night', title: 'Разводные мосты', events: 10 },
    ],
    categories: [
      ['Экскурсии', 18],
      ['Музеи и арт', 4],
    ],
    citySlug: 'sankt-peterburg',
  });

  const museums = rows.find((row) => row.id === 'museums');
  assert.ok(museums, 'museums direction must be present');
  assert.equal(museums?.slug, 'exhibitions');
  assert.equal(museums?.label, 'Музеи');
});

test('Moscow featured directions pin City Day ahead of museums', () => {
  const config = resolveCityHubConfig('moscow');
  const rows = resolveFeaturedDirections({
    config,
    landings: [
      { slug: 'moscow-museums', title: 'Музеи и выставки в Москве', events: 61 },
      { slug: 'concerts-genre', title: 'Концерты', events: 40 },
      { slug: 'river-cruises', title: 'Речные прогулки', events: 30 },
      { slug: 'bus-tours', title: 'Автобусные', events: 20 },
      { slug: 'moscow-city-day', title: 'День города в Москве', events: 11 },
    ],
    categories: [['Театр', 15]],
    citySlug: 'moscow',
  });

  assert.equal(rows[0]?.slug, 'moscow-city-day');
  assert.equal(rows[0]?.label, 'День города в Москве');
  const museumIndex = rows.findIndex((row) => row.slug === 'moscow-museums');
  assert.ok(museumIndex > 0);
});

test('museums fall back to category when landing slug missing for city', () => {
  const rows = resolveFeaturedDirections({
    config: {
      featuredDirections: [
        { id: 'museums', label: 'Музеи', landingSlug: 'moscow-museums', categoryKey: 'Музеи и арт' },
      ],
    },
    landings: [{ slug: 'river-cruises', title: 'Речные', events: 5 }],
    categories: [['Музеи и арт', 7]],
    citySlug: 'sankt-peterburg',
    limit: 1,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, 'museums');
  assert.equal(rows[0]?.categoryKey, 'Музеи и арт');
  assert.equal(rows[0]?.events, 7);
});

test('soft category match: Музеи config vs Музеи и арт API', () => {
  const rows = resolveFeaturedDirections({
    config: {
      featuredDirections: [{ id: 'museums', label: 'Музеи', categoryKey: 'Музеи' }],
    },
    landings: [],
    categories: [['Музеи и арт', 3]],
  });

  assert.equal(rows[0]?.categoryKey, 'Музеи и арт');
});

test('ekaterinburg config never hardcodes river; false river counts stay hidden', () => {
  const config = resolveCityHubConfig('ekaterinburg');
  assert.ok(config);
  assert.equal(
    config?.featuredDirections?.some((item) => item.landingSlug === 'river-cruises'),
    false,
  );

  const rows = resolveFeaturedDirections({
    config,
    landings: [
      { slug: 'river-cruises', title: 'Речные прогулки', events: 8 },
      { slug: 'river-party', title: 'Вечеринки на теплоходе', events: 4 },
      { slug: 'standup', title: 'Стендап', events: 29 },
      { slug: 'concerts-genre', title: 'Концерты', events: 20 },
    ],
    categories: [['Театр', 5]],
    citySlug: 'ekaterinburg',
  });

  assert.equal(rows.some((row) => row.slug === 'river-cruises'), false);
  assert.equal(rows.some((row) => row.slug === 'river-party'), false);
  assert.ok(rows.some((row) => row.slug === 'standup'));
  assert.ok(rows.every((row) => !row.slug || row.events > 0));
});

test('empty city landing counts are never shown as top-queries chips', () => {
  const rows = resolveFeaturedDirections({
    config: null,
    landings: [
      { slug: 'river-cruises', title: 'Речные прогулки', events: 0 },
      { slug: 'standup', title: 'Стендап', events: 12 },
    ],
    categories: [],
    citySlug: 'ekaterinburg',
  });

  assert.equal(rows.some((row) => row.slug === 'river-cruises'), false);
  assert.equal(rows[0]?.slug, 'standup');
  assert.equal(rows[0]?.events, 12);
});

test('Perm hub hides SPB-only country-tours even with positive count', () => {
  const rows = resolveFeaturedDirections({
    config: null,
    landings: [
      { slug: 'country-tours', title: 'Загородные экскурсии', events: 14 },
      { slug: 'spb-yards', title: 'Дворы', events: 9 },
      { slug: 'excursions', title: 'Экскурсии', events: 11 },
      { slug: 'walking-tours', title: 'Пешие экскурсии', events: 8 },
      { slug: 'rooftops', title: 'Смотровые площадки и крыши', events: 3 },
    ],
    categories: [],
    citySlug: 'perm',
    limit: 8,
  });

  assert.equal(rows.some((row) => row.slug === 'country-tours'), false);
  assert.equal(rows.some((row) => row.slug === 'spb-yards'), false);
  assert.ok(rows.some((row) => row.slug === 'excursions'));
  assert.ok(rows.some((row) => row.slug === 'walking-tours'));
  assert.ok(rows.some((row) => row.slug === 'rooftops'));
});
