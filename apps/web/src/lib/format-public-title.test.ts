import assert from 'node:assert/strict';
import test from 'node:test';

import { formatPublicTitle, isMostlyUppercaseTitle } from './format-public-title.ts';

test('isMostlyUppercaseTitle detects supplier CAPS', () => {
  assert.equal(isMostlyUppercaseTitle('КОНЦЕРТ ГРУППЫ SAHALIN'), true);
  assert.equal(isMostlyUppercaseTitle('Концерт группы Sahalin'), false);
  assert.equal(isMostlyUppercaseTitle('VIP'), false);
});

test('formatPublicTitle soft-cases ALL CAPS, keeps mixed titles', () => {
  assert.equal(formatPublicTitle('КОНЦЕРТ ГРУППЫ SAHALIN'), 'Концерт Группы Sahalin');
  assert.equal(formatPublicTitle('ЭКСКУРСИЯ ПО НЕВСКОМУ'), 'Экскурсия по Невскому');
  assert.equal(formatPublicTitle('Речная прогулка по Неве'), 'Речная прогулка по Неве');
  assert.equal(formatPublicTitle(''), '');
  assert.equal(formatPublicTitle(null), '');
});

test('formatPublicTitle strips emoji and trailing date-time crumbs', () => {
  assert.equal(
    formatPublicTitle('🏴‍☠️PRO Stand-UP отборный концерт ТЕЛЕ и VK комиков'),
    'PRO Stand-UP отборный концерт ТЕЛЕ и VK комиков',
  );
  assert.equal(formatPublicTitle('Грязный стендап / 11 сентября / 23:00'), 'Грязный стендап');
  assert.equal(formatPublicTitle('Большой стендап / 23 октября / 21:30'), 'Большой стендап');
});

test('formatPublicTitle strips schedule parentheses, keeps creative ones', () => {
  assert.equal(
    formatPublicTitle(
      'Рождественский гала-концерт солистов балета. С обзорной экскурсией по Дворцу (начало экскурсии 18:45, начало балета 20:00)',
    ),
    'Рождественский гала-концерт солистов балета. С обзорной экскурсией по Дворцу',
  );
  assert.equal(
    formatPublicTitle('"Он не придет. Кажется" Спектакль в духе Беккета'),
    '"Он не придет. Кажется" Спектакль в духе Беккета',
  );
});
