import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveInstitutionScale,
  resolveLocationLogisticsGroup,
} from './venue-meta.ts';

test('resolveInstitutionScale maps kinds to museum / large_hall / intimate', () => {
  assert.equal(resolveInstitutionScale('museum', 'Эрмитаж'), 'museum');
  assert.equal(resolveInstitutionScale('theater', 'Мариинский театр'), 'large_hall');
  assert.equal(resolveInstitutionScale('concert_hall', 'Филармония'), 'large_hall');
  assert.equal(resolveInstitutionScale('bar', 'Рюмочная'), 'intimate');
  assert.equal(resolveInstitutionScale('club_bar_restaurant', 'Клуб'), 'intimate');
});

test('resolveLocationLogisticsGroup maps pier / bus / walking', () => {
  assert.equal(resolveLocationLogisticsGroup('pier', 'Причал'), 'pier');
  assert.equal(resolveLocationLogisticsGroup('bus', 'Место посадки'), 'bus');
  assert.equal(resolveLocationLogisticsGroup('park', 'Летний сад'), 'walking');
  assert.equal(resolveLocationLogisticsGroup('monument', 'Медный всадник'), 'walking');
  assert.equal(resolveLocationLogisticsGroup('outdoor_location', 'Дворцовая площадь'), 'walking');
});
