import assert from 'node:assert/strict';
import test from 'node:test';

import {
  matchArticleSessions,
  pickCityHubArticles,
  type CityHubArticlesBuckets,
} from './city-hub-articles.ts';

type TestCard = {
  slug: string;
  title: string;
  excerpt?: string;
  city?: string | null;
  citySlug?: string | null;
  coverImageUrl?: string;
  publishedAt?: string | null;
  readMin?: number;
  tag?: string;
  articleType?: string | null;
};

function card(partial: TestCard) {
  return {
    excerpt: '',
    coverImageUrl: '',
    readMin: 3,
    tag: 'Гид',
    ...partial,
  };
}

function allSlugs(buckets: CityHubArticlesBuckets): string[] {
  return Object.values(buckets).flat().map((a) => a.slug);
}

const spb = { slug: 'sankt-peterburg', name: 'Санкт-Петербург' };
const moscow = { slug: 'moscow', name: 'Москва' };

test('pickCityHubArticles: Cyrillic city mention lands on SPB hub', () => {
  const articles = [
    card({
      slug: 'spb-dvory',
      title: 'Дворы и парадные Петербурга',
      excerpt: 'Прогулка по дворам',
      articleType: 'gid',
    }),
  ];
  const buckets = pickCityHubArticles(spb, articles);
  assert.ok(allSlugs(buckets).includes('spb-dvory'));
  assert.ok(buckets.sights.some((a) => a.slug === 'spb-dvory') || buckets.about.some((a) => a.slug === 'spb-dvory'));
});

test('pickCityHubArticles: Moscow article excluded from SPB hub', () => {
  const articles = [
    card({
      slug: 'moskva-rechnye',
      title: 'Речные прогулки Москвы',
      citySlug: 'moscow',
      city: 'Москва',
      articleType: 'gid',
    }),
    card({
      slug: 'spb-rooftop',
      title: 'Крыши Санкт-Петербурга',
      citySlug: 'saint-petersburg',
      articleType: 'gid',
    }),
  ];
  const buckets = pickCityHubArticles(spb, articles);
  const slugs = allSlugs(buckets);
  assert.ok(slugs.includes('spb-rooftop'));
  assert.equal(slugs.includes('moskva-rechnye'), false);
});

test('pickCityHubArticles: foreign city in title blocked even without citySlug', () => {
  const articles = [
    card({
      slug: 'weekend-msk',
      title: 'Куда пойти на выходные в Москве',
      articleType: 'gid',
    }),
  ];
  const buckets = pickCityHubArticles(spb, articles);
  assert.equal(allSlugs(buckets).includes('weekend-msk'), false);
});

test('pickCityHubArticles: multi/regions broad article can enter practice', () => {
  const articles = [
    card({
      slug: 'kak-vybrat-koncert',
      title: 'Как выбрать концерт',
      citySlug: 'multi',
      city: 'Несколько городов',
      articleType: 'gid',
      excerpt: 'Практика выбора формата и билетов',
    }),
  ];
  const buckets = pickCityHubArticles(spb, articles);
  assert.ok(allSlugs(buckets).includes('kak-vybrat-koncert'));
});

test('pickCityHubArticles: one article appears in at most one bucket', () => {
  const articles = [
    card({
      slug: 'spb-guide',
      title: 'Обзор Петербурга: куда сходить',
      citySlug: 'saint-petersburg',
      articleType: 'obzor',
      excerpt: 'Маршрут, афиша и как добраться',
    }),
  ];
  const buckets = pickCityHubArticles(spb, articles);
  const count = allSlugs(buckets).filter((s) => s === 'spb-guide').length;
  assert.equal(count, 1);
});

test('pickCityHubArticles: explicit CMS citySlug wins over title heuristics', () => {
  const articles = [
    card({
      slug: 'msk-about-spb-word',
      title: 'Гид по Петербургу для москвича',
      citySlug: 'moscow',
      articleType: 'gid',
    }),
  ];
  const onSpb = pickCityHubArticles(spb, articles);
  assert.equal(allSlugs(onSpb).includes('msk-about-spb-word'), false);
  const onMsk = pickCityHubArticles(moscow, articles);
  assert.ok(allSlugs(onMsk).includes('msk-about-spb-word'));
});

test('matchArticleSessions: prefers keyword hits', () => {
  const article = card({
    slug: 'spb-rooftop',
    title: 'Крыши и open-air Петербурга',
    excerpt: 'Смотровые площадки и вечерние крыши',
  });
  const sessions = [
    {
      id: '1',
      title: 'Концерт в клубе',
      category: 'Музыка',
      venue: 'A2',
      tags: ['концерт'],
      startsAt: '2026-07-23T18:00:00Z',
      imageUrl: '/a.jpg',
      priceFrom: 1000,
    },
    {
      id: '2',
      title: 'Прогулка по крышам',
      category: 'Экскурсии',
      venue: 'Центр',
      tags: ['крыши'],
      startsAt: '2026-07-24T12:00:00Z',
      priceFrom: 800,
    },
  ];
  const matched = matchArticleSessions(article, sessions, 3);
  assert.equal(matched[0]?.id, '2');
});

test('matchArticleSessions: empty when no keywords hit (no quality fallback)', () => {
  const article = card({
    slug: 'generic-tips',
    title: 'Как выбрать формат',
    excerpt: 'Советы без привязки к афише',
  });
  const sessions = [
    {
      id: 'cheap',
      title: 'Событие без фото',
      startsAt: '2026-07-23T10:00:00Z',
      priceFrom: 50,
    },
    {
      id: 'rich',
      title: 'Событие с фото',
      startsAt: '2026-07-25T10:00:00Z',
      imageUrl: '/x.jpg',
      priceFrom: 500,
    },
  ];
  const matched = matchArticleSessions(article, sessions, 1);
  assert.equal(matched.length, 0);
});

test('matchArticleSessions: ekb countryside guide does not attach standup', () => {
  const article = card({
    slug: 'ekb-uralskiy-mars-bazhovskie-ekskursii',
    title: 'Уральский Марс и Бажовские места: топ загородных экскурсий из Екатеринбурга',
    excerpt:
      'Как выбрать выезд из Екатеринбурга: карьеры Уральского Марса, Оленьи ручьи, бажовская Сысерть.',
    articleType: 'gid',
    citySlug: 'ekaterinburg',
  });
  const sessions = [
    {
      id: 'standup-1',
      title: 'Стендап открытый микрофон',
      category: 'Стендап',
      tags: ['стендап', 'юмор'],
      startsAt: '2026-07-24T18:00:00Z',
      imageUrl: '/s1.jpg',
      priceFrom: 500,
    },
    {
      id: 'standup-2',
      title: 'Большой стендап концерт',
      category: 'Юмор',
      tags: ['standup'],
      startsAt: '2026-07-25T19:00:00Z',
      imageUrl: '/s2.jpg',
      priceFrom: 1500,
    },
    {
      id: 'tour-1',
      title: 'Экскурсия к Уральскому Марсу',
      category: 'Экскурсии',
      tags: ['загород', 'экскурсия'],
      startsAt: '2026-07-26T10:00:00Z',
      priceFrom: 2000,
    },
  ];
  const matched = matchArticleSessions(article, sessions, 4);
  assert.deepEqual(
    matched.map((s) => s.id),
    ['tour-1'],
  );
});

test('matchArticleSessions: rejects orthogonal topic even on weak keyword overlap', () => {
  const article = card({
    slug: 'ekb-uralskiy-mars-bazhovskie-ekskursii',
    title: 'Уральский Марс и Бажовские места',
    excerpt: 'Загородные экскурсии из Екатеринбурга',
    citySlug: 'ekaterinburg',
  });
  const sessions = [
    {
      id: 'standup-city',
      title: 'Стендап в Екатеринбурге',
      category: 'Стендап',
      tags: ['стендап'],
      startsAt: '2026-07-24T18:00:00Z',
      imageUrl: '/s.jpg',
      priceFrom: 800,
    },
  ];
  const matched = matchArticleSessions(article, sessions, 3);
  assert.equal(matched.length, 0);
});

test('matchArticleSessions: moscow bus guide does not attach river cruises', () => {
  const article = card({
    slug: 'moskva-avtobusnaya-obzornaya',
    title: 'Автобусная обзорная экскурсия по Москве: как выбрать маршрут',
    excerpt: 'Классика с гидом, Hop-On Hop-Off или вечерний маршрут - как выбрать обзорную экскурсию по Москве.',
    articleType: 'obzor',
    citySlug: 'moscow',
  });
  const sessions = [
    {
      id: 'river-obzor',
      title: 'Обзорная речная прогулка по центру Москвы',
      category: 'Речные прогулки',
      tags: ['речные', 'обзорная'],
      startsAt: '2026-08-01T12:00:00Z',
      priceFrom: 900,
    },
    {
      id: 'river-admiral',
      title: 'Ужин на теплоходе Адмирал',
      category: 'Речные прогулки',
      tags: ['теплоход'],
      startsAt: '2026-08-01T18:00:00Z',
      priceFrom: 3500,
    },
    {
      id: 'bus-classic',
      title: 'Автобусная обзорная экскурсия по Москве',
      category: 'Экскурсии',
      tags: ['автобусные'],
      startsAt: '2026-08-02T10:00:00Z',
      priceFrom: 1200,
    },
    {
      id: 'bus-hop',
      title: 'Hop-on hop-off двухэтажный автобус по Москве',
      category: 'Экскурсии',
      tags: ['автобус'],
      startsAt: '2026-08-02T11:00:00Z',
      priceFrom: 2000,
    },
  ];
  const matched = matchArticleSessions(article, sessions, 4);
  assert.deepEqual(
    matched.map((s) => s.id),
    ['bus-classic', 'bus-hop'],
  );
});

test('matchArticleSessions: river dinner guide keeps river and rejects bus', () => {
  const article = card({
    slug: 'uzhin-na-teplohode-moskva-kak-vybrat',
    title: 'Ужин на теплоходе в Москве: как выбрать',
    excerpt: 'Форматы, причалы и цены на ужин с видом на Москву-реку.',
    citySlug: 'moscow',
  });
  const sessions = [
    {
      id: 'river-admiral',
      title: 'Ужин на теплоходе Адмирал',
      category: 'Речные прогулки',
      tags: ['теплоход'],
      startsAt: '2026-08-01T18:00:00Z',
      priceFrom: 3500,
    },
    {
      id: 'bus-classic',
      title: 'Автобусная обзорная экскурсия по Москве',
      category: 'Экскурсии',
      tags: ['автобусные', 'обзорная'],
      startsAt: '2026-08-02T10:00:00Z',
      priceFrom: 1200,
    },
  ];
  const matched = matchArticleSessions(article, sessions, 3);
  assert.deepEqual(
    matched.map((s) => s.id),
    ['river-admiral'],
  );
});