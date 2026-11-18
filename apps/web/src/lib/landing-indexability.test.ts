import assert from 'node:assert/strict';
import test from 'node:test';

import { isLandingRouteIndexable } from './landing-indexability';

test('landing routes use the same six-offer threshold as sitemap generation', () => {
  assert.equal(isLandingRouteIndexable({ landingSlug: 'standup', offers: 5 }), false);
  assert.equal(isLandingRouteIndexable({ landingSlug: 'standup', offers: 6 }), true);
});

test('year-round seasonal skeleton pages still follow route seasonal noindex rules', () => {
  const offSeason = new Date('2026-11-18T12:00:00Z');
  const inSeason = new Date('2026-05-10T12:00:00Z');

  assert.equal(isLandingRouteIndexable({ landingSlug: 'salute-9-may', offers: 0 }, offSeason), false);
  assert.equal(isLandingRouteIndexable({ landingSlug: 'salute-9-may', offers: 0 }, inSeason), true);
});
