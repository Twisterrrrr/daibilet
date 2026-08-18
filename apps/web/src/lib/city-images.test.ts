import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cityHasDaytimePreview,
  resolveCityCardImage,
  resolveCityCardThumbImage,
  resolveCityImage,
} from './city-images.ts';

test('tolyatti and surgut use dedicated daytime city previews', () => {
  const tolyatti = { slug: 'tolyatti', name: 'Тольятти' };
  const surgut = { slug: 'surgut', name: 'Сургут' };

  assert.equal(cityHasDaytimePreview(tolyatti), true);
  assert.equal(cityHasDaytimePreview(surgut), true);

  assert.equal(resolveCityImage(tolyatti), '/images/cities/top/tolyatti.jpg');
  assert.equal(resolveCityImage(surgut), '/images/cities/top/surgut.jpg');

  assert.equal(resolveCityCardThumbImage(tolyatti), '/images/cities/top/tolyatti-thumb.jpg');
  assert.equal(resolveCityCardThumbImage(surgut), '/images/cities/top/surgut-thumb.jpg');

  assert.equal(resolveCityCardImage(tolyatti), '/images/cities/top/tolyatti-thumb.jpg');
  assert.equal(resolveCityCardImage(surgut), '/images/cities/top/surgut-thumb.jpg');
});
