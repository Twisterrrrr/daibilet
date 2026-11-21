import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePublicVenueRecord, sanitizePartnerVenueDisplayTitle } from './venue-normalize.js';

test('normalizePublicVenueRecord does not invent ул. before city prefix', () => {
  const result = normalizePublicVenueRecord({
    title: 'Исаакиевский собор',
    address: 'г. Санкт-Петербург, Исаакиевская площадь, д. 4',
    city: 'Санкт-Петербург',
  });
  assert.ok(result.address);
  assert.doesNotMatch(String(result.address), /^ул\.\s*г\./i);
  assert.match(String(result.address), /Исаакиевская площадь/i);
  assert.match(String(result.address), /4/);
});

test('normalizePublicVenueRecord keeps Fontanka pier street line intact', () => {
  const result = normalizePublicVenueRecord({
    title: 'Причал на наб. р. Фонтанки 105',
    address: 'набережная реки Фонтанки, 105',
    city: 'Санкт-Петербург',
  });
  assert.equal(result.address, 'набережная реки Фонтанки, 105');
});

test('normalizePublicVenueRecord strips poisoned ул. г. prefix', () => {
  const result = normalizePublicVenueRecord({
    title: 'Екатерининский дворец',
    address: 'ул. г. Пушкин, Садовая ул., д. 7',
    city: 'Санкт-Петербург',
  });
  assert.ok(result.address);
  assert.doesNotMatch(String(result.address), /^ул\.\s*г\./i);
  assert.match(String(result.address), /Садовая/i);
});

test('normalizePublicVenueRecord applies official Hermitage display title by slug', () => {
  const result = normalizePublicVenueRecord({
    slug: 'ermitazh',
    title: 'Эрмитаж',
    city: 'Санкт-Петербург',
  });
  assert.equal(result.title, 'Государственный Эрмитаж (Зимний дворец)');
});

test('normalizePublicVenueRecord renames Lavrushinsky address-title to Tretyakov Gallery', () => {
  const byId = normalizePublicVenueRecord({
    id: 'venue_6a1fd5158bd71b8ae77e127c',
    title: 'Москва, Лаврушинский переулок, 10',
    address: 'Москва, Лаврушинский переулок, 10',
    city: 'Москва',
  });
  assert.equal(byId.title, 'Государственная Третьяковская галерея');
  assert.equal(byId.address, 'Лаврушинский переулок, 10');

  const byMatch = normalizePublicVenueRecord({
    title: 'Москва, Лаврушинский переулок',
    address: 'Лаврушинский переулок, 10',
    city: 'Москва',
  });
  assert.equal(byMatch.title, 'Государственная Третьяковская галерея');
  assert.equal(byMatch.address, 'Лаврушинский переулок, 10');
});

test('normalizePublicVenueRecord maps ship Moskva-99 to Voskresenskaya pier in SPB', () => {
  const byId = normalizePublicVenueRecord({
    id: 'venue_6a4d040007d4af979f35e566',
    title: 'Теплоход «Москва – 99»',
    address: 'Адмиралтейская наб., 10',
    city: 'Москва',
  });
  assert.equal(byId.title, 'Воскресенская наб., 10');
  assert.equal(byId.address, 'Воскресенская наб., 10');
  assert.equal(byId.city, 'Санкт-Петербург');

  const byTitle = normalizePublicVenueRecord({
    title: 'Теплоход «Москва – 99»',
    address: 'Адмиралтейская наб., 10',
    city: 'Москва',
  });
  assert.equal(byTitle.title, 'Воскресенская наб., 10');
  assert.equal(byTitle.city, 'Санкт-Петербург');
});

test('formatPierLocationDisplayName replaces vessel hull title with pier address', async () => {
  const { formatPierLocationDisplayName } = await import('./venue-normalize.js');
  assert.equal(
    formatPierLocationDisplayName('Теплоход «РИО-1»', 'Ленинградское шоссе, 51А', 'Москва'),
    'Ленинградское шоссе, 51А',
  );
});

test('normalizePublicVenueRecord rewrites Sinopskaya pier house 10 to 10А', async () => {
  const byTitle = normalizePublicVenueRecord({
    title: 'Причал на Синопской наб., 10',
    address: 'Синопская наб., 10, Санкт-Петербург',
    city: 'Санкт-Петербург',
  });
  assert.equal(byTitle.title, 'Причал на Синопской наб., 10А');
  assert.equal(byTitle.address, 'Синопская наб., 10А');
  assert.equal(byTitle.city, 'Санкт-Петербург');

  const byId = normalizePublicVenueRecord({
    id: 'venue_629f8f730fdb465f9b2c54d0',
    title: 'Причал на Синопской наб., 10',
    address: 'Синопская наб., 10',
    city: 'Санкт-Петербург',
  });
  assert.equal(byId.title, 'Причал на Синопской наб., 10А');
  assert.equal(byId.address, 'Синопская наб., 10А');
});

test('inferCityFromAddressText prefers SPB embankment over ship Moskva-N', () => {
  const result = normalizePublicVenueRecord({
    title: 'Теплоход «Москва – 64»',
    address: 'ул. Воскресенская наб, 10',
    city: 'Москва',
  });
  // Override by match title/aliases may apply; city must not stay Москва from hull name.
  assert.equal(result.city, 'Санкт-Петербург');
});

test('sanitizePartnerVenueDisplayTitle keeps fortress name only', () => {
  assert.equal(
    sanitizePartnerVenueDisplayTitle(
      'Петропавловская крепость. Алексеевский равелин (внутренняя территория, ближе к пляжу со стороны Кронверкского пролива)',
    ),
    'Петропавловская крепость',
  );
  const record = normalizePublicVenueRecord({
    title:
      'Петропавловская крепость. Алексеевский равелин (внутренняя территория, ближе к пляжу со стороны Кронверкского пролива)',
    address: 'ул. территория Петропавловская крепость, дом 3У',
    city: 'Санкт-Петербург',
  });
  assert.equal(record.title, 'Петропавловская крепость');
});
