import type { Metadata } from 'next';

import { LandingsCatalogView } from '@/components/LandingsCatalogView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { collectPopularTags } from '@/lib/catalog-tags';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import {
  buildPublicDestinationsDto,
  buildPublicLandingsCatalogDto,
  getPublicCatalogSessions,
} from '@daibilet/backend/public-read';

export const revalidate = 3600;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const title = pageTitle('Подборки - тематические коллекции событий');
  const description =
    'Готовые подборки на вечер, выходные и бюджет, популярные запросы и теги - с переходом в каталог с нужными фильтрами.';
  return {
    title,
    description,
    alternates: { canonical: '/podborki' },
    ...buildShareMetadata({
      title: `${title} | Дайбилет`,
      description,
      path: '/podborki',
    }),
  };
}

export default async function PodborkiCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const city = typeof params.city === 'string' ? params.city : 'all';
  const urlParams = new URLSearchParams();
  if (city && city !== 'all') urlParams.set('city', city);

  const [catalog, destinationsPayload, sessions] = await Promise.all([
    buildPublicLandingsCatalogDto(urlParams),
    buildPublicDestinationsDto(),
    getPublicCatalogSessions(),
  ]);

  const tags = collectPopularTags(sessions, 24);

  return (
    <SiteLayout>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <LandingsCatalogView
          items={catalog.items}
          city={catalog.city}
          cities={destinationsPayload.destinations}
          tags={tags}
          totalEvents={sessions.length}
        />
      </div>
    </SiteLayout>
  );
}
