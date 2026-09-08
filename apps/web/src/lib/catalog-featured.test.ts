import assert from 'node:assert/strict';
import test from 'node:test';

import { CATALOG_FEATURED_EVERY, pickCatalogFeaturedIds } from './catalog-featured.ts';
import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

function stubItem(
  id: string,
  slug: string,
  extra: Partial<PublicCatalogListItemDto> = {},
): PublicCatalogListItemDto {
  return {
    id,
    slug,
    title: slug,
    startsAt: '2026-09-10T12:00:00+03:00',
    ...extra,
  } as PublicCatalogListItemDto;
}

test('pickCatalogFeaturedIds: stable across calls (SSR = hydrate)', () => {
  const items = Array.from({ length: 21 }, (_, i) => stubItem(`id-${i}`, `slug-${i}`));
  const a = [...pickCatalogFeaturedIds(items)].sort();
  const b = [...pickCatalogFeaturedIds(items)].sort();
  assert.deepEqual(a, b);
  assert.ok(a.length >= Math.floor(items.length / CATALOG_FEATURED_EVERY));
});

test('pickCatalogFeaturedIds: PINNED always featured', () => {
  const items = [
    stubItem('a', 'alpha'),
    stubItem('b', 'beta', { manualLandingStatus: 'PINNED' }),
    stubItem('c', 'gamma'),
  ];
  const featured = pickCatalogFeaturedIds(items, 7);
  assert.equal(featured.has('b'), true);
});

test('pickCatalogFeaturedIds: at least one pin per window when no editorial', () => {
  const items = Array.from({ length: 14 }, (_, i) => stubItem(`id-${i}`, `event-${i}`));
  const featured = pickCatalogFeaturedIds(items, 7);
  const firstWindow = items.slice(0, 7).some((item) => featured.has(item.id));
  const secondWindow = items.slice(7, 14).some((item) => featured.has(item.id));
  assert.equal(firstWindow, true);
  assert.equal(secondWindow, true);
});
