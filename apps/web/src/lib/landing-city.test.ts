import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLandingCityName } from './landing-city.ts';

test('resolveLandingCityName covers destination cities beyond priority list', () => {
  assert.equal(resolveLandingCityName('krasnodar'), 'Краснодар');
  assert.equal(resolveLandingCityName('ufa'), 'Уфа');
  assert.equal(resolveLandingCityName('chelyabinsk'), 'Челябинск');
  assert.equal(resolveLandingCityName('vladivostok'), 'Владивосток');
  assert.equal(resolveLandingCityName('vladikavkaz'), 'Владикавказ');
  assert.equal(resolveLandingCityName('hanty-mansiysk'), 'Ханты-Мансийск');
  assert.equal(resolveLandingCityName('khanty-mansiysk'), 'Ханты-Мансийск');
  assert.equal(resolveLandingCityName('sortavala'), 'Сортавала');
  assert.equal(resolveLandingCityName('tolyatti'), 'Тольятти');
  assert.equal(resolveLandingCityName('surgut'), 'Сургут');
  assert.equal(resolveLandingCityName('novokuzneck'), 'Новокузнецк');
  assert.equal(resolveLandingCityName('moskva'), 'Москва');
  assert.equal(resolveLandingCityName('sankt-peterburg'), 'Санкт-Петербург');
  assert.equal(resolveLandingCityName('unknown-city'), null);
});
