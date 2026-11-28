import assert from 'node:assert/strict';
import test from 'node:test';

import {
  landingContextWidgetSlugs,
  resolveLandingContextWidget,
} from '../data/landing-context-widgets.ts';

test('resolveLandingContextWidget covers owner matrix slugs', () => {
  const expected = [
    'active-sport',
    'bridges-night',
    'bus-tours',
    'concerts-genre',
    'country-tours',
    'exhibitions',
    'excursions',
    'graduation',
    'family-kids',
    'improv-tribute',
    'intimate-concerts',
    'moscow-city-day',
    'maslenitsa',
    'moscow-dinner-boat',
    'international-womens-day',
    'moscow-museums',
    'new-year',
    'planetarium',
    'quest-tours',
    'river-cruises',
    'river-party',
    'rooftops',
    'salute-9-may',
    'self-development',
    'show-programs',
    'spb-yards',
    'standup',
    'unusual-theatres',
    'walking-tours',
  ];
  for (const slug of expected) {
    const config = resolveLandingContextWidget(slug);
    assert.ok(config, `missing widget for ${slug}`);
    assert.equal(config!.slug, slug);
    assert.ok(config!.title.length > 0);
    assert.ok(config!.chips.length > 0);
    assert.equal('rating' in config!, false);
  }
  assert.deepEqual(landingContextWidgetSlugs().sort(), [...expected].sort());
});

test('resolveLandingContextWidget returns null for unknown slug', () => {
  assert.equal(resolveLandingContextWidget('unknown-landing'), null);
});
