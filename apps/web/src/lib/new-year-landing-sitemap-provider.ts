import { citySlug as cityToSlug } from '@/lib/routes';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import { loadNewYearLandingData } from '../../app/new-year-ux-preview/new-year-landing-data';
import type { LandingSitemapCandidate, LandingSitemapProvider } from './landing-sitemap-v2';

function facetGeoSlug(name: string | null | undefined): string | null {
  if (!name || name === 'Вся Россия') return null;
  return normalizeKnownCitySlug(cityToSlug({ name }));
}

/** Live city and region inventory for the New Year pilot, sourced from the
 * same filtered catalogue facets used by the page itself. */
export const newYearLandingSitemapProvider: LandingSitemapProvider = {
  landingSlug: 'new-year',
  async loadCandidates(): Promise<LandingSitemapCandidate[]> {
    const national = await loadNewYearLandingData();
    if (!national) return [];

    const candidates: LandingSitemapCandidate[] = [
      { citySlug: null, offers: national.data.total },
    ];
    const geoSlugs = new Set<string>();
    for (const facet of [...national.allData.facets.cities, ...national.allData.facets.regions]) {
      if (!facet.name || facet.name === 'Вся Россия' || facet.count <= 0) continue;
      const slug = facetGeoSlug(facet.name);
      if (slug) geoSlugs.add(slug);
    }

    // Resolve each candidate through the same loader as the public route. This
    // keeps city/region counts and the sitemap's indexability decision aligned.
    for (const citySlug of geoSlugs) {
      const resolved = await loadNewYearLandingData(citySlug);
      if (!resolved) continue;
      candidates.push({ citySlug, offers: resolved.data.total });
    }

    return candidates;
  },
};
