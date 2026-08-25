import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isLandscapePromoImageUrl,
  parseImageDimensionsFromUrl,
  resolveHorizontalFeedPromoImage,
} from './blog-promo-image.ts';

test('parseImageDimensionsFromUrl reads WxH suffix', () => {
  assert.deepEqual(parseImageDimensionsFromUrl('https://cdn.example.com/photo-1200x800.jpg'), {
    width: 1200,
    height: 800,
  });
  assert.equal(parseImageDimensionsFromUrl('https://cdn.example.com/photo.jpg'), null);
});

test('isLandscapePromoImageUrl rejects portrait covers', () => {
  assert.equal(isLandscapePromoImageUrl('https://cdn.example.com/poster-600x900.jpg'), false);
  assert.equal(isLandscapePromoImageUrl('https://cdn.example.com/banner-1600x900.jpg'), true);
  assert.equal(isLandscapePromoImageUrl('https://cdn.example.com/no-dims.jpg'), null);
});

test('resolveHorizontalFeedPromoImage uses event cover only when landscape', () => {
  const portrait = resolveHorizontalFeedPromoImage({
    kind: 'event',
    cityImageUrl: '/images/cities/moscow.png',
    eventImageUrl: 'https://cdn.example.com/poster-800x1200.jpg',
    fallback: '/fallback.jpg',
  });
  assert.equal(portrait.src, '/images/cities/moscow.png');
  assert.equal(portrait.probeEventCover, false);

  const landscape = resolveHorizontalFeedPromoImage({
    kind: 'event',
    cityImageUrl: '/images/cities/moscow.png',
    eventImageUrl: 'https://cdn.example.com/banner-1600x900.jpg',
    fallback: '/fallback.jpg',
  });
  assert.equal(landscape.src, 'https://cdn.example.com/banner-1600x900.jpg');
  assert.equal(landscape.probeEventCover, false);

  const unknown = resolveHorizontalFeedPromoImage({
    kind: 'event',
    cityImageUrl: '/images/cities/moscow.png',
    eventImageUrl: 'https://cdn.example.com/cover.jpg',
    fallback: '/fallback.jpg',
  });
  assert.equal(unknown.src, 'https://cdn.example.com/cover.jpg');
  assert.equal(unknown.probeEventCover, true);
});
