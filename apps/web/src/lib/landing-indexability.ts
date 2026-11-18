import { hasSeoListingEditorial } from '@/data/seo-listing-texts';
import { canonicalLandingSlug } from '@/lib/landing-constants';
import { isPodborkiSeoPilotCitySlug } from '@/lib/podborki-city-seo';
import { evaluateListingIndexability, MIN_LISTING_OFFERS_FOR_INDEX } from '@/lib/seo-listing-meta';
import { shouldNoindexSeasonalLanding } from '@/lib/landing-season';

const YEAR_ROUND_SEO_SKELETON_LANDINGS = new Set<string>(['salute-9-may']);

export type LandingRouteIndexabilityInput = {
  landingSlug: string;
  citySlugForSeo?: string | null;
  offers: number | null | undefined;
  hasEditorialSeoText?: boolean;
};

/** Shared by route metadata and sitemaps so their indexability rules cannot drift. */
export function isLandingRouteIndexable(
  input: LandingRouteIndexabilityInput,
  now?: Date,
): boolean {
  const slug = canonicalLandingSlug(input.landingSlug);
  const offers = Number(input.offers) || 0;
  const thresholdDecision = evaluateListingIndexability({
    offers,
    minOffers: MIN_LISTING_OFFERS_FOR_INDEX,
    hasEditorialSeoText:
      Boolean(input.hasEditorialSeoText) ||
      Boolean(input.citySlugForSeo && hasSeoListingEditorial(slug, input.citySlugForSeo)),
    stablePilotIndex: Boolean(
      input.citySlugForSeo && isPodborkiSeoPilotCitySlug(input.citySlugForSeo),
    ),
    hasSeoSkeleton: YEAR_ROUND_SEO_SKELETON_LANDINGS.has(slug),
  });

  const seasonNoindex = now
    ? shouldNoindexSeasonalLanding(slug, offers, now)
    : shouldNoindexSeasonalLanding(slug, offers);
  return thresholdDecision.indexable && !seasonNoindex;
}
