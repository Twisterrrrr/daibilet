import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { IntentCollectionView } from '@/components/IntentCollectionView';
import { SiteLayout } from '@/components/SiteLayout';
import {
  catalogIntentFilterValues,
  catalogIntentPath,
  canonicalCatalogIntentSlug,
  resolveCatalogIntent,
} from '@/lib/catalog-intent-routes';
import { resolveLandingCityName } from '@/lib/landing-city';
import {
  buildCategoryCityMetaDescription,
  buildCategoryCityMetaTitle,
  evaluateListingIndexability,
  robotsForListingIndexability,
} from '@/lib/seo-listing-meta';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import { parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';
import { buildPublicDestinationsDto } from '@daibilet/backend/public-read';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ intent: string }>;
};

async function resolveCityLabel(citySlug?: string | null) {
  const slug = String(citySlug || '').trim();
  if (!slug || slug === 'all') return { citySlug: null as string | null, cityName: null as string | null };
  const fromMap = resolveLandingCityName(slug);
  if (fromMap) return { citySlug: slug, cityName: fromMap };
  try {
    const destinations = await buildPublicDestinationsDto();
    const match = (destinations.destinations || []).find(
      (item) => item.slug === slug || item.sourceSlug === slug,
    );
    return {
      citySlug: match?.slug || slug,
      cityName: match?.name || slug,
    };
  } catch {
    return { citySlug: slug, cityName: slug };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { intent: raw } = await params;
  const intent = resolveCatalogIntent(raw);
  if (!intent) return { title: pageTitle('Подборка не найдена') };

  const filters = catalogIntentFilterValues(intent);
  const pageQuery = parseCatalogPageQuery({
    date: filters.date,
    minPrice: filters.minPrice != null ? String(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : undefined,
    sort: filters.sort,
  });

  let offers = 0;
  try {
    const catalog = await getCachedCatalog(pageQuery);
    offers = catalog?.total ?? catalog?.items?.length ?? 0;
  } catch {
    offers = 0;
  }

  const path = catalogIntentPath(intent.intent);
  const decision = evaluateListingIndexability({ offers });
  const title = `${intent.label} ${new Date().getFullYear()} - купить билеты, расписание и цены на Дайбилет`;
  const description = intent.description;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    robots: robotsForListingIndexability(decision.indexable),
    ...buildShareMetadata({
      title,
      description,
      path,
    }),
  };
}

export default async function PodborkiIntentPage({ params }: PageProps) {
  const { intent: raw } = await params;
  const intent = resolveCatalogIntent(raw);
  if (!intent) notFound();
  const canonicalIntent = canonicalCatalogIntentSlug(raw);
  if (canonicalIntent && raw !== canonicalIntent) permanentRedirect(catalogIntentPath(canonicalIntent));

  const { citySlug, cityName } = await resolveCityLabel(null);
  const filters = catalogIntentFilterValues(intent);
  const pageQuery = parseCatalogPageQuery({
    date: filters.date,
    minPrice: filters.minPrice != null ? String(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : undefined,
    sort: filters.sort,
  });

  return (
    <SiteLayout>
      <IntentCollectionView
        intent={intent}
        citySlug={citySlug}
        cityName={cityName}
        pageQuery={pageQuery}
      />
    </SiteLayout>
  );
}
