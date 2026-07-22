import assert from 'node:assert/strict';
import test from 'node:test';

import { pickCityHubArticles, type CityHubArticlesBuckets } from './city-hub-articles.ts';

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

test('pickCityHubArticles: Moscow hub keeps Moscow article', () => {
  const articles = [
    card({
      slug: 'moskva-rechnye',
      title: 'Речные прогулки Москвы',
      citySlug: 'moscow',
      articleType: 'gid',
    }),
  ];
  const buckets = pickCityHubArticles(moscow, articles);
  assert.ok(allSlugs(buckets).includes('moskva-rechnye'));
});
