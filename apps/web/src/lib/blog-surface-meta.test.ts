import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blogListingCityBadgeLabel,
  blogSurfaceMeta,
  blogSurfaceMetaLine,
} from './blog-meta';

test('blogListingCityBadgeLabel fills Москва from slug when name is empty', () => {
  assert.equal(blogListingCityBadgeLabel('moscow', null), 'Москва');
  assert.equal(blogListingCityBadgeLabel('moscow', ''), 'Москва');
});

test('blogSurfaceMeta never leaves Город/Гид without a city value', () => {
  assert.deepEqual(blogSurfaceMeta({ tag: 'Город', citySlug: 'moscow', city: '' }), {
    typeLabel: 'Город',
    cityLabel: 'Москва',
  });
  assert.deepEqual(blogSurfaceMeta({ tag: 'Гид', citySlug: 'moscow' }), {
    typeLabel: 'Гид',
    cityLabel: 'Москва',
  });
  assert.deepEqual(
    blogSurfaceMeta({ tag: 'Город', city: 'Несколько городов', citySlug: 'multi' }),
    { typeLabel: null, cityLabel: null },
  );
  assert.deepEqual(
    blogSurfaceMeta({
      tag: 'Город',
      city: 'Несколько городов',
      citySlug: 'multi',
      citySlugs: ['moscow', 'saint-petersburg'],
    }),
    { typeLabel: 'Город', cityLabel: 'Москва и Санкт-Петербург' },
  );
  assert.deepEqual(blogSurfaceMeta({ tag: 'Гид' }), { typeLabel: null, cityLabel: null });
  assert.equal(blogSurfaceMetaLine({ tag: 'Город', citySlug: 'moscow' }), 'Город · Москва');
});
