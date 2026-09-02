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
