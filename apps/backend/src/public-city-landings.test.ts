import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPublicLandings } from './public-city-landings.js';

test('buildPublicLandings rematches city sessions and drops Екатеринбург concert false river hits', () => {
  const sessions = [
    {
      title: 'Азон в Екатеринбурге 2 октября 2026г. Презентация нового альбома!',
      category: 'Мероприятия',
      venue: 'Корчма "Пристанище"',
      city: 'Екатеринбург',
      tags: [],
      // Stale precomputed slug from old substring matcher (катер ⊂ Екатеринбург).
      landingSlugs: ['river-cruises', 'river-party'],
      priceFrom: 1500,
    },
    {
      title: 'ОЛЕГ ГРУЗ DJ PUZA TGK 11 сентября Бар Nebar г. Екатеринбург',
      category: 'Развлечения',
      venue: 'Nebar',
      city: 'Екатеринбург',
      tags: [],
      landingSlugs: ['river-party'],
      priceFrom: 2000,
    },
    {
      title: 'Вечер стендап комедии',
      category: 'Мероприятия',
      venue: 'Проверка',
      city: 'Екатеринбург',
      tags: ['Stand up'],
      landingSlugs: ['standup'],
      priceFrom: 800,
    },
  ];

  const landings = buildPublicLandings(sessions);
  const bySlug = Object.fromEntries(landings.map((row) => [row.slug, row.events]));

  assert.equal(bySlug['river-cruises'], 0);
  assert.equal(bySlug['river-party'], 0);
  assert.ok((bySlug.standup || 0) >= 1);
});

test('buildPublicLandings keeps real boat tours in river-cruises', () => {
  const landings = buildPublicLandings([
    {
      title: 'Прогулка на теплоходе по Неве',
      category: 'Экскурсии',
      venue: 'Причал',
      city: 'Санкт-Петербург',
      tags: ['Водные экскурсии'],
      landingSlugs: [],
      priceFrom: 900,
    },
  ]);
  const river = landings.find((row) => row.slug === 'river-cruises');
  assert.equal(river?.events, 1);
});
