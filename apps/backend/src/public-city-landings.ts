import { MIN_DISPLAY_PRICE_RUB } from './catalog-availability.js';
import {
  LANDING_RULES,
  sessionMatchesLandingSlug,
} from './landing-rules.js';
import type { PublicLandingDto } from './types/public.js';

interface SessionWithLandingSlugs {
  landingSlugs?: string[] | null;
  priceFrom?: number | null;
  venue?: string | null;
}

/** City hub landing facet cards from precomputed session.landingSlugs. */
export function buildPublicLandings(sessions: SessionWithLandingSlugs[]): PublicLandingDto[] {
  return LANDING_RULES.map((rule) => {
    const matched = sessions.filter((session) => sessionMatchesLandingSlug(session, rule.slug));
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
