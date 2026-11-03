import assert from 'node:assert/strict';
import test from 'node:test';

import { isLandingOffSeason, shouldNoindexSeasonalLanding } from './landing-season';

const november = new Date('2026-11-02T09:00:00.000Z');

test('river landing is calendar off-season in November', () => {
  assert.equal(isLandingOffSeason('river-cruises', november), true);
});

test('seasonal noindex follows city-scoped future saleable inventory', () => {
  assert.equal(shouldNoindexSeasonalLanding('river-cruises', 0, november), true);
  assert.equal(shouldNoindexSeasonalLanding('river-cruises', 1, november), false);
  assert.equal(shouldNoindexSeasonalLanding('river-cruises', 23, november), false);
  assert.equal(shouldNoindexSeasonalLanding('river-cruises', null, november), true);
});

test('in-season landing metadata is not affected by seasonal noindex rule', () => {
  assert.equal(shouldNoindexSeasonalLanding('river-cruises', 0, new Date('2026-07-01T09:00:00.000Z')), false);
});
