import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findLandingRule,
  matchesLandingRule,
  matchingLandingSlugs,
} from './landing-rules.js';

test('matches a focused river landing and rejects unrelated transport', () => {
  const river = findLandingRule('river-walks');
  assert.ok(river);
  assert.equal(matchesLandingRule({
    title: 'Прогулка на теплоходе по Неве',
    category: 'Экскурсии',
    tags: ['Водные экскурсии'],
    city: 'Санкт-Петербург',
  }, river), true);
  assert.equal(matchesLandingRule({
    title: 'Автобусная экскурсия по центру',
    category: 'Экскурсии',
    tags: [],
    city: 'Санкт-Петербург',
  }, river), false);
});

test('keeps city and venue landing constraints strict', () => {
  assert.deepEqual(
    matchingLandingSlugs({
      title: 'Ночная прогулка к разводным мостам',
      city: 'Москва',
      tags: ['Разводные мосты'],
    }).includes('bridges-night'),
    false,
  );
  assert.equal(
    matchingLandingSlugs({ title: 'Музыка под звездами', venue: 'Планетарий 1' })
      .includes('planetarium'),
    true,
  );
});
