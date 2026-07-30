import { MIN_DISPLAY_PRICE_RUB } from './catalog-availability.js';
import {
  LANDING_RULES,
  matchingLandingSlugs,
  sessionMatchesLandingSlug,
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

/** City hub landing facet cards from city-scoped sessions (filter events>0 at call site). */
export function buildPublicLandings(sessions: SessionWithLandingSlugs[]): PublicLandingDto[] {
  const slugsBySession = sessions.map((session) => ({
    session,
    slugs: resolveSessionLandingSlugs(session),
  }));

  return LANDING_RULES.map((rule) => {
    const matched = slugsBySession
      .filter(({ slugs }) => sessionMatchesLandingSlug({ landingSlugs: slugs }, rule.slug))
      .map(({ session }) => session);
    const prices = matched
      .map((session) => session.priceFrom)
      .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
    return {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips,
      events: matched.length,
      venues: new Set(matched.map((session) => session.venue).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
    };
  });
}
