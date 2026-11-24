import { LANDING_CITY_SLUGS } from '@/lib/landing-city';
import { citySlug as cityToSlug } from '@/lib/routes';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import { resolveLandingRegionName } from '@/lib/landing-region';
import { buildNewYearPreviewData } from './preview-data';

type PreviewData = Awaited<ReturnType<typeof buildNewYearPreviewData>>;

export type NewYearLandingGeo = { city: string | null; region: string | null };

export async function loadNewYearLandingData(geoSlug?: string | null): Promise<{
  allData: PreviewData;
  data: PreviewData;
  geo: NewYearLandingGeo;
} | null> {
  const allData = await buildNewYearPreviewData();
  if (!geoSlug) return { allData, data: allData, geo: { city: null, region: null } };

  const normalizedGeoSlug = normalizeKnownCitySlug(geoSlug);
  if (!normalizedGeoSlug) return null;

  const city = allData.facets.cities.find((item) =>
    item.name && item.name !== 'Вся Россия' && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === normalizedGeoSlug,
  );
  const knownCityName = city?.name || Object.entries(LANDING_CITY_SLUGS).find(([slug]) =>
    normalizeKnownCitySlug(slug) === normalizedGeoSlug,
  )?.[1] || null;
  if (knownCityName) {
    return {
      allData,
      data: await buildNewYearPreviewData({ city: knownCityName }),
      geo: { city: knownCityName, region: null },
    };
  }

  const regionFacet = allData.facets.regions.find((item) =>
    item.name && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === normalizedGeoSlug,
  );
  const knownRegionName = regionFacet?.name || resolveLandingRegionName(normalizedGeoSlug);
  if (knownRegionName) {
    return {
      allData,
      data: await buildNewYearPreviewData({ region: knownRegionName }),
      geo: { city: null, region: knownRegionName },
    };
  }
  return null;
}
