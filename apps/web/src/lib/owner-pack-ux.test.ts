import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeBlogFeedCursor, encodeBlogFeedCursor, paginateBlogFeedByCursor } from './blog-cursor.ts';
import { filterBlogFeedByCity, rankBlogFeedByCity, resolveBlogRankCitySlug } from './blog-feed-rank.ts';
import { groupPodborkiByCategory } from './podborki-categories.ts';
import { pickPodborkiFeatured, pickPodborkiTrending } from './podborki-hero.ts';
import { podborkiBentoSpan } from './podborki-bento.ts';
import { filterPodborkiByMood, landingMatchesMood } from './podborki-moods.ts';

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

test('groupPodborkiByCategory: Moscow City Day lifts seasonal to front', () => {
  const sections = groupPodborkiByCategory([
    { slug: 'moscow-museums', title: 'Музеи и выставки в Москве', events: 40 },
    { slug: 'river-cruises', title: 'Речные', events: 20 },
    { slug: 'moscow-city-day', title: 'День города в Москве', events: 11 },
  ]);
  assert.equal(sections[0]?.slug, 'seasonal');
  assert.equal(sections[0]?.items[0]?.slug, 'moscow-city-day');
  assert.ok(sections.some((section) => section.slug === 'by-type'));
});

test('pickPodborkiFeatured prefers Moscow City Day over museums and river', () => {
  const featured = pickPodborkiFeatured([
    { slug: 'moscow-museums', title: 'Музеи', events: 61, layoutVariant: 'HERO_FEATURED' },
    { slug: 'river-cruises', title: 'Речные', events: 80 },
    { slug: 'moscow-city-day', title: 'День города в Москве', events: 11 },
  ]);
  assert.equal(featured?.slug, 'moscow-city-day');
  const trending = pickPodborkiTrending(
    [
      { slug: 'moscow-museums', title: 'Музеи', events: 61 },
      { slug: 'standup', title: 'Стендап', events: 40 },
      { slug: 'bus-tours', title: 'Автобус', events: 20 },
      { slug: 'family-kids', title: 'Семьям', events: 15 },
      { slug: 'moscow-dinner-boat', title: 'Ужин', events: 10 },
      { slug: 'new-year', title: 'НГ', events: 8 },
    ],
    'moscow-city-day',
    5,
  );
  assert.equal(trending.some((item) => item.slug === 'moscow-museums'), false);
  assert.ok(trending.length >= 3 && trending.length <= 5);
});

test('seasonal-first category must not starve hero: full city pool still yields multi trend', () => {
  const cityItems = [
    { slug: 'moscow-city-day', title: 'День города', events: 13, categorySlug: 'seasonal' },
    { slug: 'new-year', title: 'Новый год', events: 5, categorySlug: 'seasonal' },
    { slug: 'river-cruises', title: 'Речные', events: 80, categorySlug: 'by-type' },
    { slug: 'standup', title: 'Стендап', events: 40, categorySlug: 'by-type' },
    { slug: 'bus-tours', title: 'Автобус', events: 20, categorySlug: 'by-type' },
    { slug: 'family-kids', title: 'Семьям', events: 15, categorySlug: 'for-whom' },
  ];
  const sections = groupPodborkiByCategory(cityItems);
  assert.equal(sections[0]?.slug, 'seasonal');
  // Bug repro: filtering hero to seasonal alone left 1 trend + empty grid.
  const seasonalOnly = cityItems.filter((item) => item.categorySlug === 'seasonal');
  assert.equal(pickPodborkiTrending(seasonalOnly, 'moscow-city-day', 5).length, 1);
  // Fix: hero from full city catalog.
  const featured = pickPodborkiFeatured(cityItems);
  const trending = pickPodborkiTrending(cityItems, featured?.slug, 5);
  assert.equal(featured?.slug, 'moscow-city-day');
  assert.ok(trending.length >= 3);
  const gridAll = cityItems.filter((item) => item.slug !== featured?.slug);
  assert.ok(gridAll.length >= 4);
});

test('podborkiBentoSpan: river/city-day wide, standup narrow', () => {
  assert.equal(podborkiBentoSpan({ slug: 'river-cruises', events: 10 }), 2);
  assert.equal(podborkiBentoSpan({ slug: 'moscow-city-day', events: 5 }), 2);
  assert.equal(podborkiBentoSpan({ slug: 'standup', events: 40 }), 1);
  assert.equal(podborkiBentoSpan({ slug: 'new-year', categorySlug: 'seasonal' }), 2);
});

test('pickPodborkiFeatured skips moscow-city-day off season', () => {
  const items = [
    { slug: 'moscow-museums', title: 'Музеи', events: 61, layoutVariant: 'HERO_FEATURED' },
    { slug: 'river-cruises', title: 'Речные', events: 80 },
    { slug: 'moscow-city-day', title: 'День города в Москве', events: 11 },
  ];
  const midWinter = new Date('2026-02-10T12:00:00+03:00');
  assert.equal(pickPodborkiFeatured(items, midWinter)?.slug, 'river-cruises');
  const midAugust = new Date('2026-08-14T12:00:00+03:00');
  assert.equal(pickPodborkiFeatured(items, midAugust)?.slug, 'moscow-city-day');
});

test('landingMatchesMood: romantic / kids / budget heuristics', () => {
  assert.equal(landingMatchesMood({ slug: 'river-cruises', title: 'Речные' }, 'romantic'), true);
  assert.equal(landingMatchesMood({ slug: 'standup', title: 'Стендап' }, 'romantic'), false);
  assert.equal(landingMatchesMood({ slug: 'family-kids', title: 'С детьми' }, 'kids'), true);
  assert.equal(landingMatchesMood({ slug: 'walking-tours', title: 'Пешком', priceFrom: 0 }, 'budget'), true);
  assert.equal(landingMatchesMood({ slug: 'moscow-museums', title: 'Музеи' }, 'rain'), true);
});

test('filterPodborkiByMood: null mood returns all', () => {
  const items = [
    { slug: 'standup', title: 'Стендап', events: 3 },
    { slug: 'family-kids', title: 'Семья', events: 2 },
  ];
  assert.equal(filterPodborkiByMood(items, null).length, 2);
  assert.equal(filterPodborkiByMood(items, 'kids').map((i) => i.slug).join(','), 'family-kids');
  assert.equal(filterPodborkiByMood(items, 'friends').map((i) => i.slug).join(','), 'standup');
});
