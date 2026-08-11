import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LandingsCatalogView } from '@/components/LandingsCatalogView.client';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import { PODBORKI_CATEGORIES, type PodborkiCatalogItem } from '@/lib/podborki-categories';
import {
  isPodborkiSeoPilotCitySlug,
  PODBORKI_HUB_SEO,
  resolvePodborkiCatalogSeo,
} from '@/lib/podborki-city-seo';
import { getLandingSeo } from '@/lib/seo/get-landing-seo';
import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';
import {
  getCachedDestinations,
  getCachedLandingsCatalog,
  getCachedPodborkiMeta,
} from '@/server/cached-public-surfaces';
import { findSeoOverride } from '@/server/seo-override';

export const revalidate = 600;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function resolveLandingSlug(raw: string): string {
  const value = String(raw || '').trim();
  if (!value || value === 'all') return 'podborki';
  return value;
}

async function resolveCatalogCitySeo(rawCity: string, rawLanding: string) {
  const hub = resolvePodborkiCatalogSeo(null);
  if (!rawCity || rawCity.toLowerCase() === 'all') {
    return {
      kind: 'hub' as const,
      title: hub.title,
      description: hub.description,
      h1: hub.h1,
      heroDescription: hub.heroDescription,
      canonicalPath: hub.canonicalPath,
      robots: { index: true, follow: true } as const,
      seoText: null as string | null,
    };
  }

  const citySlug = normalizeKnownCitySlug(rawCity) || rawCity;
  const landingSlug = resolveLandingSlug(rawLanding);
  const isPilot = isPodborkiSeoPilotCitySlug(citySlug);

  if (isPilot) {
    const dbOverride = await findSeoOverride(citySlug, landingSlug);
    const seo = getLandingSeo({ citySlug, landingSlug, dbOverride });
    // Self-canonical on SEO path slug (not broken owner sample).
    const canonicalPath = `/podborki?city=${encodeURIComponent(citySlug)}`;
    const legacy = resolvePodborkiCatalogSeo(citySlug);
    return {
      kind: 'pilot' as const,
      title: seo.title,
      description: seo.description,
      h1: seo.h1 || legacy.h1,
      heroDescription: legacy.heroDescription,
      canonicalPath,
      robots: { index: true, follow: true } as const,
      seoText: seo.seoText,
    };
  }

  // Non-pilot `?city=` - keep hub copy, noindex (owner sample). Hub itself stays indexable above.
  return {
    kind: 'non-pilot' as const,
    title: PODBORKI_HUB_SEO.title,
    description: PODBORKI_HUB_SEO.description,
    h1: PODBORKI_HUB_SEO.h1,
    heroDescription: PODBORKI_HUB_SEO.heroDescription,
    canonicalPath: PODBORKI_HUB_SEO.canonicalPath,
    robots: { index: false, follow: true } as const,
    seoText: null as string | null,
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const seo = await resolveCatalogCitySeo(
    firstQueryValue(params.city),
    firstQueryValue(params.landing),
  );
  const title = pageTitle(seo.title);
  return {
    title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    robots: seo.robots,
    ...buildShareMetadata({
      title: `${title} | Дайбилет`,
      description: seo.description,
      path: seo.canonicalPath,
    }),
  };
}

/**
 * Catalog SSR still loads city=all landings; LandingsCatalogView refetches
 * `/api/public/landings-catalog?city=` when a city is selected.
 * Pilot `?city=` gets unique SSR meta + H1 via templates / SeoOverride.
 * Hub `/podborki` and `?city=all` stay indexable. Non-pilot city query → noindex.
 */
export default async function PodborkiCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const seo = await resolveCatalogCitySeo(
    firstQueryValue(params.city),
    firstQueryValue(params.landing),
  );

  const emptyCatalog = { generatedAt: new Date(0).toISOString(), city: 'all', items: [] as NonNullable<
    Awaited<ReturnType<typeof getCachedLandingsCatalog>>
  >['items'] };
  const emptyDestinations = {
    generatedAt: new Date(0).toISOString(),
    destinations: [] as Awaited<ReturnType<typeof getCachedDestinations>>['destinations'],
  };

  const [catalogResult, destinationsResult, metaResult] = await Promise.allSettled([
    getCachedLandingsCatalog('all'),
    getCachedDestinations(),
    getCachedPodborkiMeta(),
  ]);

  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : emptyCatalog;
  const destinationsPayload =
    destinationsResult.status === 'fulfilled' ? destinationsResult.value : emptyDestinations;
  const meta =
    metaResult.status === 'fulfilled'
      ? metaResult.value
      : { layoutBySlug: {}, categoryBySlug: {}, categories: PODBORKI_CATEGORIES };

  const items: PodborkiCatalogItem[] = (catalog.items ?? []).map((item) => ({
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    events: item.events,
    priceFrom: item.priceFrom,
    layoutVariant: meta.layoutBySlug[item.slug] ?? null,
    categorySlug: meta.categoryBySlug[item.slug] ?? null,
  }));

  const totalEvents = destinationsPayload.destinations.reduce(
    (sum, destination) => sum + (destination.events || 0),
    0,
  );

  return (
    <SiteLayout>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Suspense
          fallback={
            <div aria-busy="true" aria-label="Загрузка подборок">
              <div className="border-b border-slate-100 bg-white">
                <div className="container-page space-y-4 py-10 sm:py-14">
                  <div className="h-8 w-2/3 max-w-md animate-pulse rounded-lg bg-slate-200/90" />
                  <div className="h-4 w-1/2 max-w-sm animate-pulse rounded bg-slate-200/70" />
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="h-9 w-24 animate-pulse rounded-full bg-slate-200/80" />
                    <span className="h-9 w-28 animate-pulse rounded-full bg-slate-200/60" />
                    <span className="h-9 w-20 animate-pulse rounded-full bg-slate-200/60" />
                  </div>
                </div>
              </div>
              <div className="container-page py-10">
                <div className="h-6 w-40 animate-pulse rounded bg-slate-200/80" />
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-200/70" />
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <LandingsCatalogView
            items={items}
            city="all"
            cities={destinationsPayload.destinations}
            categories={meta.categories}
            totalEvents={totalEvents}
            heroTitle={seo.h1}
            heroDescription={seo.heroDescription}
          />
        </Suspense>
        {seo.seoText ? (
          <section className="container-page border-t border-slate-200 py-10">
            <div
              className="prose prose-slate max-w-3xl text-sm leading-relaxed text-slate-600"
              dangerouslySetInnerHTML={{ __html: seo.seoText }}
            />
          </section>
        ) : null}
      </div>
    </SiteLayout>
  );
}
