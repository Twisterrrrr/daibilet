import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blogListingImageFallbacks,
  listingImageFallbacks,
  resolveCardImage,
  toCardImagePath,
  toThumbImagePath,
} from './card-image.ts';

test('listingImageFallbacks tries -card then -thumb then original', () => {
  assert.deepEqual(listingImageFallbacks('/images/venues/moscow/vdnh.jpg'), [
    '/images/venues/moscow/vdnh-card.jpg',
    '/images/venues/moscow/vdnh-thumb.jpg',
    '/images/venues/moscow/vdnh.jpg',
  ]);
  assert.deepEqual(listingImageFallbacks('/images/events/generated/evt-cover-moscow-bus-tour.jpg'), [
    '/images/events/generated/evt-cover-moscow-bus-tour-card.jpg',
    '/images/events/generated/evt-cover-moscow-bus-tour-thumb.jpg',
    '/images/events/generated/evt-cover-moscow-bus-tour.jpg',
  ]);
});

test('listingImageFallbacks prefers -thumb first when src is already a thumb', () => {
  assert.deepEqual(listingImageFallbacks('/images/venues/moscow/vdnh-thumb.jpg'), [
    '/images/venues/moscow/vdnh-thumb.jpg',
    '/images/venues/moscow/vdnh-card.jpg',
    '/images/venues/moscow/vdnh.jpg',
  ]);
  assert.deepEqual(listingImageFallbacks('/images/venues/moscow/vdnh.jpg', { prefer: 'thumb' }), [
    '/images/venues/moscow/vdnh-thumb.jpg',
    '/images/venues/moscow/vdnh-card.jpg',
    '/images/venues/moscow/vdnh.jpg',
  ]);
});

test('blogListingImageFallbacks tries -og then -card then -thumb then original', () => {
  assert.deepEqual(
    blogListingImageFallbacks({
      slug: 'novosibirsk-vykhodnye-chto-posmotret',
      coverImageUrl: '/images/blog/novosibirsk-vykhodnye-chto-posmotret.jpg',
    }),
    [
      '/images/blog/novosibirsk-vykhodnye-chto-posmotret-og.jpg',
      '/images/blog/novosibirsk-vykhodnye-chto-posmotret-card.jpg',
      '/images/blog/novosibirsk-vykhodnye-chto-posmotret-thumb.jpg',
      '/images/blog/novosibirsk-vykhodnye-chto-posmotret.jpg',
    ],
  );
});

test('resolveCardImage maps local jpg/png to sibling -card.jpg', () => {
  assert.equal(
    resolveCardImage('/images/venues/moscow/vdnh.jpg'),
    '/images/venues/moscow/vdnh-card.jpg',
  );
  assert.equal(
    resolveCardImage('/images/events/generated/evt-cover-moscow-bus-tour.jpg'),
    '/images/events/generated/evt-cover-moscow-bus-tour-card.jpg',
  );
  assert.equal(
    resolveCardImage('/images/venues/tula/kreml.png'),
    '/images/venues/tula/kreml-card.jpg',
  );
});

test('resolveCardImage is idempotent for cards and keeps legacy thumbs first', () => {
  assert.equal(
    resolveCardImage('/images/venues/moscow/vdnh-card.jpg'),
    '/images/venues/moscow/vdnh-card.jpg',
  );
  assert.equal(
    resolveCardImage('/images/venues/moscow/vdnh-thumb.jpg'),
    '/images/venues/moscow/vdnh-thumb.jpg',
  );
  assert.equal(toCardImagePath('/images/foo.jpeg'), '/images/foo-card.jpg');
  assert.equal(toThumbImagePath('/images/foo.jpeg'), '/images/foo-thumb.jpg');
});

test('resolveCardImage leaves stubs, remote, empty, and non-raster paths', () => {
  assert.equal(resolveCardImage(null), null);
  assert.equal(resolveCardImage(''), null);
  assert.equal(
    resolveCardImage('/images/venues/generated/venue-auto-stub.jpg'),
    '/images/venues/generated/venue-auto-stub.jpg',
  );
  assert.equal(
    resolveCardImage('https://cdn.example/cover.jpg'),
    'https://cdn.example/cover.jpg',
  );
  assert.equal(resolveCardImage('/images/home/hero-emotion-01.webp'), '/images/home/hero-emotion-01.webp');
});
