import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';
import { isEditorsPickEvent, isRecommendBadgeEvent } from './home-showcase-sections.ts';

/** One visual anchor roughly every N cards in `/events` grid. */
export const CATALOG_FEATURED_EVERY = 7;

function slugHash(value: string): number {
  let hash = 0;
  const raw = String(value || '');
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function sessionFeatureKey(session: Pick<PublicCatalogListItemDto, 'id' | 'slug'>): string {
  return String(session.slug || session.id || '').trim() || session.id;
}

/**
 * Stable featured set for catalog grid (SSR === hydrate).
 * Prefer editorial PINNED / recommend-badge candidates; otherwise pin 1 per window by slug hash.
 */
export function pickCatalogFeaturedIds(
  items: PublicCatalogListItemDto[],
  every: number = CATALOG_FEATURED_EVERY,
): Set<string> {
  const featured = new Set<string>();
  if (!items.length || every < 2) return featured;

  for (const item of items) {
    if (isEditorsPickEvent(item) || isRecommendBadgeEvent(item)) {
      featured.add(item.id);
    }
  }

  for (let start = 0; start < items.length; start += every) {
    const window = items.slice(start, start + every);
    if (window.some((item) => featured.has(item.id))) continue;
    let best = window[0]!;
    let bestScore = slugHash(sessionFeatureKey(best));
    for (let i = 1; i < window.length; i += 1) {
      const candidate = window[i]!;
      const score = slugHash(sessionFeatureKey(candidate));
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    featured.add(best.id);
  }

  return featured;
}

export function isCatalogFeaturedId(featuredIds: Set<string>, id: string): boolean {
  return featuredIds.has(id);
}

/**
 * Editorial bento unit: large featured + two regular cards stacked beside it.
 * Avoids the awkward CSS `col-span-2` + one skinny neighbor layout.
 */
export type CatalogFeaturedCluster = {
  kind: 'cluster';
  featured: PublicCatalogListItemDto;
  stack: [PublicCatalogListItemDto, PublicCatalogListItemDto];
};

export type CatalogFeaturedCard = {
  kind: 'card';
  session: PublicCatalogListItemDto;
  /** Badge-only when we could not form a 1+2 cluster (end of list / adjacent featured). */
  featured: boolean;
};

export type CatalogFeaturedUnit = CatalogFeaturedCluster | CatalogFeaturedCard;

/**
 * Pack list into equal cards + editorial clusters (featured left, two stacked right).
 * If featured lacks two following non-featured partners → single card with badge only.
 */
export function packCatalogFeaturedUnits(
  items: PublicCatalogListItemDto[],
  featuredIds: Set<string>,
): CatalogFeaturedUnit[] {
  const units: CatalogFeaturedUnit[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i]!;
    if (!featuredIds.has(item.id)) {
      units.push({ kind: 'card', session: item, featured: false });
      i += 1;
      continue;
    }

    const stack: PublicCatalogListItemDto[] = [];
    let j = i + 1;
    while (j < items.length && stack.length < 2) {
      const candidate = items[j]!;
      if (featuredIds.has(candidate.id)) break;
      stack.push(candidate);
      j += 1;
    }

    if (stack.length === 2) {
      units.push({
        kind: 'cluster',
        featured: item,
        stack: [stack[0]!, stack[1]!],
      });
      i = j;
      continue;
    }

    units.push({ kind: 'card', session: item, featured: true });
    i += 1;
  }
  return units;
}

/** Expand a cluster into three equal-grid cards (hero keeps featured badge). */
export function flattenCatalogFeaturedUnit(unit: CatalogFeaturedUnit): CatalogFeaturedCard[] {
  if (unit.kind === 'card') return [unit];
  return [
    { kind: 'card', session: unit.featured, featured: true },
    { kind: 'card', session: unit.stack[0], featured: false },
    { kind: 'card', session: unit.stack[1], featured: false },
  ];
}

/**
 * Layout units by column count.
 * - 1–2 columns (mobile/tablet): flatten clusters → equal tiles + badge only.
 *   No bento / no col-span / no display:contents (that left visual holes on tablet).
 * - 3+ columns (lg+): keep magazine bento only at row start; demote if cursor ≠ 0.
 */
export function layoutCatalogFeaturedUnits(
  units: CatalogFeaturedUnit[],
  columns: number,
): CatalogFeaturedUnit[] {
  const cols = Math.max(1, Math.floor(columns) || 1);
  if (cols < 3) {
    const flat: CatalogFeaturedUnit[] = [];
    for (const unit of units) {
      for (const card of flattenCatalogFeaturedUnit(unit)) {
        flat.push(card);
      }
    }
    return flat;
  }

  const out: CatalogFeaturedUnit[] = [];
  let cursor = 0;
  for (const unit of units) {
    if (unit.kind === 'card') {
      out.push(unit);
      cursor = (cursor + 1) % cols;
      continue;
    }
    // Full-row bento occupies the entire track row; cursor resets after it.
    if (cursor === 0) {
      out.push(unit);
      cursor = 0;
      continue;
    }
    for (const card of flattenCatalogFeaturedUnit(unit)) {
      out.push(card);
      cursor = (cursor + 1) % cols;
    }
  }
  return out;
}

/** Featured ids from preview mock `isFeatured` flags (smoke harness only). */
export function featuredIdsFromPreviewFlags(
  items: Array<Pick<PublicCatalogListItemDto, 'id'> & { isFeatured?: boolean }>,
): Set<string> {
  const featured = new Set<string>();
  for (const item of items) {
    if (item.isFeatured) featured.add(item.id);
  }
  return featured;
}
