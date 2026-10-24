import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEventsCatalogHeading } from './events-catalog-heading.ts';

test('hub without city: base title + hint subtitle', () => {
  const h = buildEventsCatalogHeading({});
  assert.equal(h.title, 'Афиша событий');
  assert.equal(h.filtered, false);
  assert.match(h.subtitle, /город/i);
  assert.ok(!h.title.includes('\u2014') && !h.subtitle.includes('\u2014'));
});

test('category + city: city is in H1, no marketing subtitle', () => {
  const h = buildEventsCatalogHeading({
    category: 'Экскурсии',
    cityName: 'Санкт-Петербург',
  });
  assert.equal(h.title, 'Экскурсии в Санкт-Петербурге');
  assert.equal(h.subtitle, '');
  assert.equal(h.filtered, true);
  assert.ok(!h.title.startsWith('События:'));
});

test('category + city + date: date stays out of H1 (chips own it)', () => {
  const h = buildEventsCatalogHeading({
    category: 'Экскурсии',
    cityName: 'Санкт-Петербург',
    dateLabel: 'Сегодня',
  });
  assert.equal(h.title, 'Экскурсии в Санкт-Петербурге');
  assert.equal(h.subtitle, '');
});

test('category alone', () => {
  const h = buildEventsCatalogHeading({ category: 'Экскурсии' });
  assert.equal(h.title, 'Экскурсии');
  assert.equal(h.subtitle, '');
});

test('search keeps query in H1 without subtitle', () => {
  const h = buildEventsCatalogHeading({ q: 'эрмитаж', cityName: 'Санкт-Петербург' });
  assert.equal(h.title, 'Результаты поиска: «эрмитаж»');
  assert.equal(h.subtitle, '');
});
