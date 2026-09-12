import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendRealPriceToDescription,
  buildCategoryCityListingMeta,
  buildCategoryCityMetaDescription,
  buildCategoryCityMetaTitle,
  evaluateListingIndexability,
  MIN_LISTING_OFFERS_FOR_INDEX,
  shouldLoadEmptyRelatedHits,
  shouldLoadRelatedHitSessions,
  shouldShowThinRelatedCards,
} from '@/lib/seo-listing-meta';

test('category×city title: в {city} сегодня, date: афиша (no dash, no year glue)', () => {
  const title = buildCategoryCityMetaTitle({
    categoryTitle: 'Концерты',
    cityName: 'Москва',
    landingSlug: 'concerts-genre',
    referenceDate: new Date('2026-08-06T12:00:00+03:00'),
  });
  assert.equal(title, 'Концерты в Москве сегодня, 6 августа: афиша, цены и билеты');
  assert.ok(!title.includes('\u2014') && !title.includes('\u2013'));
  assert.ok(!/: :/.test(title));
});

test('category×city title strips duplicate city from category label', () => {
  const title = buildCategoryCityMetaTitle({
    categoryTitle: 'Музеи и выставки в Москве',
    cityName: 'Москва',
    landingSlug: 'moscow-museums',
    referenceDate: new Date('2026-08-06T12:00:00+03:00'),
  });
  assert.equal(title, 'Музеи и выставки в Москве сегодня, 6 августа: афиша, цены и билеты');
  assert.equal((title.match(/Москв/gi) || []).length, 1);
});

test('category×city title for salute uses May 9 window (no wrong today)', () => {
  const title = buildCategoryCityMetaTitle({
    categoryTitle: 'Салют 9 мая',
    cityName: 'Москва',
    landingSlug: 'salute-9-may',
    referenceDate: new Date('2026-08-06T12:00:00+03:00'),
  });
  assert.match(title, /Салют 9 мая в Москве/);
  assert.match(title, /9 мая/);
  assert.equal(/сегодня/i.test(title), false);
  assert.ok(!/: :/.test(title));
});

test('category×city description formula (legacy)', () => {
  const description = buildCategoryCityMetaDescription({
    seekCategory: 'речные прогулки',
    cityName: 'Санкт-Петербург',
  });
  assert.match(description, /^Ищете речные прогулки в Санкт-Петербурге\?/);
  assert.match(description, /Дайбилет/);
  assert.ok(!description.includes('➔'));
});

test('category×city description formula (Ekaterinburg)', () => {
  const description = buildCategoryCityMetaDescription({
    seekCategory: 'стендап',
    categoryTitle: 'Стендап',
    cityName: 'Екатеринбург',
    year: 2026,
  });
  assert.equal(
    description,
    'Актуальная афиша категории Стендап в Екатеринбурге на 2026 год. Удобный выбор мест, билеты без наценок и честные отзывы. Заходите и бронируйте на Daibilet.ru!',
  );
  assert.ok(!description.includes('\u2014') && !description.includes('\u2013'));
});

test('listing meta bundles labels', () => {
  const meta = buildCategoryCityListingMeta({
    landingSlug: 'concerts-genre',
    cityName: 'Москва',
    year: 2026,
    referenceDate: new Date('2026-08-06T12:00:00+03:00'),
  });
  assert.equal(meta.labels.titleCategory, 'Концерты');
  assert.match(meta.title, /^Концерты в Москве сегодня, 6 августа/);
});

test('listing meta appends real priceFrom only', () => {
  const withPrice = buildCategoryCityListingMeta({
    landingSlug: 'standup',
    cityName: 'Москва',
    year: 2026,
    priceFrom: 990,
  });
  assert.match(withPrice.description, /Цены от 990 рублей/);

  const noFake = buildCategoryCityListingMeta({
    landingSlug: 'standup',
    cityName: 'Москва',
    year: 2026,
    priceFrom: null,
  });
  assert.equal(/Цены от/i.test(noFake.description), false);
});

test('appendRealPriceToDescription skips inventing and duplicates', () => {
  assert.equal(appendRealPriceToDescription('База.', null), 'База.');
  assert.equal(appendRealPriceToDescription('База.', 0), 'База.');
  assert.equal(appendRealPriceToDescription('База от 500 рублей.', 900), 'База от 500 рублей.');
  assert.equal(appendRealPriceToDescription('База.', 750), 'База. Цены от 750 рублей.');
});

test('thin listing threshold default 6; editorial hub bypasses low count', () => {
  assert.equal(MIN_LISTING_OFFERS_FOR_INDEX, 6);
  assert.equal(evaluateListingIndexability({ offers: 5 }).indexable, false);
  assert.equal(evaluateListingIndexability({ offers: 6 }).indexable, true);
  assert.equal(evaluateListingIndexability({ offers: 0 }).reason, 'zero_offers');
  assert.equal(
    evaluateListingIndexability({ offers: 3, hasEditorialSeoText: true }).indexable,
    true,
  );
  assert.equal(
    evaluateListingIndexability({ offers: 3, hasEditorialSeoText: true }).reason,
    'editorial_seo_hub',
  );
  assert.equal(
    evaluateListingIndexability({ offers: 0, hasEditorialSeoText: true }).indexable,
    false,
  );
  assert.equal(
    evaluateListingIndexability({ offers: 0, hasEditorialSeoText: true }).reason,
    'zero_offers',
  );
});

test('pilot stable index: offers>0 bypasses threshold 6', () => {
  assert.equal(
    evaluateListingIndexability({ offers: 2, stablePilotIndex: true }).indexable,
    true,
  );
  assert.equal(
    evaluateListingIndexability({ offers: 2, stablePilotIndex: true }).reason,
    'pilot_stable',
  );
  assert.equal(
    evaluateListingIndexability({ offers: 0, stablePilotIndex: true }).indexable,
    false,
  );
});

test('seo skeleton indexes even at zero offers (salute off-season)', () => {
  assert.equal(
    evaluateListingIndexability({ offers: 0, hasSeoSkeleton: true }).indexable,
    true,
  );
  assert.equal(
    evaluateListingIndexability({ offers: 0, hasSeoSkeleton: true }).reason,
    'seo_skeleton_hub',
  );
});

test('thin related cards only for exactly 6 or 7 offers', () => {
  assert.equal(shouldShowThinRelatedCards(5), false);
  assert.equal(shouldShowThinRelatedCards(6), true);
  assert.equal(shouldShowThinRelatedCards(7), true);
  assert.equal(shouldShowThinRelatedCards(8), false);
});

test('empty related hits load for 0 offers and thin 6–7', () => {
  assert.equal(shouldLoadEmptyRelatedHits(0), true);
  assert.equal(shouldLoadEmptyRelatedHits(1), false);
  assert.equal(shouldLoadRelatedHitSessions(0), true);
  assert.equal(shouldLoadRelatedHitSessions(6), true);
  assert.equal(shouldLoadRelatedHitSessions(5), false);
});
