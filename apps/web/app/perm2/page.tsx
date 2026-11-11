import type { Metadata } from 'next';

import { CityHubPreview } from '@/components/CityHubPreview';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { resolveCityInfo } from '@/lib/cityInfo';
import { loadCityDto } from '@/server/cached-city-data';

export const metadata: Metadata = {
  title: 'Пермь - превью нового дизайна',
  robots: { index: false, follow: false },
  alternates: { canonical: '/perm2' },
};

export default async function Perm2Page() {
  const loaded = await loadCityDto('perm');
  const guide = resolveCityInfo('perm');

  if (loaded.kind !== 'ok' || !guide) {
    return (
      <SiteLayout chromeVariant="v2">
        <div className="container-page py-16">
          <h1 className="font-display text-2xl font-bold text-ink">Пермь временно недоступна</h1>
          <p className="mt-2 text-sm text-ink-muted">Не удалось загрузить данные города.</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout chromeVariant="v2">
      <CityHubPreview payload={loaded.payload} guide={guide} />
    </SiteLayout>
  );
}