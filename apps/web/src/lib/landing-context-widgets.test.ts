import assert from 'node:assert/strict';
import test from 'node:test';

import {
  landingContextWidgetSlugs,
  resolveLandingContextWidget,
} from '../data/landing-context-widgets.ts';

test('resolveLandingContextWidget covers owner matrix slugs', () => {
  const expected = [
    'planetarium',
    'rooftops',
    'country-tours',
    'river-party',
    'family-kids',
    'new-year',
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
