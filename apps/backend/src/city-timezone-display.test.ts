import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveCityTimeZone } from './city-timezone.js';
import { formatDate, formatTime } from './dto.js';

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

test('Moscow stays Europe/Moscow', () => {
  assert.equal(resolveCityTimeZone('Москва'), 'Europe/Moscow');
  assert.equal(formatTime('2026-08-02T13:00:00.000Z', resolveCityTimeZone('Москва')), '16:00');
});
