import assert from 'node:assert/strict';
import test from 'node:test';

import { isCityHubSectionHidden, resolveCityHubConfig } from './city-hub-config.ts';

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
});

test('isCityHubSectionHidden respects hideSections', () => {
  const config = resolveCityHubConfig('moscow');
  assert.equal(isCityHubSectionHidden(config, 'directions'), false);
  assert.equal(isCityHubSectionHidden({ hideSections: ['sights'] }, 'sights'), true);
});

test('unknown slug returns null config', () => {
  assert.equal(resolveCityHubConfig('unknown-city-slug-xyz'), null);
});
