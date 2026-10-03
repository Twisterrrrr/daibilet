import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MY_DAY_COLLECT_CTA_ARIA,
  MY_DAY_COLLECT_CTA_LABEL,
  formatMyDayCollectTooltip,
} from './my-day-collect-cta.ts';

test('collect CTA copy is action-first without emoji', () => {
  assert.equal(MY_DAY_COLLECT_CTA_LABEL, 'Собрать маршрут');
  assert.equal(MY_DAY_COLLECT_CTA_ARIA, 'Собрать маршрут в Мой день');
  assert.doesNotMatch(MY_DAY_COLLECT_CTA_LABEL, /👉|Мой день/);
});

test('formatMyDayCollectTooltip interpolates stop count with Russian plural', () => {
  assert.match(formatMyDayCollectTooltip(7), /эти 7 точек/);
  assert.match(formatMyDayCollectTooltip(1), /эту 1 точку/);
  assert.match(formatMyDayCollectTooltip(3), /эти 3 точки/);
  assert.match(formatMyDayCollectTooltip(21), /эту 21 точку/);
});

test('formatMyDayCollectTooltip omits number when count unknown', () => {
  assert.match(formatMyDayCollectTooltip(null), /эти точки в интерактивный планировщик/);
  assert.match(formatMyDayCollectTooltip(undefined), /эти точки в интерактивный планировщик/);
  assert.match(formatMyDayCollectTooltip(0), /эти точки в интерактивный планировщик/);
  assert.doesNotMatch(formatMyDayCollectTooltip(null), /\d/);
});

test('formatMyDayCollectTooltip keeps planner hint and hyphen-only copy', () => {
  const text = formatMyDayCollectTooltip(7);
  assert.match(text, /интерактивный планировщик/);
  assert.match(text, /менять их местами/);
  assert.match(text, /смотреть на карте/);
  assert.match(text, /добавлять свои места/);
  assert.doesNotMatch(text, /[—–]/);
});
