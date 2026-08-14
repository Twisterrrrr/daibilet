import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBlogListingCta } from './blog-listing-links';
import {
  blogPostFilterCities,
  buildBlogCityFilterOptions,
  stripColumnBodyChrome,
  stripColumnMetaPrefix,
  blogListingCityBadgeLabel,
} from './blog-meta';
import { resolveBlogTopics, parseBlogTopicParam } from './blog-topics';
import {
  clipBlogCardExcerpt,
  clipBlogCardTitle,
  clipAtSentenceBoundary,
  clipBlogFeaturedLead,
  expandListingExcerpt,
  expandLargeListingCopy,
  hubBlogCardExcerpt,
  resolveBlogCardDateLabel,
  splitBlogListingHero,
  staticBlogCards,
  truncateAtSentence,
  truncateAtWord,
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

test('blog listing CTA: city → Больше про …', () => {
  const spb = resolveBlogListingCta({
    slug: 'spb-stendap-gid',
    title: 'Стендап в Петербурге',
    city: 'Санкт-Петербург',
    citySlug: 'saint-petersburg',
  });
  assert.ok(spb);
  assert.equal(spb?.label, 'Больше про Санкт-Петербург');
  assert.ok(spb?.href);

  const msk = resolveBlogListingCta({
    slug: 'moskva-rechnye-progulki-kak-vybrat',
    title: 'Речные прогулки в Москве',
    city: 'Москва',
    citySlug: 'moscow',
  });
  assert.ok(msk);
  assert.equal(msk?.label, 'Больше про Москву');
  assert.ok(msk?.href);
});

test('blog listing CTA: topic without city', () => {
  const concerts = resolveBlogListingCta({
    slug: 'kak-vybrat-koncert',
    title: 'Как выбрать концерт',
    tag: 'Концерты',
  });
  assert.ok(concerts);
  assert.equal(concerts?.label, 'Смотреть концерты');

  const routes = resolveBlogListingCta({
    slug: 'moscow-2-dnya-samostoyatelno-marshrut',
    title: 'Москва за 2 дня: маршрут',
  });
  assert.ok(routes);
  assert.equal(routes?.label, 'Больше маршрутов');
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

test('truncateAtWord never cuts mid-word', () => {
  assert.equal(truncateAtWord('Горького переулка хватает на вечер', 12), 'Горького');
  assert.equal(truncateAtWord('иммерсивные шоу в регионах', 14), 'иммерсивные');
  assert.equal(
    clipBlogCardTitle('Иммерсивные шоу в регионах России'),
    'Иммерсивные шоу в регионах России',
  );
});

test('clipBlogCardExcerpt always finishes the sentence with a period', () => {
  assert.equal(
    clipBlogCardExcerpt('билет и ужин без суеты в центре города', 18),
    'билет и ужин без суеты в центре города.',
  );
  const long =
    'На танцполе вы можете провести три часа, упираясь взглядом в чужие спины, в первом ряду партера - оглохнуть от близости колонок, а в дорогой VIP-ложе - оказаться так высоко сбоку, что самого артиста придется разглядывать через зум в телефоне. Чтобы ваши ожидания совпали с реальностью.';
  const clipped = clipBlogCardExcerpt(long, 160);
  assert.ok(clipped.endsWith('телефоне.'));
  assert.ok(!clipped.includes('через зум в.'));
  assert.ok(!clipped.endsWith('...'));
});

test('clipAtSentenceBoundary ignores ? inside guillemets', () => {
  const excerpt =
    'Лекция судмедэксперта на крыше, горячая эмаль, иммерсивный особняк, «ГДЕ МОЙ 2008?» и квест в зоопарке - пять странных способов встряхнуть московские выходные.';
  assert.equal(clipAtSentenceBoundary(excerpt, 420, 2), excerpt);
  // Tight budget still returns the full first sentence - never mid-phrase.
  const short = clipAtSentenceBoundary(excerpt, 72, 1);
  assert.equal(short, excerpt);
  assert.ok(short.endsWith('.'));
});

test('truncateAtSentence ends on sentence boundary, not mid-phrase', () => {
  const text =
    'Лекция судмедэксперта на крыше, горячая эмаль, иммерсивный особняк. Второе предложение для теста.';
  const clipped = truncateAtSentence(text, 90, 2);
  assert.ok(clipped.endsWith('.'));
  assert.ok(!clipped.endsWith('...'));
  assert.ok(!/\sиммерсивн[^\s]*$/u.test(clipped));
  assert.equal(clipped, 'Лекция судмедэксперта на крыше, горячая эмаль, иммерсивный особняк.');
});

test('live blog slugs: listing excerpt ends cleanly', () => {
  const cards = staticBlogCards();
  for (const slug of [
    'kak-perestat-gulyat-po-krugu-moskva',
    'chelyabinsk-vii-gastro-spektakl',
    'moskva-immersivnye-vystavki',
  ]) {
    const card = cards.find((item) => item.slug === slug);
    assert.ok(card, slug);
    const listing = expandListingExcerpt(card!.slug, card!.excerpt, 420);
    assert.ok(listing.length > 0, slug);
    assert.ok(!listing.endsWith('...'), slug);
    assert.ok(!/\s\S{1,4}$/u.test(listing) || /[.!?…]$/.test(listing), slug);
    const hero = clipBlogFeaturedLead(card!.slug, card!.excerpt, 3);
    assert.ok(hero.length > 0, slug);
    assert.ok(!hero.endsWith('...'), slug);
  }
});


test('blogListingCityBadgeLabel: explicit city, multi, empty', () => {
  assert.equal(blogListingCityBadgeLabel('moscow', 'Москва'), 'Москва');
  assert.equal(
    blogListingCityBadgeLabel('multi', 'Москва и Петербург'),
    'Москва и Петербург',
  );
  assert.equal(blogListingCityBadgeLabel(null, null), null);
  assert.equal(blogListingCityBadgeLabel('', 'Без города'), null);
});

test('myuzikly card exposes city badge label from static data', () => {
  const card = staticBlogCards().find((c) => c.slug === 'myuzikly-teatr-novichok-msk-spb');
  assert.ok(card);
  assert.equal(card?.citySlug, 'multi');
  assert.equal(blogListingCityBadgeLabel(card?.citySlug, card?.city), 'Москва и Петербург');
});

test('blog city filter expands multi posts into tagged cities, no Несколько городов', () => {
  const cards = staticBlogCards();
  const options = buildBlogCityFilterOptions(cards);
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
  const hits = blogPostFilterCities({
    citySlug: 'multi',
    city: 'Москва и Петербург',
  });
  assert.deepEqual(
    hits.map((hit) => hit.value).sort(),
    ['moscow', 'saint-petersburg'],
  );
});

test('home rest-row slugs: hub excerpt from real dek, not lorem', () => {
  const cards = staticBlogCards();
  const expected: Record<string, string> = {
    'moskva-immersivnye-vystavki': 'Четыре формата иммерсива',
    'kak-vybrat-koncert': 'Танцпол, партер, балкон или VIP',
    'afisha-regionalnye-goroda': 'Честный гид по суперсилам',
  };
  for (const [slug, snippet] of Object.entries(expected)) {
    const card = cards.find((item) => item.slug === slug);
    assert.ok(card, slug);
    const lead = hubBlogCardExcerpt(card!.slug, card!.excerpt);
    assert.ok(lead.includes(snippet), slug);
    assert.ok(lead.length > 40, slug);
    assert.ok(/[.!?…]$/u.test(lead), slug);
    assert.ok(!/lorem/i.test(lead), slug);
    const fromBody = hubBlogCardExcerpt(slug, '');
    assert.ok(fromBody.length > 40, `${slug} body fallback`);
    assert.ok(/[.!?…]$/u.test(fromBody), `${slug} body fallback`);
  }
});

test('hubBlogCardExcerpt uses real frontmatter, 2-3 sentences, not lorem', () => {
  const cards = staticBlogCards();
  const perm = cards.find((item) => item.slug === 'perm-za-2-dnya');
  assert.ok(perm?.excerpt);
  const lead = hubBlogCardExcerpt(perm!.slug, perm!.excerpt);
  assert.ok(lead.includes('Сити-брейк в Перми'));
  assert.ok(lead.includes('Хохловка'));
  assert.ok(/[.!?…]$/u.test(lead));
  assert.ok(!/lorem/i.test(lead));

  const fromBody = hubBlogCardExcerpt('perm-za-2-dnya', '');
  assert.ok(fromBody.length > 40);
  assert.ok(/[.!?…]$/u.test(fromBody));
});
