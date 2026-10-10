import assert from 'node:assert/strict';
import test from 'node:test';

import { buildVenueSeoTitle, buildVenueSeoTitleCore, resolveVenueSeoTitle } from './venue-seo.ts';

const MONTHS_WITH_DATE = /\d{1,2}\s*(?:янв|фев|мар|апр|мая|июн|июл|авг|сен|окт|ноя|дек)/i;

test('venue title has no «на сегодня» and no live date', () => {
  const title = buildVenueSeoTitle(
    'ГАПОУ "Нижнекамский музыкальный колледж имени Салиха Сайдашева"',
    'Нижнекамск',
  );
  assert.match(title, /: афиша и билеты \| Дайбилет$/);
  assert.ok(!/на сегодня/i.test(title));
  assert.ok(!MONTHS_WITH_DATE.test(title));
});

test('venue title appends declined city when city not in name', () => {
  const title = buildVenueSeoTitle('Концертный зал Арбат', 'Москва');
  assert.equal(title, 'Концертный зал Арбат в Москве: афиша и билеты | Дайбилет');
});

test('venue title does not duplicate city already present in name', () => {
  const title = buildVenueSeoTitle('Москва-Сити Экспо', 'Москва');
  assert.equal(title, 'Москва-Сити Экспо: афиша и билеты | Дайбилет');
});

test('venue title does not duplicate a declined city already in name', () => {
  const title = buildVenueSeoTitle('Концертный зал в Москве', 'Москва');
  assert.equal(title, 'Концертный зал в Москве: афиша и билеты | Дайбилет');
});

test('venue title core strips brand suffix for layout template', () => {
  const core = buildVenueSeoTitleCore('Концертный зал Арбат', 'Москва');
  assert.equal(core, 'Концертный зал Арбат в Москве: афиша и билеты');
});

test('resolve keeps explicit CMS seoTitle with «на сегодня»', () => {
  const resolved = resolveVenueSeoTitle({
    name: 'Концертный зал',
    seoTitle: 'Концертный зал: афиша и билеты на сегодня, 8 октября',
    city: 'Казань',
  });
  assert.match(resolved.full, /на сегодня, 8 октября/);
  assert.match(resolved.full, /\| Дайбилет$/);
});

test('resolve falls back to neutral template without freshness', () => {
  const resolved = resolveVenueSeoTitle({
    name: 'Концертный зал Арбат',
    seoTitle: 'Концертный зал Арбат — расписание',
    city: 'Москва',
  });
  assert.equal(resolved.full, 'Концертный зал Арбат в Москве: афиша и билеты | Дайбилет');
  assert.ok(!/на сегодня/i.test(resolved.full));
});