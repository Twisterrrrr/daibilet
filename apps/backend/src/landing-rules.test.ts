import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findLandingRule,
  matchesLandingRule,
  matchingLandingSlugs,
} from './landing-rules.js';

test('matches a focused river landing and rejects unrelated transport', () => {
  const river = findLandingRule('river-cruises');
  assert.ok(river);
  assert.equal(matchesLandingRule({
    title: 'Прогулка на теплоходе по Неве',
    category: 'Экскурсии',
    tags: ['Водные экскурсии'],
    city: 'Санкт-Петербург',
  }, river), true);
  assert.equal(matchesLandingRule({
    title: 'Автобусная экскурсия по центру',
    category: 'Экскурсии',
    tags: [],
    city: 'Санкт-Петербург',
  }, river), false);
});

test('keeps city and venue landing constraints strict', () => {
  assert.deepEqual(
    matchingLandingSlugs({
      title: 'Ночная прогулка к разводным мостам',
      city: 'Москва',
      tags: ['Разводные мосты'],
    }).includes('bridges-night'),
    false,
  );
  assert.equal(
    matchingLandingSlugs({ title: 'Музыка под звездами', venue: 'Планетарий 1' })
      .includes('planetarium'),
    true,
  );
});

test('requires an excursion signal for country tours', () => {
  const countryTours = findLandingRule('country-tours');
  assert.ok(countryTours);

  assert.equal(matchesLandingRule({
    title: 'Автобусная экскурсия в Петергоф',
    category: 'Экскурсии',
    subcategories: ['Автобусные экскурсии'],
    city: 'Санкт-Петербург',
  }, countryTours), true);
  assert.equal(matchesLandingRule({
    title: 'Тур в Выборг - шведское сердце России',
    category: 'Экскурсии',
    subcategories: ['Автобусный тур'],
    city: 'Санкт-Петербург',
  }, countryTours), true);

  for (const candidate of [
    { title: 'Концерт в Большом Петергофском дворце', category: 'Музыка' },
    { title: 'Пиковая дама. Салонные чтения повести Пушкина', category: 'Театр' },
    { title: 'Мастер-класс в Павловске', category: 'Мастер-классы' },
    { title: 'Экскурсия в Кронштадт', category: 'Экскурсии', city: 'Москва' },
  ]) {
    assert.equal(matchesLandingRule({
      ...candidate,
      city: candidate.city || 'Санкт-Петербург',
    }, countryTours), false, candidate.title);
  }
});

test('excludes bus tours from concerts even when title has music keywords', () => {
  const concerts = findLandingRule('concerts-genre');
  assert.ok(concerts);

  assert.equal(matchesLandingRule({
    title: 'Вечерняя симфония Петербурга - на автобусе',
    category: 'Экскурсии',
    tags: ['Автобусные туры'],
    subcategories: ['Автобусные туры'],
    venue: 'Точка сбора',
    city: 'Санкт-Петербург',
  }, concerts), false);

  assert.equal(matchesLandingRule({
    title: 'Панорамная экскурсия по центру на автобусе',
    category: 'Экскурсии',
    tags: ['Автобусные экскурсии'],
    city: 'Москва',
  }, concerts), false);

  assert.equal(matchesLandingRule({
    title: 'Симфонический концерт в филармонии',
    category: 'Музыка',
    tags: ['Классика', 'Симфоническая музыка'],
    city: 'Санкт-Петербург',
  }, concerts), true);
});

test('keeps rooftop tours separate from concerts and parties', () => {
  const rooftops = findLandingRule('rooftops');
  assert.ok(rooftops);

  assert.equal(matchesLandingRule({
    title: 'Экскурсия по крышам Петербурга',
    category: 'Экскурсии',
    city: 'Санкт-Петербург',
  }, rooftops), true);
  assert.equal(matchesLandingRule({
    title: 'СМОТРОВАЯ ПЛОЩАДКА «ВЫШЕ ТОЛЬКО ЛЮБОВЬ». 92 ЭТАЖ',
    category: 'Развлечения',
    tags: ['Смотровые площадки'],
    city: 'Москва',
  }, rooftops), true);
  assert.equal(matchesLandingRule({
    title: 'Летняя экскурсия «Архитектура музея с выходом на крышу»',
    category: 'Музеи и арт',
    city: 'Красноярск',
  }, rooftops), true);
  assert.equal(matchesLandingRule({
    title: 'Концерт на крыше Невского',
    category: 'Музыка',
    city: 'Санкт-Петербург',
  }, rooftops), false);
  assert.equal(matchesLandingRule({
    title: 'Панорамная экскурсия по центру на автобусе',
    category: 'Экскурсии',
    city: 'Москва',
  }, rooftops), false);
});

test('requires a seasonal term in a New Year title', () => {
  const newYear = findLandingRule('new-year');
  assert.ok(newYear);

  assert.equal(matchesLandingRule({
    title: 'Новогодний концерт в декабре',
    tags: ['Новый год'],
  }, newYear), true);
  assert.equal(matchesLandingRule({
    title: 'Концерт на крыше Невского',
    tags: ['Новый год'],
  }, newYear), false);
});

test('applies canonical subcategory rules and Moscow-time schedule', () => {
  assert.equal(matchingLandingSlugs({
    title: 'Обзорная экскурсия по городу',
    subcategories: ['Автобусные экскурсии'],
    city: 'Москва',
    venue: 'Туристический автобус',
  }).includes('bus-tours'), true);

  const nightCandidate = {
    title: 'Прогулка к разводным мостам',
    city: 'Санкт-Петербург',
    tags: ['Разводные мосты'],
  };
  assert.equal(matchingLandingSlugs({
    ...nightCandidate,
    startsAt: '2026-07-10T19:30:00.000Z',
  }).includes('bridges-night'), true);
  assert.equal(matchingLandingSlugs({
    ...nightCandidate,
    startsAt: '2026-07-10T12:00:00.000Z',
  }).includes('bridges-night'), false);

  const busByVenue = matchingLandingSlugs({
    title: 'Жизнь и чудеса Матроны Московской',
    category: 'Экскурсии',
    venue: 'YUTONG 6122',
    tags: ['Теплоход: YUTONG 6122'],
  });
  assert.equal(busByVenue.includes('bus-tours'), true);
  assert.equal(busByVenue.includes('river-cruises'), false);

  assert.equal(matchingLandingSlugs({
    title: 'Экскурсия на двухэтажном автобусе Hop on - hop off',
    category: 'Экскурсии',
    city: 'Москва',
  }).includes('bus-tours'), true);
});
