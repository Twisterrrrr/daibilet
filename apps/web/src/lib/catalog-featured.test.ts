import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATALOG_FEATURED_EVERY,
  flattenCatalogFeaturedUnit,
  layoutCatalogFeaturedUnits,
  packCatalogFeaturedUnits,
  pickCatalogFeaturedIds,
} from './catalog-featured.ts';
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

test('packCatalogFeaturedUnits: featured + 2 partners → cluster', () => {
  const items = Array.from({ length: 6 }, (_, i) => stubItem(`id-${i}`, `slug-${i}`));
  const featuredIds = new Set(['id-3']);
  const units = packCatalogFeaturedUnits(items, featuredIds);
  assert.equal(units.length, 4);
  assert.equal(units[0]?.kind, 'card');
  assert.equal(units[1]?.kind, 'card');
  assert.equal(units[2]?.kind, 'card');
  assert.equal(units[3]?.kind, 'cluster');
  if (units[3]?.kind === 'cluster') {
    assert.equal(units[3].featured.id, 'id-3');
    assert.equal(units[3].stack[0].id, 'id-4');
    assert.equal(units[3].stack[1].id, 'id-5');
  }
});

test('layoutCatalogFeaturedUnits: 1–2 col flatten clusters to equal cards', () => {
  const items = Array.from({ length: 6 }, (_, i) => stubItem(`id-${i}`, `slug-${i}`));
  const packed = packCatalogFeaturedUnits(items, new Set(['id-0']));
  assert.equal(packed[0]?.kind, 'cluster');
  for (const cols of [1, 2]) {
    const layout = layoutCatalogFeaturedUnits(packed, cols);
    assert.equal(layout.length, 6, `cols=${cols}`);
    assert.ok(layout.every((unit) => unit.kind === 'card'), `cols=${cols}`);
    assert.equal(layout[0]?.kind, 'card');
    if (layout[0]?.kind === 'card') {
      assert.equal(layout[0].featured, true);
      assert.equal(layout[0].session.id, 'id-0');
    }
  }
});

test('layoutCatalogFeaturedUnits: 3-col keeps aligned cluster, demotes misaligned', () => {
  const items = Array.from({ length: 10 }, (_, i) => stubItem(`id-${i}`, `slug-${i}`));
  // every 4th like preview mock: id-3, id-7
  const packed = packCatalogFeaturedUnits(items, new Set(['id-3', 'id-7']));
  const layout = layoutCatalogFeaturedUnits(packed, 3);
  const clusters = layout.filter((unit) => unit.kind === 'cluster');
  // After 3 cards, first cluster aligns; after it cursor=0 but only 1 card (id-6) before second featured → demote
  assert.equal(clusters.length, 1);
  assert.ok(layout.some((unit) => unit.kind === 'card' && unit.featured && unit.session.id === 'id-7'));
});

test('flattenCatalogFeaturedUnit: hero keeps featured flag', () => {
  const featured = stubItem('f', 'feat');
  const a = stubItem('a', 'a');
  const b = stubItem('b', 'b');
  const flat = flattenCatalogFeaturedUnit({ kind: 'cluster', featured, stack: [a, b] });
  assert.equal(flat.length, 3);
  assert.equal(flat[0]?.featured, true);
  assert.equal(flat[1]?.featured, false);
  assert.equal(flat[2]?.featured, false);
});
