import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AFFICHE_IMAGE_QUALITY,
  AFFICHE_POSTER_SIZES,
  BLOG_LISTING_CARD_SIZES,
  BLOG_LISTING_IMAGE_QUALITY,
  CARD_IMAGE_QUALITY,
  CATALOG_EVENT_CARD_SIZES,
  CATALOG_IMAGE_QUALITY,
} from './catalog-image-sizes.ts';

test('catalog eventCard sizes match multi-column grid (not 100vw on mobile)', () => {
  assert.equal(CATALOG_IMAGE_QUALITY, 90);
  assert.equal(CARD_IMAGE_QUALITY, 88);
  assert.equal(AFFICHE_IMAGE_QUALITY, 95);
  assert.ok(AFFICHE_IMAGE_QUALITY >= CARD_IMAGE_QUALITY);
  assert.match(AFFICHE_POSTER_SIZES, /828px/);
  assert.match(CATALOG_EVENT_CARD_SIZES, /50vw/);
  assert.match(CATALOG_EVENT_CARD_SIZES, /480px/);
  assert.equal(/100vw/.test(CATALOG_EVENT_CARD_SIZES), false);
});

test('blog listing budget prefers lean quality and multi-col sizes', () => {
  assert.equal(BLOG_LISTING_IMAGE_QUALITY, 70);
  assert.ok(BLOG_LISTING_IMAGE_QUALITY < CARD_IMAGE_QUALITY);
  assert.match(BLOG_LISTING_CARD_SIZES, /50vw/);
  assert.match(BLOG_LISTING_CARD_SIZES, /33vw/);
});
