import assert from 'node:assert/strict';
import test from 'node:test';

import { planBlogFeedPromos } from './blog-feed-promo.ts';
import type { BlogSidebarPromoDto } from './blog-sidebar-promo.ts';

const basePromo: BlogSidebarPromoDto = {
  cityName: 'Москва',
  citySlug: 'moscow',
  href: '/events?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
  priceFrom: 900,
  weekendCount: 48,
  eventsCount: 900,
  upcomingTitles: ['Пианиссимо', 'Сапрыкин'],
  imageUrl: '/images/cities/top/moscow.jpg',
  chips: [
    { label: 'Концерты', href: '/kontserty/moscow' },
    { label: 'Экскурсии', href: '/ekskursii/moscow' },
  ],
};

test('planBlogFeedPromos: empty without promo or blocks', () => {
  assert.deepEqual(planBlogFeedPromos({ blockCount: 0, promo: basePromo, seed: 1 }), []);
  assert.deepEqual(planBlogFeedPromos({ blockCount: 2, promo: null, seed: 1 }), []);
});

test('planBlogFeedPromos: usually one slot after first block', () => {
  const plans = planBlogFeedPromos({ blockCount: 2, promo: basePromo, seed: 3 });
  assert.equal(plans.length, 1);
  assert.equal(plans[0]?.afterBlockIndex, 0);
  assert.ok(['city', 'landing', 'event'].includes(plans[0]!.kind));
  assert.ok(['strip', 'strip-dense', 'overlay', 'split'].includes(plans[0]!.layout));
});

test('planBlogFeedPromos: second slot only with enough blocks and seed%4===0', () => {
  const sparse = planBlogFeedPromos({ blockCount: 3, promo: basePromo, seed: 1 });
  assert.equal(sparse.length, 1);

  const denser = planBlogFeedPromos({ blockCount: 3, promo: basePromo, seed: 4 });
  assert.equal(denser.length, 2);
  assert.equal(denser[0]?.afterBlockIndex, 0);
  assert.equal(denser[1]?.afterBlockIndex, 2);
});
