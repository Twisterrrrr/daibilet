import assert from 'node:assert/strict';
import test from 'node:test';

import { formatEventDescriptionHtml } from './event-description-format.ts';
import {
  buildMinimalEventDescription,
  cityPrepositional,
  describeFormat,
  formatRuDate,
  roundDurationMinutes,
} from './event-minimal-description.ts';

test('city prepositional case', () => {
  assert.equal(cityPrepositional('Москва'), 'Москве');
  assert.equal(cityPrepositional('Санкт-Петербург'), 'Санкт-Петербурге');
  assert.equal(cityPrepositional('Сортавала'), 'Сортавале');
  assert.equal(cityPrepositional('Бийск'), 'Бийске');
  assert.equal(cityPrepositional('Новосибирск'), 'Новосибирске');
  assert.equal(cityPrepositional('Сочи'), 'Сочи');
  assert.equal(cityPrepositional('Казань'), 'Казани');
  assert.equal(cityPrepositional('Нижний Новгород'), 'Нижнем Новгороде');
  assert.equal(cityPrepositional('Петропавловск-Камчатский'), 'Петропавловске-Камчатском');
  assert.equal(cityPrepositional('Апатиты'), 'Апатитах');
  assert.equal(cityPrepositional('Чебоксары'), 'Чебоксарах');
  assert.equal(cityPrepositional('Киров (Кировская область)'), 'Кирове (Кировская область)');
});

test('format detection uses category, subcategory and title', () => {
  assert.equal(describeFormat({ title: 'X', category: 'Концерты' }), 'концерт');
  assert.equal(describeFormat({ title: 'Экскурсия по городу' }), 'экскурсия');
  assert.equal(describeFormat({ title: 'Мастер-класс по керамике' }), 'мастер-класс');
  assert.equal(describeFormat({ title: 'Что-то неведомое' }), 'мероприятие');
});

test('ru date formatting and duration rounding', () => {
  assert.equal(formatRuDate('2026-11-13T08:00:00.000Z'), '13 ноября 2026');
  assert.equal(formatRuDate(null), null);
  assert.equal(roundDurationMinutes(67), 65);
  assert.equal(roundDurationMinutes(68), 70);
  assert.equal(roundDurationMinutes(null), null);
});

test('minimal description is factual, structured and renders to h3/ul/p', () => {
  const text = buildMinimalEventDescription({
    title: 'Айвазовский. Ожившие полотна',
    city: 'Москва',
    venue: 'Арт-пространство Люмьер Холл',
    venueAddress: 'Москва, ул. Пример, 1',
    category: 'Выставки',
    nextSession: '2026-12-11T10:00:00.000Z',
    futureSessions: 6,
    durationMin: 65,
    priceFromRub: 500,
    ageLimit: '0',
  });
  assert.match(text, /«Айвазовский\. Ожившие полотна»/);
  assert.match(text, /## Практическая информация/);
  assert.match(text, /- Ближайшая дата - 11 декабря 2026 \(всего 6 сеансов\)/);
  assert.match(text, /- Продолжительность - около 65 минут/);
  assert.match(text, /- Билеты - от 500 ₽/);
  assert.doesNotMatch(text, /Возрастное ограничение/);
  assert.doesNotMatch(text, /[\u2013\u2014\u2212]/);
  // city in the prepositional case, list items go one after another (no blank lines between them)
  assert.match(text, /в Москве/);
  assert.doesNotMatch(text, /\n- [^\n]*\n\n- /);

  const html = formatEventDescriptionHtml(text);
  assert.match(html, /<h3>Практическая информация<\/h3>/);
  assert.match(html, /<ul><li>Ближайшая дата/);
  assert.match(html, /<p>/);
  assert.doesNotMatch(html, /##/);
});

test('variants differ in opener so grouped cards are not identical', () => {
  const base = { title: 'Планетарий 1', city: 'Санкт-Петербург', category: 'Экскурсии' };
  const a = buildMinimalEventDescription(base, 0);
  const b = buildMinimalEventDescription(base, 1);
  assert.notEqual(a, b);
  assert.ok(a.length > 40 && b.length > 40);
});

test('title already containing the city is not duplicated; sub-100 prices hidden', () => {
  const text = buildMinimalEventDescription({
    title: 'Цирк шапито "Маска" в г. Бийске',
    city: 'Бийск',
    venue: 'Цирк Шапито Маска',
    priceFromRub: 12,
  });
  assert.doesNotMatch(text, /в Бийске/);
  assert.doesNotMatch(text, /Билеты - от 12/);
  assert.match(text, /Цирк шапито/);
});

test('provider dashes in title/venue collapse to a hyphen', () => {
  const text = buildMinimalEventDescription({
    title: 'Республика Фиуме — Концерт',
    city: 'Москва',
    venue: 'Клуб «Правда» – основная сцена',
    venueAddress: 'Москва, ул. Пример, 2',
  });
  assert.doesNotMatch(text, /[\u2013\u2014\u2212]/);
  assert.match(text, /Республика Фиуме - Концерт/);
  assert.match(text, /основная сцена/);
});

test('pre-quoted titles and venues are not double-quoted', () => {
  const text = buildMinimalEventDescription({
    title: '«Свои да Наши»',
    city: 'Кострома',
    venue: '«Свои да Наши»',
  });
  assert.doesNotMatch(text, /««/);
  assert.match(text, /«Свои да Наши»/);
});

test('empty title produces empty output', () => {
  assert.equal(buildMinimalEventDescription({ title: '   ' }), '');
});
