/**
 * Podborki editorial hero roles.
 * Prefer Landing.layoutVariant from DB when catalog exposes it; else slug allowlist + events fallback.
 */
import { isLandingOffSeason } from '@/lib/landing-season';

export const PODBORKI_HERO_FEATURED = 'HERO_FEATURED' as const;
export const PODBORKI_HERO_TRENDING = 'HERO_TRENDING' as const;

/**
 * Season / city pins beat DB HERO_FEATURED and national defaults.
 * Moscow City Day must win over river-cruises / museums when present and in season.
 */
export const PODBORKI_SEASON_FEATURED_SLUGS = ['moscow-city-day'] as const;

/** Seed / fallback featured slugs (synced with migration 20260724020000). */
export const PODBORKI_FEATURED_SLUGS = ['river-cruises', 'bridges-night'] as const;

export const PODBORKI_TRENDING_SLUGS = [
  'moscow-city-day',
  'standup',
  'bus-tours',
  'family-kids',
  'moscow-dinner-boat',
] as const;

/** Never auto-promote as podborki hero when a season pin is available. */
const PODBORKI_HERO_DEMOTE_SLUGS = new Set(['moscow-museums']);

export type PodborkiHeroItem = {
  slug: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
  layoutVariant?: string | null;
};

function isSeasonFeaturedPin(slug: string, now = new Date()): boolean {
  if (!(PODBORKI_SEASON_FEATURED_SLUGS as readonly string[]).includes(slug)) return false;
  return !isLandingOffSeason(slug, now);
}

export function pickPodborkiFeatured(items: PodborkiHeroItem[], now = new Date()): PodborkiHeroItem | null {
  if (!items.length) return null;
  const seasonPin = items.find((item) => isSeasonFeaturedPin(item.slug, now));
  if (seasonPin) return seasonPin;
  const flagged = items.find(
    (item) =>
      item.layoutVariant === PODBORKI_HERO_FEATURED && !PODBORKI_HERO_DEMOTE_SLUGS.has(item.slug),
  );
  if (flagged) return flagged;
  const bySlug = items.find((item) => (PODBORKI_FEATURED_SLUGS as readonly string[]).includes(item.slug));
  if (bySlug) return bySlug;
  return (
    [...items]
      .filter((item) => !PODBORKI_HERO_DEMOTE_SLUGS.has(item.slug))
      .sort((a, b) => b.events - a.events)[0] ??
    [...items].sort((a, b) => b.events - a.events)[0] ??
    null
  );
}

export function pickPodborkiTrending(
  items: PodborkiHeroItem[],
  featuredSlug?: string | null,
  limit = 5,
  now = new Date(),
): PodborkiHeroItem[] {
  const rest = items.filter((item) => item.slug !== featuredSlug);
  const flagged = rest.filter((item) => item.layoutVariant === PODBORKI_HERO_TRENDING);
  if (flagged.length) return flagged.slice(0, limit);
  const bySlug = rest.filter((item) => (PODBORKI_TRENDING_SLUGS as readonly string[]).includes(item.slug));
  if (bySlug.length) {
    return [...bySlug]
      .sort((a, b) => {
        const aPin = isSeasonFeaturedPin(a.slug, now) ? 0 : 1;
        const bPin = isSeasonFeaturedPin(b.slug, now) ? 0 : 1;
        if (aPin !== bPin) return aPin - bPin;
        return b.events - a.events;
      })
      .slice(0, limit);
  }
  return [...rest]
    .filter((item) => !PODBORKI_HERO_DEMOTE_SLUGS.has(item.slug))
    .sort((a, b) => b.events - a.events)
    .slice(0, limit);
}
