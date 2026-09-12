import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPreviewCardsMock, PREVIEW_CARDS_MOCK } from './preview-cards-mock.ts';

test('preview cards mock: 10 items, every 4th featured', () => {
  const items = buildPreviewCardsMock();
  assert.equal(items.length, 10);
  assert.deepEqual(
    items.map((item, index) => ({ n: index + 1, featured: item.isFeatured })),
    [
      { n: 1, featured: false },
      { n: 2, featured: false },
      { n: 3, featured: false },
      { n: 4, featured: true },
      { n: 5, featured: false },
      { n: 6, featured: false },
      { n: 7, featured: false },
      { n: 8, featured: true },
      { n: 9, featured: false },
      { n: 10, featured: false },
    ],
  );
  assert.equal(PREVIEW_CARDS_MOCK.filter((item) => item.isFeatured).length, 2);
});
