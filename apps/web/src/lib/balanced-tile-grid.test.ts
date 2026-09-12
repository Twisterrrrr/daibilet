import assert from 'node:assert/strict';
import test from 'node:test';

import { balancedGridColumnCount, balancedTileGridClass } from './balanced-tile-grid.ts';

test('balancedGridColumnCount: one row when fits', () => {
  assert.equal(balancedGridColumnCount(4, 4), 4);
  assert.equal(balancedGridColumnCount(3, 4), 3);
  assert.equal(balancedGridColumnCount(1, 4), 1);
});

test('balancedGridColumnCount: avoid orphan last row', () => {
  assert.equal(balancedGridColumnCount(4, 3), 2); // 2+2, not 3+1
  assert.equal(balancedGridColumnCount(5, 4), 3); // 3+2, not 4+1
  assert.equal(balancedGridColumnCount(5, 3), 3); // 3+2
  assert.equal(balancedGridColumnCount(6, 3), 3); // 3+3
  assert.equal(balancedGridColumnCount(7, 4), 4); // 4+3
});

test('balancedGridColumnCount: prefer larger cols without orphan', () => {
  // 6%4=2 → ok, so max 4 returns 4 (4+2)
  assert.equal(balancedGridColumnCount(6, 4), 4);
});

test('balancedTileGridClass: prefixes', () => {
  assert.equal(balancedTileGridClass(4, { lg: 3 }), 'lg:grid-cols-2');
  assert.equal(balancedTileGridClass(5, { lg: 3, xl: 4 }), 'lg:grid-cols-3 xl:grid-cols-3');
  assert.equal(balancedTileGridClass(4, { lg: 4 }), 'lg:grid-cols-4');
  assert.equal(balancedTileGridClass(8, { lg: 4 }), 'lg:grid-cols-4');
  assert.equal(balancedTileGridClass(4, { lg: 3, xl: 4 }), 'lg:grid-cols-2 xl:grid-cols-4');
});
