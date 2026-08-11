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
import { isPodborkiSeoPilotCitySlug } from '@/lib/podborki-city-seo';
import { parseCatalogPageQuery } from '@/server/catalog-query';
import { getCachedCatalog } from '@/server/cached-catalog-data';
import { getCachedDestinations } from '@/server/cached-public-surfaces';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';

export const revalidate = 300;

type PageProps = {
  params: Promise<{ intent: string; city: string }>;
};

async function resolveCityLabel(citySlug?: string | null) {
  const raw = String(citySlug || '').trim();
  if (!raw || raw === 'all') return { citySlug: null as string | null, cityName: null as string | null };
  const slug = normalizeKnownCitySlug(raw) || raw;
  const fromMap = resolveLandingCityName(slug) || resolveLandingCityName(raw);
  if (fromMap) {
    return { citySlug: slug, cityName: fromMap };
  }
  try {
    const destinations = await getCachedDestinations();
    const match = (destinations.destinations || []).find(
      (item) => item.slug === slug || item.sourceSlug === slug || item.slug === raw || item.sourceSlug === raw || item.name === raw,
    );
    return {
      citySlug: normalizeKnownCitySlug(match?.slug || match?.sourceSlug || slug) || match?.slug || slug,
      cityName: match?.name || slug,
    };
  } catch {
    return { citySlug: slug, cityName: slug };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { intent: raw, city: cityRaw } = await params;
  const intent = resolveCatalogIntent(raw);
  if (!intent) return { title: pageTitle('Подборка не найдена') };

  const { citySlug, cityName } = await resolveCityLabel(decodeURIComponent(cityRaw));
  if (!citySlug || !cityName) return { title: pageTitle(intent.title) };

  const filters = catalogIntentFilterValues(intent);
  const pageQuery = parseCatalogPageQuery({
    city: citySlug,
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

  const title = buildCategoryCityMetaTitle({
    categoryTitle: intent.label,
    cityName,
  });
  const description = buildCategoryCityMetaDescription({
    seekCategory: intent.label.charAt(0).toLowerCase() + intent.label.slice(1),
    categoryTitle: intent.label,
    cityName,
  });
  const path = catalogIntentPath(intent.intent, citySlug);
  const decision = evaluateListingIndexability({
    offers,
    stablePilotIndex: isPodborkiSeoPilotCitySlug(citySlug),
    // Intent pages always have H1 + seoBody skeleton; for pilot cities keep index even at 0.
    hasSeoSkeleton: isPodborkiSeoPilotCitySlug(citySlug),
  });

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

export default async function PodborkiIntentCityPage({ params }: PageProps) {
  const { intent: raw, city: cityRaw } = await params;
  const intent = resolveCatalogIntent(raw);
  if (!intent) notFound();
  const decodedCity = decodeURIComponent(cityRaw);
  const canonicalIntent = canonicalCatalogIntentSlug(raw);
  if (canonicalIntent && raw !== canonicalIntent) {
    permanentRedirect(catalogIntentPath(canonicalIntent, decodedCity));
  }

  const { citySlug, cityName } = await resolveCityLabel(decodedCity);
  if (!citySlug) notFound();

  // Alias city segment → SEO path canon (Group E self-canonical).
  const rawNorm = String(decodedCity || '').trim().toLowerCase();
  if (citySlug !== rawNorm) {
    permanentRedirect(catalogIntentPath(intent.intent, citySlug));
  }

  const filters = catalogIntentFilterValues(intent);
  const pageQuery = parseCatalogPageQuery({
    city: citySlug,
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
