import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveConcertGenres, resolveFamilyFormats } from '../../app/new-year-ux-preview/preview-format';
import { deriveNewYearPreviewData, type NewYearPreviewIndex } from '../../app/new-year-ux-preview/preview-index';
import { InvalidNewYearPreviewQuery, parseThematicPreviewQuery } from './new-year-preview-query';

test('concert genres come from catalog taxonomy, not title keywords', () => {
  assert.deepEqual(resolveConcertGenres({ title: 'Jazz Party', catalogCategory: { title: 'Концерты', slug: 'concerts' } }), ['Другие жанры']);
  assert.deepEqual(resolveConcertGenres({ title: 'Большой вечер', catalogCategory: { title: 'Концерты', slug: 'concerts' }, catalogSubcategory: { title: 'Рок', slug: 'rock' } }), ['Рок']);
});

test('family formats and age/availability filters use catalogue fields', () => {
  assert.deepEqual(resolveFamilyFormats({ title: 'Программа', catalogCategory: { title: 'Детские спектакли', slug: 'kids-performances' } }), ['Детские спектакли']);
  const index: NewYearPreviewIndex = {
    theme: 'family-kids',
    total: 2,
    sourceTotal: 2,
    generatedAt: null,
    priceRange: { min: 0, max: 5_000 },
    events: [
      { id: 'available', title: 'Спектакль', city: 'Москва', ageLimit: '6+', vacant: 12, priceFrom: 800, format: 'Детские спектакли', formats: ['Детские спектакли'], searchText: 'спектакль', region: null, regionCenter: true, standaloneCity: false, upcomingSlots: [{ startsAt: '2027-02-01T10:00:00+03:00', dayKey: '2027-02-01' }] },
      { id: 'sold-out', title: 'Шоу', city: 'Москва', ageLimit: '6+', vacant: 0, priceFrom: 900, format: 'Шоу и представления', formats: ['Шоу и представления'], searchText: 'шоу', region: null, regionCenter: true, standaloneCity: false, upcomingSlots: [{ startsAt: '2027-02-01T12:00:00+03:00', dayKey: '2027-02-01' }] },
    ],
  };
  const result = deriveNewYearPreviewData(index, { ageLimit: '6+', availableOnly: true }, 30);
  assert.equal(result.total, 1);
  assert.equal(result.items[0]?.id, 'available');
  assert.equal(result.facets.formats.find((item) => item.name === 'Все форматы')?.count, 1);
});

test('thematic URLs validate age and availability filters', () => {
  const parsed = parseThematicPreviewQuery(new URLSearchParams('ageLimit=6%2B&available=1'));
  assert.equal(parsed.ageLimit, '6+');
  assert.equal(parsed.availableOnly, true);
  assert.equal(parsed.lowStock, false);
  assert.equal(parsed.offset, 0);
  assert.throws(() => parseThematicPreviewQuery(new URLSearchParams('ageLimit=2%2B')), InvalidNewYearPreviewQuery);
});
