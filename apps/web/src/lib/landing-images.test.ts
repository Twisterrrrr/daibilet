import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveLandingCardImage } from './landing-images.ts';

test('tour landings have unique covers (no shared format-tours)', () => {
  const slugs = ['excursions', 'walking-tours', 'country-tours', 'rooftops'] as const;
  const images = slugs.map((slug) => resolveLandingCardImage(slug));
  for (const image of images) {
    assert.ok(image);
    assert.notEqual(image, '/images/home/format-tours.jpg');
  }
  assert.equal(new Set(images).size, slugs.length);
});

test('Perm hub uses Kama / city overrides for tour tiles', () => {
  assert.equal(
    resolveLandingCardImage('excursions', 'perm'),
    '/images/landings/perm/city-center.jpg',
  );
  assert.equal(
    resolveLandingCardImage('walking-tours', 'perm'),
    '/images/landings/perm/kama-embankment.jpg',
  );
  assert.equal(
    resolveLandingCardImage('rooftops', 'perm'),
    '/images/landings/perm/kama-embankment.jpg',
  );
  assert.equal(
    resolveLandingCardImage('river-cruises', 'perm'),
    '/images/landings/perm/kama-embankment.jpg',
  );
});

test('other cities keep national unique covers', () => {
  assert.equal(resolveLandingCardImage('rooftops', 'kazan'), '/images/landings/rooftops.jpg');
  assert.equal(resolveLandingCardImage('excursions', 'moscow'), '/images/landings/excursions.jpg');
});
