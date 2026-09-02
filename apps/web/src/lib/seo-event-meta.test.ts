import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEventCityMetaDescription,
  buildEventCityMetaTitle,
  buildEventListingMeta,
  buildEventPageMetaTitle,
} from '@/lib/seo-event-meta';

test('event title with price', () => {
  const title = buildEventCityMetaTitle({
    eventTitle: 'Стендап: Профи',
    cityName: 'Казань',
    priceFrom: 1200,
  });
  assert.equal(
    title,
    'Билеты на Стендап: Профи в Казани - расписание, цены от 1200 руб.',
  );
  assert.ok(!title.includes('\u2014') && !title.includes('\u2013'));
});

test('event title without price fallback', () => {
  const title = buildEventCityMetaTitle({
    eventTitle: 'Ночной концерт',
    cityName: 'Екатеринбург',
    priceFrom: null,
  });
  assert.equal(title, 'Билеты на Ночной концерт в Екатеринбурге - расписание и цены');
});

test('event description', () => {
  const description = buildEventCityMetaDescription({
    eventTitle: 'Стендап: Профи',
    cityName: 'Казань',
    year: 2026,
  });
  assert.equal(
    description,
    'Купить билеты на Стендап: Профи в Казани. Расписание на 2026 год, подробная программа, отзывы участников и онлайн-бронирование на сайте Daibilet.ru.',
  );
});

test('buildEventListingMeta only for expansion cities', () => {
  assert.equal(
    buildEventListingMeta({
      eventTitle: 'Шоу',
      cityName: 'Москва',
      citySlug: 'moscow',
      priceFrom: 500,
    }),
    null,
  );
  const meta = buildEventListingMeta({
    eventTitle: 'Шоу',
    cityName: 'Казань',
    citySlug: 'kazan',
    priceFrom: 500,
    year: 2026,
  });
  assert.ok(meta);
  assert.match(meta!.title, /^Билеты на Шоу в Казани/);
  assert.match(meta!.description, /Daibilet\.ru/);
});

test('event page title adds date disambiguator for twin sessions', () => {
  const titleA = buildEventPageMetaTitle({
    eventTitle: 'Экскурсия в галерею «Золотой век СССР. Искусство эпохи». Музей живописца Бориса Семёнова',
    seoTitle:
      'Экскурсия в галерею «Золотой век СССР. Искусство эпохи». Музей живописца Бориса Семёнова: билеты и расписание | Дайбилет',
    venueName: 'Музей',
    dateLabel: 'сб, 11 июл.',
    timeLabel: '12:00',
  });
  const titleB = buildEventPageMetaTitle({
    eventTitle: 'Экскурсия в галерею «Золотой век СССР. Искусство эпохи». Музей живописца Бориса Семёнова',
    seoTitle:
      'Экскурсия в галерею «Золотой век СССР. Искусство эпохи». Музей живописца Бориса Семёнова: билеты и расписание | Дайбилет',
    venueName: 'Музей',
    dateLabel: 'вс, 12 июл.',
    timeLabel: '14:00',
  });
  assert.notEqual(titleA, titleB);
  assert.match(titleA, /11 июл/);
  assert.match(titleB, /12 июл/);
  assert.ok(!titleA.includes('\u2014') && !titleA.includes('\u2013'));
});

test('event meta soft-cases ALL CAPS supplier titles', () => {
  const title = buildEventCityMetaTitle({
    eventTitle: 'КОНЦЕРТ ГРУППЫ SAHALIN',
    cityName: 'Казань',
    priceFrom: null,
  });
  assert.equal(title, 'Билеты на Концерт Группы Sahalin в Казани - расписание и цены');

  const page = buildEventPageMetaTitle({
    eventTitle: 'КОНЦЕРТ ГРУППЫ SAHALIN',
    cityName: 'Москва',
  });
  assert.match(page, /^Концерт Группы Sahalin/);
});
