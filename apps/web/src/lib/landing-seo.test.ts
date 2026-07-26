import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLandingSeo } from './landing-seo.ts';

test('new-year national: no сегодня and festive framing', () => {
  const seo = resolveLandingSeo({
    slug: 'new-year',
    profile: 'seasonal',
    landingTitle: 'Новый год',
    referenceDate: new Date('2026-07-26T12:00:00+03:00'),
  });
  assert.equal(seo.h1, 'Новый год в России: экскурсии, каникулы и праздничные программы');
  assert.equal(seo.h1Today, '');
  assert.equal(/сегодня/i.test(seo.h1), false);
  assert.equal(/сегодня/i.test(seo.title), false);
  assert.equal(/на сегодня/i.test(seo.description), false);
  assert.equal(/точки обзора/i.test(seo.h1), false);
});

test('new-year city: prepositional city, no date injection', () => {
  const seo = resolveLandingSeo({
    slug: 'new-year',
    profile: 'seasonal',
    landingTitle: 'Новый год',
    cityName: 'Москва',
    referenceDate: new Date('2026-07-26T12:00:00+03:00'),
  });
  assert.equal(seo.h1, 'Новый год в Москве: куда сходить и купить билеты');
  assert.equal(seo.h1Today, '');
  assert.match(seo.title, /Москве/);
  assert.equal(/сегодня/i.test(seo.title), false);
});

test('salute keeps viewpoint framing but skips сегодня', () => {
  const seo = resolveLandingSeo({
    slug: 'salute-9-may',
    profile: 'seasonal',
    landingTitle: 'Салют 9 мая',
    referenceDate: new Date('2026-07-26T12:00:00+03:00'),
  });
  assert.match(seo.h1, /точки обзора/i);
  assert.equal(/сегодня/i.test(seo.h1), false);
  assert.equal(seo.h1Today, '');
});

test('pricePhrase never invents от 100 without real priceFrom', () => {
  const withoutPrice = resolveLandingSeo({
    slug: 'standup',
    profile: 'default',
    landingTitle: 'Стендап',
    cityName: 'Москва',
    referenceDate: new Date('2026-07-26T12:00:00+03:00'),
  });
  assert.equal(/от\s+100\s+рублей/i.test(withoutPrice.description), false);
  assert.equal(/от\s+\d+\s+рублей/i.test(withoutPrice.description), false);

  const withPrice = resolveLandingSeo({
    slug: 'standup',
    profile: 'default',
    landingTitle: 'Стендап',
    cityName: 'Москва',
    stats: { priceFrom: 1200, events: 12 },
    referenceDate: new Date('2026-07-26T12:00:00+03:00'),
  });
  assert.match(withPrice.description, /от 1200 рублей/);
});
