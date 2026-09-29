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

test('event page title disambiguates twin sessions by venue, not by date', () => {
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
  // Same URL, different session times -> the title must NOT move.
  // 29.09: the disambiguator used to be the next session's date and time, so all
  // 3018 event titles changed as sessions ran out - on live:
  // "Прогулка от причала Киевский (вт, 29 сент., 18:07): билеты и расписание".
  assert.equal(titleA, titleB, 'title must be stable across sessions');
  assert.doesNotMatch(titleA, /11 июл|12 июл|12:00|14:00/);
  assert.match(titleA, /Музей/);
  assert.match(titleA, /билеты и расписание/);
  assert.ok(!titleA.includes('\u2014') && !titleA.includes('\u2013'));
});

test('event page title stays stable when date and time shift', () => {
  const base = {
    eventTitle: 'Речная прогулка по центру Москвы от причала Киевский',
    venueName: 'Патриарший сектор «A»',
  };
  const january = buildEventPageMetaTitle({ ...base, dateLabel: 'пн, 12 янв.', timeLabel: '10:00' });
  const evening = buildEventPageMetaTitle({ ...base, dateLabel: 'вт, 13 янв.', timeLabel: '18:07' });
  assert.equal(january, evening);
  assert.doesNotMatch(january, /\d{1,2}:\d{2}/);
  assert.doesNotMatch(january, /янв/);
  assert.match(january, /Патриарший сектор/);
});

test('event page title does not repeat a city already present in the event name', () => {
  // "Концерт в Москве" already names the city, declined. The field holds the
  // nominative "Москва", so a nominative-only check would append it twice.
  const title = buildEventPageMetaTitle({
    eventTitle: 'Концерт в Москве',
    cityName: 'Москва',
    dateLabel: 'вт, 29 сент.',
    timeLabel: '19:00',
  });
  assert.equal((title.match(/Москв/gi) || []).length, 1, title);
  assert.doesNotMatch(title, /29 сент|19:00/);
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
