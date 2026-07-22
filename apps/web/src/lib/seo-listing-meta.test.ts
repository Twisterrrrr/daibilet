import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCategoryCityListingMeta,
  buildCategoryCityMetaDescription,
  buildCategoryCityMetaTitle,
  evaluateListingIndexability,
  MIN_LISTING_OFFERS_FOR_INDEX,
} from '@/lib/seo-listing-meta';

test('category×city title formula', () => {
  const title = buildCategoryCityMetaTitle({
    categoryTitle: 'Концерты',
    cityName: 'Москва',
    year: 2026,
  });
  assert.equal(
    title,
    'Концерты в Москве 2026 - купить билеты, расписание и цены на Дайбилет',
  );
  assert.ok(!title.includes('\u2014') && !title.includes('\u2013'));
});

test('category×city description formula', () => {
  const description = buildCategoryCityMetaDescription({
    seekCategory: 'речные прогулки',
    cityName: 'Санкт-Петербург',
  });
  assert.match(description, /^Ищете речные прогулки в Санкт-Петербурге\?/);
  assert.match(description, /Дайбилет/);
  assert.ok(!description.includes('➔'));
});

test('listing meta bundles labels', () => {
  const meta = buildCategoryCityListingMeta({
    landingSlug: 'concerts-genre',
    cityName: 'Москва',
    year: 2026,
  });
  assert.equal(meta.labels.titleCategory, 'Концерты');
  assert.match(meta.title, /^Концерты в Москве 2026/);
});

test('thin listing threshold default 6', () => {
  assert.equal(MIN_LISTING_OFFERS_FOR_INDEX, 6);
  assert.equal(evaluateListingIndexability({ offers: 5 }).indexable, false);
  assert.equal(evaluateListingIndexability({ offers: 6 }).indexable, true);
  assert.equal(evaluateListingIndexability({ offers: 0 }).reason, 'zero_offers');
});
