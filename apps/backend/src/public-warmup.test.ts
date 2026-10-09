import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicReadStackWarmer } from './public-warmup.js';

test('warms the shared catalog once and only enabled dependent read models', async () => {
  const calls: string[] = [];
  const warm = createPublicReadStackWarmer({
    flags: { catalog: true, city: true, event: true, venue: false },
    getCatalogSessions: async () => {
      calls.push('catalog');
      return [{ id: 'event-1' }, { id: 'event-2' }] as never;
    },
    buildDestinations: async () => calls.push('destinations'),
    buildVenues: async () => calls.push('venues'),
  });

  const result = await warm('test');

  assert.deepEqual(calls, ['catalog', 'destinations']);
  assert.equal(result?.events, 2);
  assert.equal(result?.destinationsWarmed, true);
  assert.equal(result?.venuesWarmed, false);
});

test('skips work when the typed public stack is disabled', async () => {
  let catalogCalls = 0;
  const warm = createPublicReadStackWarmer({
    flags: { catalog: false, city: false, event: false, venue: false },
    getCatalogSessions: async () => {
      catalogCalls += 1;
      return [];
    },
    buildDestinations: async () => undefined,
    buildVenues: async () => undefined,
  });

  assert.equal(await warm('disabled'), null);
  assert.equal(catalogCalls, 0);
});
