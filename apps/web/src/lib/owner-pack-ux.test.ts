import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeBlogFeedCursor, encodeBlogFeedCursor, paginateBlogFeedByCursor } from './blog-cursor.ts';
import { filterBlogFeedByCity, rankBlogFeedByCity, resolveBlogRankCitySlug } from './blog-feed-rank.ts';
import { groupPodborkiByCategory } from './podborki-categories.ts';

test('filterBlogFeedByCity: empty for city without published posts', () => {
  const posts = [
    { slug: 'a', citySlug: 'moscow' },
    { slug: 'b', citySlug: 'saint-petersburg' },
  ];
  const local = filterBlogFeedByCity(posts, 'kaliningrad');
  assert.equal(local.length, 0);
});

test('filterBlogFeedByCity: NN aliases and Russian name resolve to article citySlug', () => {
  const posts = [
    { slug: 'a', citySlug: 'nizhny-novgorod' },
    { slug: 'b', citySlug: 'nizhny-novgorod' },
    { slug: 'c', citySlug: 'nizhny-novgorod' },
    { slug: 'd', citySlug: 'moscow' },
  ];
  assert.equal(filterBlogFeedByCity(posts, 'nizhny-novgorod').length, 3);
  assert.equal(filterBlogFeedByCity(posts, 'nizhniy-novgorod').length, 3);
  assert.equal(filterBlogFeedByCity(posts, 'Нижний Новгород').length, 3);
});

test('resolveBlogRankCitySlug: display name without destination → canonical NN slug', () => {
  assert.equal(resolveBlogRankCitySlug('Нижний Новгород', null, null, null), 'nizhny-novgorod');
  assert.equal(
    resolveBlogRankCitySlug('Нижний Новгород', 'nizhniy-novgorod', null, 'Нижний Новгород'),
    'nizhny-novgorod',
  );
});

test('rankBlogFeedByCity: city first then others (no drop)', () => {
  const ranked = rankBlogFeedByCity(
    [
      { slug: 'a', title: 'A', citySlug: 'moscow', publishedAt: '2026-01-01' },
      { slug: 'b', title: 'B', citySlug: 'kazan', publishedAt: '2026-06-01' },
      { slug: 'c', title: 'C', citySlug: 'multi', publishedAt: '2026-03-01' },
    ],
    'kazan',
  );
  assert.equal(ranked[0]?.slug, 'b');
  assert.equal(ranked[1]?.slug, 'c');
  assert.equal(ranked[2]?.slug, 'a');
  assert.equal(ranked.length, 3);
});

test('paginateBlogFeedByCursor: stable next page', () => {
  const posts = [
    { slug: 'one', publishedAt: '2026-06-03' },
    { slug: 'two', publishedAt: '2026-06-02' },
    { slug: 'three', publishedAt: '2026-06-01' },
  ];
  const first = paginateBlogFeedByCursor(posts, { limit: 2 });
  assert.deepEqual(
    first.items.map((p) => p.slug),
    ['one', 'two'],
  );
  assert.ok(first.nextCursor);
  const decoded = decodeBlogFeedCursor(first.nextCursor);
  assert.equal(decoded?.slug, 'two');
  const second = paginateBlogFeedByCursor(posts, { cursor: first.nextCursor, limit: 2 });
  assert.deepEqual(
    second.items.map((p) => p.slug),
    ['three'],
  );
  assert.equal(second.nextCursor, null);
  assert.ok(encodeBlogFeedCursor({ publishedAt: 'x', slug: 'y' }).length > 4);
});

test('groupPodborkiByCategory: sense blocks', () => {
  const sections = groupPodborkiByCategory([
    { slug: 'river-cruises', title: 'Речные', events: 10 },
    { slug: 'family-kids', title: 'Семьям', events: 5 },
    { slug: 'new-year', title: 'НГ', events: 2 },
  ]);
  assert.equal(sections.length, 3);
  assert.equal(sections[0]?.slug, 'by-type');
  assert.equal(sections[1]?.slug, 'for-whom');
  assert.equal(sections[2]?.slug, 'seasonal');
});
