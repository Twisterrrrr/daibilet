import { Suspense } from 'react';

import { SiteLayout } from '@/components/SiteLayout';
import { citySlug as cityToSlug } from '@/lib/routes';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
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
      const region = allData.facets.regions.find((item) =>
        item.name && normalizeKnownCitySlug(cityToSlug({ name: item.name })) === normalizedGeoSlug,
      );

      if (city?.name) {
        geoMatched = true;
        initialCity = city.name;
        initialData = await buildNewYearPreviewData({ city: city.name });
      } else if (region?.name) {
        geoMatched = true;
        initialRegion = region.name;
        initialData = await buildNewYearPreviewData({ region: region.name });
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
