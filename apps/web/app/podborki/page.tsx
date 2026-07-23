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
import { prisma } from '@/lib/db';

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

  let layoutBySlug = new Map<string, string | null>();
  try {
    const rows = await prisma.landing.findMany({
      where: { layoutVariant: { in: ['HERO_FEATURED', 'HERO_TRENDING'] } },
      select: { slug: true, layoutVariant: true },
    });
    layoutBySlug = new Map(rows.map((row) => [row.slug, row.layoutVariant]));
  } catch {
    layoutBySlug = new Map();
  }

  const items = (catalog.items ?? []).map((item) => ({
    ...item,
    layoutVariant: layoutBySlug.get(item.slug) ?? null,
  }));

  return (
    <SiteLayout>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <LandingsCatalogView
          items={items}
          city={catalog.city}
          cities={destinationsPayload.destinations}
          tags={tags}
          totalEvents={sessions.length}
        />
      </div>
    </SiteLayout>
  );
}
