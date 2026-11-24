import {
  cityPathSegment,
  isLandingCityAllowed,
  landingCategoryHref,
  MULTI_CITY_LANDING_SLUGS,
} from '@/lib/landing-routes';
import { isLandingRouteIndexable } from '@/lib/landing-indexability';

export type LandingSitemapCandidate = {
  citySlug?: string | null;
  offers: number;
  hasEditorialSeoText?: boolean;
};

export type LandingSitemapProvider = {
  landingSlug: string;
  loadCandidates: () => Promise<LandingSitemapCandidate[]>;
};

/**
 * Internal v2 landing sitemap generator. Providers supply live geography and
 * offer counts; the shared landing policy decides indexability; existing route
 * helpers produce the canonical public paths.
 */
export async function buildLandingSitemapV2Paths(
  providers: readonly LandingSitemapProvider[],
): Promise<string[]> {
  const paths = new Set<string>();

  for (const provider of providers) {
    const candidates = await provider.loadCandidates();
    for (const candidate of candidates) {
      const citySlug = candidate.citySlug || null;
      if (citySlug) {
        if (
          !MULTI_CITY_LANDING_SLUGS.has(provider.landingSlug) ||
          !isLandingCityAllowed(provider.landingSlug, citySlug) ||
          !cityPathSegment(citySlug)
        ) {
          continue;
        }
      }

      if (!isLandingRouteIndexable({
        landingSlug: provider.landingSlug,
        citySlugForSeo: citySlug,
        offers: candidate.offers,
        hasEditorialSeoText: candidate.hasEditorialSeoText,
      })) {
        continue;
      }

      const path = landingCategoryHref(provider.landingSlug, citySlug);
      // Avoid silently falling back to the national URL when a geo route
      // cannot be represented by the public URL helpers.
      if (citySlug && path.split('/').at(-1) !== cityPathSegment(citySlug)) continue;
      paths.add(path.replace(/\/$/, '') || '/');
    }
  }

  return [...paths];
}
