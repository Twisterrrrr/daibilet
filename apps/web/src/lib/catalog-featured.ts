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
