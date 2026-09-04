import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCityTimeZone } from './city-timezone.js';
import { formatDate, formatTime } from './public-datetime.js';

/**
 * Event page / catalog display time = local wall-clock of event city
 * (same as TicketsCloud widget), not forced Europe/Moscow.
 */
test('Уфа resolves to Asia/Yekaterinburg', () => {
  assert.equal(resolveCityTimeZone('Уфа'), 'Asia/Yekaterinburg');
  assert.equal(resolveCityTimeZone('Уфа', 'Уфа'), 'Asia/Yekaterinburg');
});

test('Ufa session labels use YEKT, not MSK', () => {
  const startsAt = '2026-08-02T13:00:00.000Z';
  const timeZone = resolveCityTimeZone('Уфа');
  assert.equal(formatTime(startsAt, timeZone), '18:00');
  assert.equal(formatTime(startsAt, 'Europe/Moscow'), '16:00');
  assert.match(formatDate(startsAt, timeZone), /2/);
});

test('Ханты-Мансийск uses YEKT, not MSK default', () => {
  assert.equal(resolveCityTimeZone('Ханты-Мансийск'), 'Asia/Yekaterinburg');
});

test('promoted non-capitals keep oblast TZ after leaving cityToRegion', () => {
  assert.equal(resolveCityTimeZone('Тольятти'), 'Europe/Samara');
  assert.equal(resolveCityTimeZone('Сургут'), 'Asia/Yekaterinburg');
  assert.equal(resolveCityTimeZone('Новокузнецк'), 'Asia/Novokuznetsk');
  assert.equal(resolveCityTimeZone('Сортавала'), 'Europe/Moscow');
});

test('Moscow stays Europe/Moscow', () => {
  assert.equal(resolveCityTimeZone('Москва'), 'Europe/Moscow');
  assert.equal(formatTime('2026-08-02T13:00:00.000Z', resolveCityTimeZone('Москва')), '16:00');
});
