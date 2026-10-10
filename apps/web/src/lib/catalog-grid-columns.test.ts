import assert from 'node:assert/strict';
import test from 'node:test';

import { estimateCatalogGridColumns } from './catalog-grid-columns.ts';

test('estimateCatalogGridColumns: mobile + tablet stay at 2 (no 3-col bento holes)', () => {
  assert.equal(estimateCatalogGridColumns(375, false), 2);
  assert.equal(estimateCatalogGridColumns(767, false), 2);
  assert.equal(estimateCatalogGridColumns(768, false), 2);
  assert.equal(estimateCatalogGridColumns(1023, false), 2);
});

test('estimateCatalogGridColumns: lg = 3, 2xl = 4', () => {
  assert.equal(estimateCatalogGridColumns(1024, false), 3);
  assert.equal(estimateCatalogGridColumns(1440, false), 3);
  assert.equal(estimateCatalogGridColumns(1536, false), 4);
});
