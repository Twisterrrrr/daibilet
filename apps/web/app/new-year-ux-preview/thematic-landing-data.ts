import { LANDING_CITY_SLUGS } from '@/lib/landing-city';
import { citySlug as cityToSlug } from '@/lib/routes';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import { resolveLandingRegionName } from '@/lib/landing-region';
import { buildThematicPreviewData } from './preview-data';
import type { PreviewTheme } from './preview-format';

export type ThematicLandingGeo = { city: string | null; region: string | null };

export async function loadThematicLandingData(theme: Exclude<PreviewTheme, 'new-year'>, geoSlug?: string | null) {
  const allData = await buildThematicPreviewData(theme);
  if (!geoSlug) return { allData, data: allData, geo: { city: null, region: null } satisfies ThematicLandingGeo };

  const normalizedGeoSlug = normalizeKnownCitySlug(geoSlug);
  if (!normalizedGeoSlug) return null;
  const city = allData.facets.cities.find((item) => item.name && item.name !== 'Вся Россия' && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === normalizedGeoSlug);
  const knownCityName = city?.name || Object.entries(LANDING_CITY_SLUGS).find(([slug]) => normalizeKnownCitySlug(slug) === normalizedGeoSlug)?.[1] || null;
  if (knownCityName) {
    return {
      allData,
      data: await buildThematicPreviewData(theme, { city: knownCityName }),
      geo: { city: knownCityName, region: null } satisfies ThematicLandingGeo,
    };
  }

  const region = allData.facets.regions.find((item) => item.name && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === normalizedGeoSlug);
  const regionName = region?.name || resolveLandingRegionName(normalizedGeoSlug);
  if (regionName) {
    return {
      allData,
      data: await buildThematicPreviewData(theme, { region: regionName }),
      geo: { city: null, region: regionName } satisfies ThematicLandingGeo,
    };
  }
  return null;
}
