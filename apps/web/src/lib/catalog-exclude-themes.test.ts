import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeExcludeLandingList,
  pickCatalogExcludeThemeOptions,
  removeExcludeLanding,
  toggleExcludeLanding,
} from './catalog-exclude-themes.ts';
import { buildCatalogHref, catalogFiltersFromQuery } from './catalog-url.ts';

test('normalizeExcludeLandingList: csv + dedupe', () => {
  assert.deepEqual(normalizeExcludeLandingList('standup, river-cruises,standup'), [
    'standup',
    'river-cruises',
  ]);
});

test('toggleExcludeLanding adds and removes', () => {
  assert.deepEqual(toggleExcludeLanding(undefined, 'standup'), ['standup']);
  assert.equal(toggleExcludeLanding(['standup'], 'standup'), undefined);
  assert.deepEqual(toggleExcludeLanding(['standup'], 'river-cruises'), [
    'river-cruises',
    'standup',
  ]);
});

test('removeExcludeLanding leaves others', () => {
  assert.deepEqual(removeExcludeLanding(['standup', 'bus-tours'], 'standup'), ['bus-tours']);
  assert.equal(removeExcludeLanding(['standup'], 'standup'), undefined);
});

test('pickCatalogExcludeThemeOptions shows facets + already excluded', () => {
  const options = pickCatalogExcludeThemeOptions(
    [
      { slug: 'standup', events: 40, title: 'Стендап и юмор' },
      { slug: 'river-cruises', events: 120 },
      { slug: 'walking-tours', events: 10 },
    ],
    ['bus-tours'],
  );
  assert.deepEqual(
    options.map((o) => o.slug),
    ['standup', 'river-cruises', 'bus-tours'],
  );
});

test('buildCatalogHref serializes excludeLanding csv', () => {
  const href = buildCatalogHref(
    catalogFiltersFromQuery({
      city: 'sankt-peterburg',
      excludeLanding: ['standup', 'river-cruises'],
    }),
  );
  assert.ok(href.includes('excludeLanding=standup%2Criver-cruises') || href.includes('excludeLanding=river-cruises%2Cstandup'));
  assert.ok(href.includes('city=sankt-peterburg'));
});
