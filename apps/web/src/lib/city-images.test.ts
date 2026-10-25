import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityHasDaytimePreview,
  resolveCityCardImage,
  resolveCityCardThumbImage,
  resolveCityImage,
} from './city-images.ts';

test('tolyatti surgut novokuznetsk and khanty use dedicated daytime city previews', () => {
  const tolyatti = { slug: 'tolyatti', name: 'Тольятти' };
  const surgut = { slug: 'surgut', name: 'Сургут' };
  const novokuznetsk = { slug: 'novokuznetsk', name: 'Новокузнецк' };
  const khanty = { slug: 'hanty-mansiysk', name: 'Ханты-Мансийск' };
  const khantyAlias = { slug: 'khanty-mansiysk', name: 'Ханты-Мансийск' };

  assert.equal(cityHasDaytimePreview(tolyatti), true);
  assert.equal(cityHasDaytimePreview(surgut), true);
  assert.equal(cityHasDaytimePreview(novokuznetsk), true);
  assert.equal(cityHasDaytimePreview(khanty), true);
  assert.equal(cityHasDaytimePreview(khantyAlias), true);

  assert.equal(resolveCityImage(tolyatti), '/images/cities/top/tolyatti.jpg');
  assert.equal(resolveCityImage(surgut), '/images/cities/top/surgut.jpg');
  assert.equal(resolveCityImage(novokuznetsk), '/images/cities/top/novokuznetsk.jpg');
  assert.equal(resolveCityImage(khanty), '/images/cities/top/hanty-mansiysk.jpg');
  assert.equal(resolveCityImage(khantyAlias), '/images/cities/top/hanty-mansiysk.jpg');
});
