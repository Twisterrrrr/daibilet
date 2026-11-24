import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLandingRegionName } from './landing-region';

test('resolveLandingRegionName resolves known oblasts and republics from public slugs', () => {
  assert.equal(resolveLandingRegionName('moskovskaya-oblast'), 'Московская область');
  assert.equal(resolveLandingRegionName('leningradskaya-oblast'), 'Ленинградская область');
  assert.equal(resolveLandingRegionName('respublika-tatarstan'), 'Республика Татарстан');
  assert.equal(resolveLandingRegionName('unknown-place'), null);
});
