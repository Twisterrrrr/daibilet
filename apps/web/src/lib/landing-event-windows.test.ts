import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isDateInsideLandingWindow,
  isSessionInsideLandingWindow,
  resolveLandingEventWindow,
  resolveMoscowCityDaySaturday,
  resolveLandingTitleDateShort,
} from './landing-event-windows.ts';

test('salute-9-may window is a single May 9', () => {
  const window = resolveLandingEventWindow('salute-9-may', new Date('2026-08-06T12:00:00+03:00'));
  assert.ok(window);
  assert.equal(window!.singleDay, true);
  assert.equal(window!.start.getMonth(), 4);
  assert.equal(window!.start.getDate(), 9);
  assert.equal(window!.end.getDate(), 9);
});

test('new-year window is 24 Dec – 14 Jan cross-year', () => {
  const window = resolveLandingEventWindow('new-year', new Date('2026-08-06T12:00:00+03:00'));
  assert.ok(window);
  assert.equal(window!.start.getMonth(), 11);
  assert.equal(window!.start.getDate(), 24);
  assert.equal(window!.end.getMonth(), 0);
  assert.equal(window!.end.getDate(), 14);
  assert.equal(window!.end.getFullYear(), window!.start.getFullYear() + 1);
});

test('valentine window is 9–19 Feb', () => {
  const window = resolveLandingEventWindow('valentine', new Date('2026-08-06T12:00:00+03:00'));
  assert.ok(window);
  assert.equal(window!.start.getMonth(), 1);
  assert.equal(window!.start.getDate(), 9);
  assert.equal(window!.end.getDate(), 19);
});

test('moscow-city-day uses first Saturday of September ±1 day', () => {
  const saturday = resolveMoscowCityDaySaturday(new Date('2026-08-06T12:00:00+03:00'));
  assert.equal(saturday.getDay(), 6);
  assert.equal(saturday.getMonth(), 8);
  const window = resolveLandingEventWindow('moscow-city-day', new Date('2026-08-06T12:00:00+03:00'));
  assert.ok(window);
  assert.equal(window!.singleDay, false);
  assert.ok(isDateInsideLandingWindow(saturday, window!));
});

test('session outside salute window is rejected', () => {
  const window = resolveLandingEventWindow('salute-9-may', new Date('2026-08-06T12:00:00+03:00'));
  assert.equal(
    isSessionInsideLandingWindow('2026-08-06T20:00:00+03:00', window, 'Europe/Moscow'),
    false,
  );
  assert.equal(
    isSessionInsideLandingWindow('2027-05-09T21:00:00+03:00', window, 'Europe/Moscow'),
    true,
  );
});

test('title date short: outside window drops сегодня word', () => {
  const outside = resolveLandingTitleDateShort(
    'salute-9-may',
    new Date('2026-08-06T12:00:00+03:00'),
  );
  assert.equal(outside.useTodayWord, false);
  assert.match(outside.short, /9 мая/);

  const inside = resolveLandingTitleDateShort(
    'salute-9-may',
    new Date('2027-05-09T12:00:00+03:00'),
  );
  assert.equal(inside.useTodayWord, true);
});
