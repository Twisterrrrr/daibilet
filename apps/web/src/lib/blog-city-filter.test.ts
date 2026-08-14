import assert from 'node:assert/strict';
import test from 'node:test';

import { filterBlogFeedByCity } from './blog-feed-rank.ts';
import { blogPostFilterCities, buildBlogCityFilterOptions } from './blog-meta.ts';

test('blogPostFilterCities expands multi label into tagged cities', () => {
  const hits = blogPostFilterCities({
    citySlug: 'multi',
    city: 'Москва и Петербург',
  });
  assert.deepEqual(
    hits.map((hit) => hit.value).sort(),
    ['moscow', 'saint-petersburg'],
  );
  assert.equal(
    hits.some((hit) => hit.label === 'Несколько городов' || hit.value === 'multi'),
    false,
  );
});

test('buildBlogCityFilterOptions never emits Несколько городов', () => {
  const options = buildBlogCityFilterOptions([
    { citySlug: 'moscow', city: 'Москва' },
    { citySlug: 'multi', city: 'Москва и Петербург' },
    { citySlug: 'saint-petersburg', city: 'Санкт-Петербург' },
    { citySlug: 'regions', city: 'Регионы' },
  ]);
  assert.equal(
    options.some((option) => option.value === 'multi' || option.label === 'Несколько городов'),
    false,
  );
  assert.ok(options.some((option) => option.value === 'moscow' && option.label === 'Москва'));
  assert.ok(
    options.some(
      (option) => option.value === 'saint-petersburg' && option.label === 'Санкт-Петербург',
    ),
  );
  assert.ok(options.some((option) => option.value === 'regions' && option.label === 'Регионы'));
});

test('filterBlogFeedByCity: multi-city post matches tagged cities', () => {
  const posts = [
    { slug: 'msk', citySlug: 'moscow', city: 'Москва' },
    {
      slug: 'myuzikly-teatr-novichok-msk-spb',
      citySlug: 'multi',
      city: 'Москва и Петербург',
    },
    { slug: 'spb', citySlug: 'saint-petersburg', city: 'Санкт-Петербург' },
  ];
  assert.deepEqual(
    filterBlogFeedByCity(posts, 'moscow').map((p) => p.slug),
    ['msk', 'myuzikly-teatr-novichok-msk-spb'],
  );
  assert.deepEqual(
    filterBlogFeedByCity(posts, 'saint-petersburg').map((p) => p.slug),
    ['myuzikly-teatr-novichok-msk-spb', 'spb'],
  );
  assert.deepEqual(filterBlogFeedByCity(posts, 'kazan').map((p) => p.slug), []);
});
