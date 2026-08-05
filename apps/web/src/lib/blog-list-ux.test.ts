import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBlogListingCta } from './blog-listing-links';
import { stripColumnBodyChrome, stripColumnMetaPrefix } from './blog-meta';
import { resolveBlogTopics, parseBlogTopicParam } from './blog-topics';
import {
  expandListingExcerpt,
  expandLargeListingCopy,
  resolveBlogCardDateLabel,
  splitBlogListingHero,
  staticBlogCards,
} from './blog-utils';

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

test('blog listing CTA uses events label', () => {
  const cta = resolveBlogListingCta({
    slug: 'spb-stendap-gid',
    title: 'Стендап в Петербурге',
    city: 'Санкт-Петербург',
    citySlug: 'saint-petersburg',
  });
  assert.ok(cta);
  assert.equal(cta?.label, 'Смотреть события');
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
  assert.ok(fallback.hot.length <= 3);

  const flaggedSlug = cards[2]!.slug;
  const withFlag = cards.map((c, i) => ({ ...c, isFeatured: i === 2 }));
  const split = splitBlogListingHero(withFlag);
  assert.equal(split.featured?.slug, flaggedSlug);
  assert.ok(!split.feed.some((p) => p.slug === flaggedSlug));
  assert.ok(!split.hot.some((p) => p.slug === flaggedSlug));
});

test('stripColumnMetaPrefix removes author column labels', () => {
  assert.equal(
    stripColumnMetaPrefix('Колонка Макса: билеты и кемпинг на Волхове'),
    'Билеты и кемпинг на Волхове',
  );
  assert.equal(
    stripColumnMetaPrefix('Колонка Игоря «Место силы»: фестивали на берегу'),
    'Фестивали на берегу',
  );
  assert.equal(
    stripColumnMetaPrefix('Авторская колонка Анны: классика в особняках'),
    'Классика в особняках',
  );
  assert.equal(
    stripColumnMetaPrefix('Колонка о том, как устроен вечер: звук с края'),
    'Колонка о том, как устроен вечер: звук с края',
  );
});

test('stripColumnBodyChrome removes UI-duplicated column chrome', () => {
  const raw =
    '*Авторская колонка Артура, гастрономического обозревателя Дайбилет*\n\nЛид текста.\n\n*Артур, штатный корреспондент Дайбилет*';
  assert.equal(stripColumnBodyChrome(raw), 'Лид текста.');
});

test('expandListingExcerpt does not mash excerpt with body', () => {
  const excerpt =
    'Два фестиваля на берегу Волхова у Захарьино: историческая реконструкция и ролевой карнавал.';
  const listing = expandListingExcerpt('fentezi-fest-bylinnyy-bereg', excerpt, 420);
  assert.equal(listing, excerpt);
});

test('expandLargeListingCopy prefers body without concatenating excerpt', () => {
  const excerpt = 'Короткий excerpt для карточки.';
  const copy = expandLargeListingCopy('fentezi-fest-bylinnyy-bereg', excerpt, 900);
  const joined = [copy.primary, copy.secondary].filter(Boolean).join(' ');
  assert.ok(joined.length > 0);
  assert.ok(!joined.startsWith(excerpt));
  assert.ok(!joined.includes(`${excerpt} `));
});
