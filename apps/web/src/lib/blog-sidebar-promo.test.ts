import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicCityPageDto } from '@daibilet/contracts/public';

import {
  buildBlogSidebarPromoFromCityPage,
  isWeekendStartsAt,
  lookupBlogSidebarPromo,
  type BlogSidebarPromoDto,
} from './blog-sidebar-promo.ts';

test('isWeekendStartsAt: sat/sun only', () => {
  assert.equal(isWeekendStartsAt('2026-07-25T12:00:00+03:00'), true); // Sat
  assert.equal(isWeekendStartsAt('2026-07-26T12:00:00+03:00'), true); // Sun
  assert.equal(isWeekendStartsAt('2026-07-24T12:00:00+03:00'), false); // Fri
  assert.equal(isWeekendStartsAt(null), false);
});

test('buildBlogSidebarPromoFromCityPage: price, titles, chips, image', () => {
  const page = {
    generatedAt: new Date().toISOString(),
    city: {
      id: 'c1',
      slug: 'moscow',
      sourceSlug: 'moscow',
      name: 'Москва',
      title: 'Москва',
      type: 'city',
      events: 3,
      venues: 2,
      categories: { Стендап: 5, Концерты: 3 },
    },
    sessions: [
      {
        id: 'e1',
        title: 'Пианиссимо',
        city: 'Москва',
        destination: 'Москва',
        destinationType: 'city',
        venue: 'Зал',
        venueKind: 'hall',
        category: 'Концерты',
        tags: [],
        startsAt: '2026-07-25T19:00:00+03:00',
        dateLabel: '25 июля',
        timeLabel: '19:00',
        timeBucket: 'evening',
        priceFrom: 1200,
        imageUrl: 'https://cdn.example.com/cover1.jpg',
      },
      {
        id: 'e2',
        title: 'Сапрыкин',
        city: 'Москва',
        destination: 'Москва',
        destinationType: 'city',
        venue: 'Клуб',
        venueKind: 'club',
        category: 'Стендап',
        tags: [],
        startsAt: '2026-07-24T20:00:00+03:00',
        dateLabel: '24 июля',
        timeLabel: '20:00',
        timeBucket: 'evening',
        priceFrom: 900,
        imageUrl: '/images/cities/moscow.png',
      },
    ],
    venues: [],
    landings: [
      {
        slug: 'standup',
        title: 'Стендап',
        subtitle: '',
        chips: ['Стендап'],
        events: 12,
        venues: 3,
        strength: 'ready',
      },
    ],
    stats: { events: 2, venues: 2, categories: 2, priceFrom: 900 },
  } as unknown as PublicCityPageDto;

  const promo = buildBlogSidebarPromoFromCityPage(page);
  assert.ok(promo);
  assert.equal(promo!.cityName, 'Москва');
  assert.equal(promo!.citySlug, 'moscow');
  assert.equal(promo!.priceFrom, 900);
  assert.equal(promo!.weekendCount, 1);
  assert.deepEqual(promo!.upcomingTitles, ['Пианиссимо', 'Сапрыкин']);
  assert.equal(promo!.imageUrl, 'https://cdn.example.com/cover1.jpg');
  assert.ok(promo!.href.includes('/events'));
  assert.ok(promo!.href.includes('city='));
  assert.ok(promo!.chips.length >= 1);
  assert.equal(promo!.chips[0]!.label, 'Стендап');
});

test('lookupBlogSidebarPromo: name and slug keys', () => {
  const sample: BlogSidebarPromoDto = {
    cityName: 'Москва',
    citySlug: 'moscow',
    href: '/events?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
    priceFrom: 500,
    weekendCount: 2,
    eventsCount: 10,
    upcomingTitles: ['A'],
    imageUrl: null,
    chips: [],
  };
  const map = {
    москва: sample,
    moscow: sample,
  };
  assert.equal(lookupBlogSidebarPromo(map, ['Москва'])?.citySlug, 'moscow');
  assert.equal(lookupBlogSidebarPromo(map, ['moscow'])?.priceFrom, 500);
  assert.equal(lookupBlogSidebarPromo(map, ['unknown']), null);
});
