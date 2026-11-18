import { Suspense } from 'react';

import { SiteLayout } from '@/components/SiteLayout';
import { LANDING_CITY_SLUGS } from '@/lib/landing-city';
import { citySlug as cityToSlug } from '@/lib/routes';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import cityRouting from '../../../../data/geo/city-routing.ru.json';
import regionHubs from '../../../../data/geo/region-hubs.ru.json';
import { NewYearUxPreview } from './preview.client';
import { buildNewYearPreviewData } from './preview-data';

/** Reuse the production event selector while resolving the existing geo URL. */
export async function NewYearLandingPage({ geoSlug }: { geoSlug?: string | null }) {
  let initialData: Awaited<ReturnType<typeof buildNewYearPreviewData>> | null = null;
  let initialCity: string | null = null;
  let initialRegion: string | null = null;
  let errorMessage: string | null = null;
  let geoMatched = !geoSlug;

  try {
    const allData = await buildNewYearPreviewData();
    const normalizedGeoSlug = normalizeKnownCitySlug(geoSlug);
    if (normalizedGeoSlug) {
      const city = allData.facets.cities.find((item) =>
        item.name && item.name !== 'Вся Россия' && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === normalizedGeoSlug,
      );
      const knownCityName = city?.name || Object.entries(LANDING_CITY_SLUGS).find(([slug]) =>
        normalizeKnownCitySlug(slug) === normalizedGeoSlug,
      )?.[1] || null;
      const regionFacet = allData.facets.regions.find((item) =>
        item.name && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === normalizedGeoSlug,
      );
      const knownRegions = new Set([
        ...Object.values(cityRouting.cityToRegion),
        ...regionHubs.regionCenters.map((item) => item.regionName),
      ]);
      const knownRegionName = regionFacet?.name || [...knownRegions].find((name) =>
        normalizeKnownCitySlug(cityToSlug({ name })) === normalizedGeoSlug,
      ) || null;

      if (knownCityName) {
        geoMatched = true;
        initialCity = knownCityName;
        initialData = await buildNewYearPreviewData({ city: knownCityName });
      } else if (knownRegionName) {
        geoMatched = true;
        initialRegion = knownRegionName;
        initialData = await buildNewYearPreviewData({ region: knownRegionName });
      }
    } else {
      initialData = allData;
    }
  } catch {
    errorMessage = 'Не удалось получить события из публичного каталога. Обновите страницу позже.';
  }

  if (!geoMatched && !errorMessage) return null;

  return (
    <SiteLayout>
      <Suspense fallback={<div className="min-h-screen bg-[#F7F8F6] p-8 text-sm text-neutral-600">Загружаем новогоднюю афишу…</div>}>
        <NewYearUxPreview
          initialData={initialData}
          initialCity={initialCity}
          initialRegion={initialRegion}
          errorMessage={errorMessage}
        />
      </Suspense>
    </SiteLayout>
  );
}
