import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEventsCatalogHeading } from './events-catalog-heading.ts';

test('hub without city: base title', () => {
  const h = buildEventsCatalogHeading({});
  assert.equal(h.title, 'Афиша событий');
  assert.equal(h.filtered, false);
  assert.ok(!h.title.includes('\u2014') && !h.subtitle.includes('\u2014'));
});

test('category + city: city is in H1, not a toothless label', () => {
  const h = buildEventsCatalogHeading({
    category: 'Экскурсии',
    cityName: 'Санкт-Петербург',
  });
  assert.equal(h.title, 'Экскурсии в Санкт-Петербурге');
  assert.equal(h.filtered, true);
  assert.ok(!h.subtitle.includes('в категории'));
  assert.ok(!h.title.startsWith('События:'));
});

test('category + city + date lands in H1', () => {
  const h = buildEventsCatalogHeading({
    category: 'Экскурсии',
    cityName: 'Санкт-Петербург',
    dateLabel: 'Сегодня',
  });
  assert.equal(h.title, 'Экскурсии в Санкт-Петербурге, Сегодня');
});

test('category alone', () => {
  const h = buildEventsCatalogHeading({ category: 'Экскурсии' });
  assert.equal(h.title, 'Экскурсии');
  assert.match(h.subtitle, /город/i);
});

test('search keeps query in H1', () => {
  const h = buildEventsCatalogHeading({ q: 'эрмитаж', cityName: 'Санкт-Петербург' });
  assert.equal(h.title, 'Результаты поиска: «эрмитаж»');
  assert.match(h.subtitle, /в Санкт-Петербурге/);
});
