import test from 'node:test';
import assert from 'node:assert/strict';

import { CITY_INFO } from './cityInfo.ts';
import {
  DESTINATION_REGISTRY,
  hydrateDestinationRegistryFromCityInfo,
  listDestinationCoverageRows,
  resolveDestinationsForHub,
} from './city-destination-registry.ts';

test('auto hydration registers all hub suburbs', () => {
  assert.ok(DESTINATION_REGISTRY.length >= 86);
  const rows = listDestinationCoverageRows(CITY_INFO);
  assert.equal(rows.length, 86);
  assert.equal(rows.filter((row) => row.registryStatus === 'migrated').length, 86);
  assert.equal(rows.filter((row) => row.registryStatus === 'pending').length, 0);
});

test('hydrateDestinationRegistryFromCityInfo is idempotent', () => {
  const before = DESTINATION_REGISTRY.length;
  assert.equal(hydrateDestinationRegistryFromCityInfo(CITY_INFO), 0);
  assert.equal(DESTINATION_REGISTRY.length, before);
});

test('regional hubs have auto-migrated nature day-trips', () => {
  assert.equal(resolveDestinationsForHub('chelyabinsk').length, 5);
  assert.equal(resolveDestinationsForHub('ufa').length, 4);
  assert.equal(resolveDestinationsForHub('perm').length, 4);
  assert.equal(resolveDestinationsForHub('tver').length, 3);
});
