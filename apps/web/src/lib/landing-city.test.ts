import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLandingCityName } from './landing-city.ts';

test('resolveLandingCityName covers destination cities beyond priority list', () => {
  assert.equal(resolveLandingCityName('krasnodar'), 'Краснодар');
  assert.equal(resolveLandingCityName('ufa'), 'Уфа');
  assert.equal(resolveLandingCityName('chelyabinsk'), 'Челябинск');
  assert.equal(resolveLandingCityName('vladivostok'), 'Владивосток');
  assert.equal(resolveLandingCityName('moskva'), 'Москва');
  assert.equal(resolveLandingCityName('sankt-peterburg'), 'Санкт-Петербург');
  assert.equal(resolveLandingCityName('unknown-city'), null);
});
