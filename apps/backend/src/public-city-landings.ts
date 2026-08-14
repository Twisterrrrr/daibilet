import { MIN_DISPLAY_PRICE_RUB } from './catalog-availability.js';
import {
  LANDING_RULES,
  LANDING_SLUG_ALIASES,
  matchingLandingSlugs,
  resolveLandingRuleBySlug,
  type LandingMatchCandidate,
} from './landing-rules.js';
import type { PublicLandingDto } from './types/public.js';

interface SessionWithLandingSlugs extends LandingMatchCandidate {
  landingSlugs?: string[] | null;
  priceFrom?: number | null;
  venue?: string | null;
}

function hasLandingMatchFields(session: SessionWithLandingSlugs): boolean {
  return Boolean(
    session.title ||
      session.category ||
      session.sourceCategory ||
      session.venue ||
      (session.tags && session.tags.length) ||
      (session.subcategories && session.subcategories.length),
  );
}

/**
 * Resolve landing slugs for a city-scoped session.
 * When content fields exist, rematch with current rules (ignore stale landingSlugs).
 */
export function resolveSessionLandingSlugs(session: SessionWithLandingSlugs): string[] {
  if (hasLandingMatchFields(session)) {
    return matchingLandingSlugs(session);
  }
  return (session.landingSlugs || []).map((value) => String(value || '').toLowerCase()).filter(Boolean);
}

function normalizeCachedLandingSlugs(session: SessionWithLandingSlugs): string[] {
  return (session.landingSlugs || [])
    .map((value) => String(value || '').toLowerCase())
    .filter(Boolean);
}

type LandingAgg = {
  events: number;
  venues: Set<string>;
  priceFrom: number | null;
};

/**
 * Landing facet cards from sessions.
 * preferCachedSlugs: use catalog landingSlugs (already matched at map time) - avoids O(n*rules)
 * rematch that made /api/public/home cold rebuild pay ~1.5s CPU.
 * Aggregation is O(sessions * slugsPerSession), not O(sessions * LANDING_RULES).
 */
export function buildPublicLandings(
  sessions: SessionWithLandingSlugs[],
  options: { preferCachedSlugs?: boolean } = {},
): PublicLandingDto[] {
  const preferCached = options.preferCachedSlugs === true;
  const bySlug = new Map<string, LandingAgg>();
  const aliasToCanonical = new Map<string, string>();
  for (const rule of LANDING_RULES) {
    bySlug.set(rule.slug, { events: 0, venues: new Set(), priceFrom: null });
    aliasToCanonical.set(rule.slug, rule.slug);
    for (const alias of LANDING_SLUG_ALIASES[rule.slug] || []) {
      aliasToCanonical.set(String(alias).toLowerCase(), rule.slug);
    }
  }

  for (const session of sessions) {
    // When preferCachedSlugs: never rematch - empty cached slugs stay empty (home cold path).
    const slugs = preferCached
      ? normalizeCachedLandingSlugs(session)
      : resolveSessionLandingSlugs(session);
    if (!slugs.length) continue;
    const price =
      Number.isFinite(session.priceFrom) && Number(session.priceFrom) >= MIN_DISPLAY_PRICE_RUB
        ? Number(session.priceFrom)
        : null;
    const venue = session.venue ? String(session.venue) : '';
    const seenCanonical = new Set<string>();
    for (const raw of slugs) {
      let canonical = aliasToCanonical.get(raw);
      if (!canonical) {
        canonical = resolveLandingRuleBySlug(raw)?.slug || '';
        if (canonical) aliasToCanonical.set(raw, canonical);
      }
      if (!canonical || seenCanonical.has(canonical)) continue;
      const agg = bySlug.get(canonical);
      if (!agg) continue;
      seenCanonical.add(canonical);
      agg.events += 1;
      if (venue) agg.venues.add(venue);
      if (price != null && (agg.priceFrom == null || price < agg.priceFrom)) agg.priceFrom = price;
    }
  }

  return LANDING_RULES.map((rule) => {
    const agg = bySlug.get(rule.slug) || { events: 0, venues: new Set<string>(), priceFrom: null };
    return {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips,
      events: agg.events,
      venues: agg.venues.size,
      priceFrom: agg.priceFrom,
      imageUrl: null,
      strength: agg.events >= 20 ? 'ready' : agg.events > 0 ? 'seed' : 'empty',
    };
  });
}
