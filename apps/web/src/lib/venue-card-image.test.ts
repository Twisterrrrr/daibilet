import assert from 'node:assert/strict';
import test from 'node:test';

import { venueCardImageUrl } from './venue-card-image.ts';

test('venueCardImageUrl maps editorial venue jpg to sibling thumb', () => {
  assert.equal(
    venueCardImageUrl('/images/venues/moscow/vdnh.jpg'),
    '/images/venues/moscow/vdnh-thumb.jpg',
  );
});

test('venueCardImageUrl is idempotent for thumbs and skips generated stubs', () => {
  assert.equal(
    venueCardImageUrl('/images/venues/moscow/vdnh-thumb.jpg'),
    '/images/venues/moscow/vdnh-thumb.jpg',
  );
  assert.equal(
    venueCardImageUrl('/images/venues/generated/venue-auto-stub.jpg'),
    '/images/venues/generated/venue-auto-stub.jpg',
  );
});

test('venueCardImageUrl leaves remote, empty, and non-venue paths', () => {
  assert.equal(venueCardImageUrl(null), null);
  assert.equal(venueCardImageUrl(''), null);
  assert.equal(venueCardImageUrl('/images/custom-hub.jpg'), '/images/custom-hub.jpg');
  assert.equal(
    venueCardImageUrl('https://cdn.example/cover.jpg'),
    'https://cdn.example/cover.jpg',
  );
});
