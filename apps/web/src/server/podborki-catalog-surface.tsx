import { PodborkiInteractive } from '@/components/PodborkiInteractive.client';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { PodborkiCatalogSsrFallback } from '@/components/PodborkiCatalogSsrFallback';
import { SiteLayout } from '@/components/SiteLayout';
import { landingCategoryHref, normalizeKnownCitySlug } from '@/lib/landing-routes';
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
import { buildCollectionPageJsonLd } from '@/lib/structured-data';
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
  const citySlug = seo.catalogCity === 'all' ? undefined : seo.catalogCity;
  const jsonLd = buildCollectionPageJsonLd({
    name: seo.h1,
    description: seo.description,
    canonicalPath: seo.canonicalPath,
    items: items
      .filter((item) => item.events > 0)
      .map((item) => ({
        name: item.title,
        path: landingCategoryHref(item.slug, citySlug),
      })),
  });

  return (
    <>
      <JsonLdScripts blocks={[jsonLd]} idPrefix="podborki-list-jsonld" />
      <SiteLayout>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <style>{'html[data-podborki-hydrated="1"] [data-ssr-podborki-list]{display:none}'}</style>
        <PodborkiCatalogSsrFallback
          items={items}
          citySlug={citySlug}
          title={seo.h1}
          description={seo.heroDescription}
        />
        <PodborkiInteractive
            items={items}
            city={seo.catalogCity}
            cities={destinationsPayload.destinations}
            categories={meta.categories}
            totalEvents={totalEvents}
            heroTitle={seo.h1}
            heroDescription={seo.heroDescription}
        />
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
    </>
  );
}

export type { PodborkiCityMetaPilotSlug };
