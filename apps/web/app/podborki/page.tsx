import type { Metadata } from 'next';

import { LandingsCatalogView } from '@/components/LandingsCatalogView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { prisma } from '@/lib/db';
import {
  PODBORKI_CATEGORIES,
  type PodborkiCatalogItem,
  type PodborkiCategoryMeta,
} from '@/lib/podborki-categories';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import { getCachedDestinations, getCachedLandingsCatalog } from '@/server/cached-public-surfaces';

export const revalidate = 600;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const title = pageTitle('Подборки - тематические коллекции событий');
  const description =
    'Готовые подборки на вечер, выходные и бюджет: по типу событий, для кого и сезонные программы.';
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

  const [catalog, destinationsPayload] = await Promise.all([
    getCachedLandingsCatalog(city),
    getCachedDestinations(),
  ]);

  let layoutBySlug = new Map<string, string | null>();
  let categoryBySlug = new Map<string, string | null>();
  let categories: PodborkiCategoryMeta[] = PODBORKI_CATEGORIES;
  try {
    const [layoutRows, categoryRows, dbCategories] = await Promise.all([
      prisma.landing.findMany({
        where: { layoutVariant: { in: ['HERO_FEATURED', 'HERO_TRENDING'] } },
        select: { slug: true, layoutVariant: true },
      }),
      prisma.landing.findMany({
        where: { categoryId: { not: null } },
        select: { slug: true, category: { select: { slug: true } } },
      }),
      prisma.landingCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, title: true, subtitle: true, sortOrder: true },
      }),
    ]);
    layoutBySlug = new Map(
      layoutRows.map((row: { slug: string; layoutVariant: string | null }) => [row.slug, row.layoutVariant]),
    );
    categoryBySlug = new Map(
      categoryRows.map((row: { slug: string; category: { slug: string } | null }) => [
        row.slug,
        row.category?.slug ?? null,
      ]),
    );
    if (dbCategories.length) {
      categories = dbCategories.map(
        (row: { slug: string; title: string; subtitle: string | null; sortOrder: number }) => ({
          slug: row.slug as PodborkiCategoryMeta['slug'],
          title: row.title,
          subtitle: row.subtitle || '',
          sortOrder: row.sortOrder,
        }),
      );
    }
  } catch {
    layoutBySlug = new Map();
    categoryBySlug = new Map();
    categories = PODBORKI_CATEGORIES;
  }

  const items: PodborkiCatalogItem[] = (catalog.items ?? []).map((item) => ({
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    events: item.events,
    priceFrom: item.priceFrom,
    layoutVariant: layoutBySlug.get(item.slug) ?? null,
    categorySlug: categoryBySlug.get(item.slug) ?? null,
  }));

  const totalEvents = destinationsPayload.destinations.reduce(
    (sum, destination) => sum + (destination.events || 0),
    0,
  );

  return (
    <SiteLayout>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <LandingsCatalogView
          items={items}
          city={catalog.city}
          cities={destinationsPayload.destinations}
          categories={categories}
          totalEvents={totalEvents}
        />
      </div>
    </SiteLayout>
  );
}
