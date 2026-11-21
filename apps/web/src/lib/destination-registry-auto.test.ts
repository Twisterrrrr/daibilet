import test from 'node:test';
import assert from 'node:assert/strict';

import { CITY_INFO } from './cityInfo.ts';
import {
  DESTINATION_REGISTRY,
  hydrateDestinationRegistryFromCityInfo,
  listDestinationCoverageRows,
  resolveDestinationsForHub,
} from './city-destination-registry.ts';

/**
 * 29.09. The coverage row count was pinned to a literal 86. The registry has since
 * grown to 108 destinations, so the exact count broke on every new city - the
 * assertion was measuring "the number happened to be this when the test was
 * written", not "every hub is registered".
 *
 * What this test is actually for is the invariant: auto hydration must register
 * every hub, with nothing left pending. That is asserted below against the
 * current row set rather than a frozen number, so adding a city no longer fails
 * and a genuinely unregistered hub still does.
 */
test('auto hydration registers all hub suburbs', () => {
  const rows = listDestinationCoverageRows(CITY_INFO);
  assert.ok(rows.length > 0, 'coverage rows must not be empty');
  assert.ok(
    DESTINATION_REGISTRY.length >= rows.length,
    `registry (${DESTINATION_REGISTRY.length}) must cover all rows (${rows.length})`,
  );
  // The invariant: nothing is left waiting to be registered. Named so a
  // regression says which hub/suburb failed to hydrate.
  assert.deepEqual(
    rows
      .filter((row) => row.registryStatus === 'pending')
      .map((row) => `${row.hubSlug}/${row.suburbName}`),
    [],
  );
  assert.equal(
    rows.filter((row) => row.registryStatus === 'migrated').length,
    rows.length,
  );
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
