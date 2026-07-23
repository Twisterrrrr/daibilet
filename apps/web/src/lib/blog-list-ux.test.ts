import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBlogListingCta } from './blog-listing-links';
import { resolveBlogTopics, parseBlogTopicParam } from './blog-topics';
import { resolveBlogCardDateLabel, splitBlogListingHero, staticBlogCards } from './blog-utils';

test('blog topics: standup / kids / routes / concerts', () => {
  assert.deepEqual(resolveBlogTopics({ slug: 'spb-stendap-gid', title: 'Стендап' }), ['standup']);
  assert.ok(resolveBlogTopics({ slug: 'kuda-poyti-s-detmi', tag: 'Семья' }).includes('kids'));
  assert.ok(
    resolveBlogTopics({
      slug: 'moscow-2-dnya-samostoyatelno-marshrut',
      title: 'маршрут',
    }).includes('routes'),
  );
  assert.ok(
    resolveBlogTopics({ slug: 'kak-vybrat-koncert', title: 'Как выбрать концерт' }).includes(
      'concerts',
    ),
  );
  assert.equal(parseBlogTopicParam('standup'), 'standup');
  assert.equal(parseBlogTopicParam('nope'), 'all');
});

test('blog listing CTA prefers schedule label', () => {
  const cta = resolveBlogListingCta({
    slug: 'spb-stendap-gid',
    title: 'Стендап в Петербурге',
    city: 'Санкт-Петербург',
    citySlug: 'saint-petersburg',
  });
  assert.ok(cta);
  assert.equal(cta?.label, 'Смотреть расписание');
  assert.ok(cta?.href);
});

test('static cards expose date + topics + searchText', () => {
  const cards = staticBlogCards();
  const moscow = cards.find((c) => c.slug === 'moscow-2-dnya-samostoyatelno-marshrut');
  assert.ok(moscow);
  assert.ok(moscow?.editorialDate);
  assert.equal(resolveBlogCardDateLabel(moscow!), moscow?.editorialDate);
  assert.ok(moscow?.topics?.includes('routes'));
  assert.ok(moscow?.searchText?.includes('москв'));
});

test('splitBlogListingHero: featured out of feed, fallback latest', () => {
  const cards = staticBlogCards();
  assert.ok(cards.length >= 3);

  const fallback = splitBlogListingHero(cards);
  assert.equal(fallback.featured?.slug, cards[0]?.slug);
  assert.ok(!fallback.feed.some((p) => p.slug === fallback.featured?.slug));
  assert.ok(fallback.hot.length >= 1);
  assert.ok(fallback.hot.length <= 4);

  const flaggedSlug = cards[2]!.slug;
  const withFlag = cards.map((c, i) => ({ ...c, isFeatured: i === 2 }));
  const split = splitBlogListingHero(withFlag);
  assert.equal(split.featured?.slug, flaggedSlug);
  assert.ok(!split.feed.some((p) => p.slug === flaggedSlug));
  assert.ok(!split.hot.some((p) => p.slug === flaggedSlug));
});
