import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCityHubData } from './city-hub-lazy.ts';

test('capitals without hub chunks fall back to the CITY_INFO registry (moscow)', async () => {
  const data = await loadCityHubData('moscow');
  assert.ok(data, 'moscow hub data must resolve via registry fallback');
  assert.ok(data.mustSee.length > 0, 'moscow must-see must not be empty');
});

test('aliased slugs resolve through the registry (moskva -> moscow)', async () => {
  const data = await loadCityHubData('moskva');
  assert.ok(data, 'moskva alias must resolve');
  assert.ok(data.mustSee.length > 0);
});

test('spb hub data resolves even without a lazy hub chunk', async () => {
  const data = await loadCityHubData('saint-petersburg');
  assert.ok(data, 'saint-petersburg must resolve via registry fallback');
  assert.ok(data.mustSee.length > 0);
});

test('cities with lazy hub chunks still load (smolensk)', async () => {
  const data = await loadCityHubData('smolensk');
  assert.ok(data);
  assert.ok(data.mustSee.length > 0);
});

test('unknown cities return null and do not cache junk', async () => {
  assert.equal(await loadCityHubData('nowhere-xyz-city'), null);
});
