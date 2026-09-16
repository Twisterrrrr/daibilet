import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogInterstitialInterval } from './catalog-interstitials.ts';

test('inserts after full rows (2 rows × columns)', () => {
  assert.equal(catalogInterstitialInterval(4), 8);
  assert.equal(catalogInterstitialInterval(6), 12);
  assert.equal(catalogInterstitialInterval(3), 6);
});

test('never returns less than one row', () => {
  assert.equal(catalogInterstitialInterval(0), 2);
  assert.equal(catalogInterstitialInterval(-1), 2);
});
