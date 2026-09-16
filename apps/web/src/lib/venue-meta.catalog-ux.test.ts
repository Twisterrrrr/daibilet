import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveInstitutionScale,
  resolveLocationLogisticsGroup,
  resolveVenueAboutHeading,
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

test('resolveVenueAboutHeading follows type and club name hints', () => {
  assert.equal(resolveVenueAboutHeading('club_bar_restaurant', 'Сцена'), 'О клубе');
  assert.equal(resolveVenueAboutHeading('bar', 'Джаз-клуб Игоря Бутмана'), 'О клубе');
  assert.equal(resolveVenueAboutHeading('other', 'Джаз-клуб Игоря Бутмана'), 'О клубе');
  assert.equal(resolveVenueAboutHeading('museum', 'Эрмитаж'), 'О музее');
  assert.equal(resolveVenueAboutHeading('theater', 'БДТ'), 'О театре');
  assert.equal(resolveVenueAboutHeading('bar', 'Рюмочная'), 'О баре');
  assert.equal(resolveVenueAboutHeading('park', 'Летний сад'), 'О парке');
});
