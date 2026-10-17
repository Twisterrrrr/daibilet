import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasSessionDateLines,
  stripSessionDateLines,
} from './event-description-session-lines.ts';

test('drops generated nearest-session list items but keeps other facts', () => {
  const raw = [
    '## Практическая информация',
    '',
    '- Место - «Клуб», Москва',
    '- Ближайшая дата - 18 октября 2026, 03:00 (всего 3 сеанса)',
    '- Билеты - от 1 500 ₽',
  ].join('\n');

  const cleaned = stripSessionDateLines(raw);
  assert.doesNotMatch(cleaned, /Ближайшая дата/);
  assert.doesNotMatch(cleaned, /03:00/);
  assert.match(cleaned, /- Место - «Клуб», Москва/);
  assert.match(cleaned, /- Билеты - от 1 500 ₽/);
  assert.equal(hasSessionDateLines(cleaned), false);
});

test('drops inline next-session sentences', () => {
  const raw =
    '## Организационные детали\n\nСледующий сеанс - 18 октября, 03:00. Место - ТЦ «АУРА», Новосибирск. Билеты от 600 ₽.';

  const cleaned = stripSessionDateLines(raw);
  assert.doesNotMatch(cleaned, /Следующий сеанс/);
  assert.doesNotMatch(cleaned, /03:00/);
  assert.match(cleaned, /Место - ТЦ «АУРА», Новосибирск/);
  assert.match(cleaned, /Билеты от 600 ₽/);
});

test('drops legacy "Когда:" date lead-ins and empty sections', () => {
  const raw = [
    'Когда: 13 ноября 2026, 17:00. Концерт «X» в Москве.',
    '',
    '## Даты и билеты',
    '',
    'Ближайшие даты: 13 ноября 2026, 17:00; 14 ноября 2026, 17:00.',
  ].join('\n');

  const cleaned = stripSessionDateLines(raw);
  assert.doesNotMatch(cleaned, /Когда:/);
  assert.doesNotMatch(cleaned, /Ближайшие даты/);
  assert.doesNotMatch(cleaned, /## Даты и билеты/);
  assert.match(cleaned, /Концерт «X» в Москве/);
});

test('keeps ordinary provider copy about sessions', () => {
  const raw =
    'Экскурсия идёт каждый день, сеансы начинаются по расписанию. Билеты продаются онлайн.';
  assert.equal(stripSessionDateLines(raw), raw);
  assert.equal(hasSessionDateLines(raw), false);
});

test('strip is idempotent and does not introduce long dashes', () => {
  const raw =
    '## Практическая информация\n\n- Ближайший сеанс: 18 октября, 03:00\n- Цена - от 500 ₽';
  const once = stripSessionDateLines(raw);
  const twice = stripSessionDateLines(once);
  assert.equal(twice, once);
  assert.doesNotMatch(once, /[\u2013\u2014\u2212]/);
});

test('blank input stays blank', () => {
  assert.equal(stripSessionDateLines(''), '');
  assert.equal(stripSessionDateLines(null), '');
  assert.equal(hasSessionDateLines(''), false);
});

test('keeps a clean period when the session followed a colon', () => {
  assert.equal(
    stripSessionDateLines(
      'Водопады и мраморный каньон в Санкт-Петербурге: ближайший сеанс - 18 октября 2026, 04:00.',
    ),
    'Водопады и мраморный каньон в Санкт-Петербурге.',
  );
});

