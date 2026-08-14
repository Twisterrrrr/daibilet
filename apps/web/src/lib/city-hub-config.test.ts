import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCityHubAfficheBeforeSuburbs,
  isCityHubBlogAfterSuburbs,
  isCityHubSectionHidden,
  resolveCityHubConfig,
} from './city-hub-config.ts';

test('resolveCityHubConfig normalizes sankt-peterburg alias', () => {
  const config = resolveCityHubConfig('sankt-peterburg');
  assert.ok(config?.featuredDirections?.length);
  assert.equal(config?.primaryCta?.label, 'Круизы и прогулки');
  assert.equal(config?.highlightSeason?.label, 'Белые ночи');
  assert.ok(config?.featuredDirections?.some((item) => item.id === 'museums'));
  assert.equal(
    config?.featuredDirections?.find((item) => item.id === 'museums')?.landingSlug,
    'exhibitions',
  );
});

test('resolveCityHubConfig returns moscow venuesTopN', () => {
  const config = resolveCityHubConfig('moscow');
  assert.equal(config?.venuesTopN, 12);
  assert.ok(config?.featuredDirections?.some((item) => item.id === 'theatre'));
  assert.equal(config?.highlightSeason?.label, 'День города');
  assert.equal(config?.primaryCta?.target, '/moscow/den-goroda');
  assert.equal(
    config?.featuredDirections?.find((item) => item.id === 'city-day')?.landingSlug,
    'moscow-city-day',
  );
  assert.equal(config?.featuredDirections?.[0]?.id, 'city-day');
  assert.equal(
    config?.featuredDirections?.find((item) => item.id === 'museums')?.landingSlug,
    'moscow-museums',
  );
  const museumIndex = config?.featuredDirections?.findIndex((item) => item.id === 'museums') ?? -1;
  const cityDayIndex = config?.featuredDirections?.findIndex((item) => item.id === 'city-day') ?? -1;
  assert.ok(cityDayIndex >= 0 && museumIndex > cityDayIndex);
});

test('isCityHubSectionHidden respects hideSections', () => {
  const config = resolveCityHubConfig('moscow');
  assert.equal(isCityHubSectionHidden(config, 'directions'), false);
  assert.equal(isCityHubSectionHidden({ hideSections: ['sights'] }, 'sights'), true);
});

test('unknown slug returns null config', () => {
  assert.equal(resolveCityHubConfig('unknown-city-slug-xyz'), null);
});

test('isCityHubBlogAfterSuburbs gates five cities and aliases', () => {
  for (const slug of [
    'perm',
    'kaliningrad',
    'moscow',
    'moskva',
    'saint-petersburg',
    'sankt-peterburg',
    'nizhny-novgorod',
    'nizhniy-novgorod',
  ]) {
    assert.equal(isCityHubBlogAfterSuburbs(slug), true, slug);
  }
  assert.equal(isCityHubBlogAfterSuburbs('kazan'), false);
  assert.equal(isCityHubBlogAfterSuburbs('ekaterinburg'), false);
  assert.equal(isCityHubBlogAfterSuburbs(''), false);
  assert.equal(isCityHubAfficheBeforeSuburbs('perm'), true);
  assert.equal(isCityHubAfficheBeforeSuburbs('kazan'), false);
});

test('ekaterinburg hub config has no river featuredDirections', () => {
  const config = resolveCityHubConfig('ekaterinburg');
  assert.ok(config?.featuredDirections?.length);
  assert.equal(
    config?.featuredDirections?.some((item) =>
      ['river-cruises', 'river-party'].includes(String(item.landingSlug || '')),
    ),
    false,
  );
  assert.ok(config?.featuredDirections?.some((item) => item.id === 'standup'));
});
