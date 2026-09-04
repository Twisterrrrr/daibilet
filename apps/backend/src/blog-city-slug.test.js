import assert from 'node:assert/strict';
import test from 'node:test';

import { blogCityDisplayName } from './blog-city-slug.js';

test('blogCityDisplayName: slug fills missing City join', () => {
  assert.equal(blogCityDisplayName('moscow', null), 'Москва');
  assert.equal(blogCityDisplayName('msk', ''), 'Москва');
  assert.equal(blogCityDisplayName('saint-petersburg', null), 'Санкт-Петербург');
});

test('blogCityDisplayName: keeps concrete fallback, drops pseudo labels', () => {
  assert.equal(blogCityDisplayName('multi', 'Москва и Петербург'), 'Москва и Петербург');
  assert.equal(blogCityDisplayName('multi', 'Несколько городов'), null);
  assert.equal(blogCityDisplayName('regions', 'Регионы'), null);
  assert.equal(blogCityDisplayName(null, null), null);
});
