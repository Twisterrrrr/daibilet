import { Suspense } from 'react';

import { LandingsCatalogView } from '@/components/LandingsCatalogView.client';
import { SiteLayout } from '@/components/SiteLayout';
import { normalizeKnownCitySlug } from '@/lib/landing-routes';
import { PODBORKI_CATEGORIES, type PodborkiCatalogItem } from '@/lib/podborki-categories';
import {
  buildPodborkiCityCanonicalPath,
  isPodborkiSeoPilotCitySlug,
  PODBORKI_HUB_SEO,
  resolvePodborkiCatalogSeo,
  resolvePodborkiCityMetaPilot,
} from '@/lib/podborki-city-seo';
import { getLandingSeo } from '@/lib/seo/get-landing-seo';
import { sanitizeEventHtml } from '@/lib/event-description-format';
import {
  getCachedDestinations,
  getCachedLandingsCatalog,
  getCachedPodborkiMeta,
} from '@/server/cached-public-surfaces';
import { findSeoOverride } from '@/server/seo-override';

export type PodborkiCatalogSurfaceSeo = {
  kind: 'hub' | 'pilot' | 'non-pilot';
  title: string;
  description: string;
  h1: string;
  heroDescription: string;
  canonicalPath: string;
  robots: { index: boolean; follow: boolean };
  seoText: string | null;
  /** Catalog city scope for client view (`all` or SEO/path slug). */
  catalogCity: string;
};

function resolveLandingSlug(raw: string): string {
  const value = String(raw || '').trim();
  if (!value || value === 'all') return 'podborki';
  return value;
}

/**
 * Hub / soft `?city=` / marker CHPU city SEO for the podborki catalog surface.
 * Pilot meta uses SeoOverride → template → legacy package; canonical is marker CHPU.
 */
export async function resolvePodborkiCatalogSurfaceSeo(input: {
  rawCity: string;
  rawLanding?: string;
}): Promise<PodborkiCatalogSurfaceSeo> {
  const rawCity = String(input.rawCity || '').trim();
  const hub = resolvePodborkiCatalogSeo(null);
  if (!rawCity || rawCity.toLowerCase() === 'all') {
    return {
      kind: 'hub',
      title: hub.title,
      description: hub.description,
      h1: hub.h1,
      heroDescription: hub.heroDescription,
      canonicalPath: hub.canonicalPath,
      robots: { index: true, follow: true },
      seoText: null,
      catalogCity: 'all',
    };
  }

  const citySlug = normalizeKnownCitySlug(rawCity) || rawCity;
  const metaPilot = resolvePodborkiCityMetaPilot(citySlug);
  const landingSlug = resolveLandingSlug(input.rawLanding || '');

  if (metaPilot) {
    const isSeoPilot = isPodborkiSeoPilotCitySlug(metaPilot.citySlug);
    const dbOverride = isSeoPilot
      ? await findSeoOverride(metaPilot.citySlug, landingSlug)
      : null;
    const seo = isSeoPilot
      ? getLandingSeo({ citySlug: metaPilot.citySlug, landingSlug, dbOverride })
      : null;
    const legacy = resolvePodborkiCatalogSeo(metaPilot.citySlug);
    return {
      kind: 'pilot',
      title: seo?.title || legacy.title,
      description: seo?.description || legacy.description,
      h1: seo?.h1 || legacy.h1,
      heroDescription: legacy.heroDescription,
      canonicalPath: buildPodborkiCityCanonicalPath(metaPilot.citySlug),
      robots: { index: isSeoPilot, follow: true },
      seoText: seo?.seoText || null,
      catalogCity: metaPilot.citySlug,
    };
  }

  return {
    kind: 'non-pilot',
    title: PODBORKI_HUB_SEO.title,
    description: PODBORKI_HUB_SEO.description,
    h1: PODBORKI_HUB_SEO.h1,
    heroDescription: PODBORKI_HUB_SEO.heroDescription,
    canonicalPath: PODBORKI_HUB_SEO.canonicalPath,
    robots: { index: false, follow: true },
    seoText: null,
    catalogCity: citySlug,
  };
}

export async function PodborkiCatalogSurface({
  seo,
}: {
  seo: PodborkiCatalogSurfaceSeo;
}) {
  const emptyCatalog = {
    generatedAt: new Date(0).toISOString(),
    city: 'all',
    items: [] as NonNullable<Awaited<ReturnType<typeof getCachedLandingsCatalog>>>['items'],
  };
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
            city={seo.catalogCity}
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
              dangerouslySetInnerHTML={{ __html: sanitizeEventHtml(seo.seoText) }}
            />
          </section>
        ) : null}
      </div>
    </SiteLayout>
  );
}

export type { PodborkiCityMetaPilotSlug };
