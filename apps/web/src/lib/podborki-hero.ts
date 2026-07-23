/**
 * Podborki editorial hero roles.
 * Prefer Landing.layoutVariant from DB when catalog exposes it; else slug allowlist + events fallback.
 */
export const PODBORKI_HERO_FEATURED = 'HERO_FEATURED' as const;
export const PODBORKI_HERO_TRENDING = 'HERO_TRENDING' as const;

/** Seed / fallback featured slugs (synced with migration 20260724020000). */
export const PODBORKI_FEATURED_SLUGS = ['river-cruises', 'bridges-night'] as const;

export const PODBORKI_TRENDING_SLUGS = ['standup', 'bus-tours', 'family-kids', 'moscow-dinner-boat'] as const;

export type PodborkiHeroItem = {
  slug: string;
  title: string;
  subtitle?: string | null;
  events: number;
  priceFrom?: number | null;
  layoutVariant?: string | null;
};

export function pickPodborkiFeatured(items: PodborkiHeroItem[]): PodborkiHeroItem | null {
  if (!items.length) return null;
  const flagged = items.find((item) => item.layoutVariant === PODBORKI_HERO_FEATURED);
  if (flagged) return flagged;
  const bySlug = items.find((item) => (PODBORKI_FEATURED_SLUGS as readonly string[]).includes(item.slug));
  if (bySlug) return bySlug;
  return [...items].sort((a, b) => b.events - a.events)[0] ?? null;
}

export function pickPodborkiTrending(items: PodborkiHeroItem[], featuredSlug?: string | null, limit = 3): PodborkiHeroItem[] {
  const rest = items.filter((item) => item.slug !== featuredSlug);
  const flagged = rest.filter((item) => item.layoutVariant === PODBORKI_HERO_TRENDING);
  if (flagged.length) return flagged.slice(0, limit);
  const bySlug = rest.filter((item) => (PODBORKI_TRENDING_SLUGS as readonly string[]).includes(item.slug));
  if (bySlug.length) {
    return [...bySlug].sort((a, b) => b.events - a.events).slice(0, limit);
  }
  return [...rest].sort((a, b) => b.events - a.events).slice(0, limit);
}
