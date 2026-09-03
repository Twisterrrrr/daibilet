import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATALOG_EVENT_CARD_SIZES,
  CATALOG_IMAGE_QUALITY,
} from './catalog-image-sizes.ts';

test('catalog eventCard sizes match multi-column grid (not 100vw on mobile)', () => {
  assert.equal(CATALOG_IMAGE_QUALITY, 65);
  assert.match(CATALOG_EVENT_CARD_SIZES, /50vw/);
  assert.match(CATALOG_EVENT_CARD_SIZES, /280px/);
  assert.equal(/100vw/.test(CATALOG_EVENT_CARD_SIZES), false);
});
