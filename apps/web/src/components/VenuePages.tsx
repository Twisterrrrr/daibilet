import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { permanentRedirect } from 'next/navigation';
import { Suspense } from 'react';

import { LocationsCatalogView } from '@/components/LocationsCatalogView.client';
import { VenuesCatalogView } from '@/components/VenuesCatalogView.client';
import { VenuePageView } from '@/components/VenuePageView.client';
import { VenueCatalogPageSkeleton } from '@/components/VenueCatalogSkeletons';
import { JsonLdScripts } from '@/components/JsonLdScripts';
import { SiteLayout } from '@/components/SiteLayout';
import '@/lib/env';
import {
  mapVenueCatalogFeedPage,
  venueCatalogDefaultQueryKey,
  VENUE_CATALOG_PAGE_SIZE,
} from '@/lib/venue-catalog-feed';
import { evaluateVenueIndexability, robotsForIndexability } from '@/lib/hub-indexability';
import { venueHref, venueCanonicalPath, venuePageTemplate } from '@/lib/routes';
import { safeNotFound } from '@/lib/safe-not-found';
import { pageTitle, buildShareMetadata } from '@/lib/seo-meta';
import { getCachedVenuesCatalog } from '@/server/cached-public-surfaces';
import { getCachedPublicVenueDto } from '@/server/cached-venue-data';
import { fetchVenueAdmissionProducts } from '@/server/finance-projection-client';
import type { FinanceAdmissionListResult } from '@/lib/finance-projection';
import { withSoftTimeout } from '@/lib/soft-timeout';
import { buildVenuePageJsonLd } from '@/lib/structured-data';
import { resolveVenueSeoTitle } from '@/lib/venue-seo';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import { applyVenueEditorialOverlay } from '@/lib/venue-editorial-content';
import type { PublicVenuePageDto } from '@daibilet/contracts/public';

/** Admission must not hang venue HTML when finance is slow. */
const VENUE_ADMISSION_TIMEOUT_MS = 2500;
/** Catalog list soft budget; with API hub SWR warm hits stay <<1s. */
const VENUE_LIST_TIMEOUT_MS = 6000;
const VENUE_LIST_RETRY_TIMEOUT_MS = 2500;

const EMPTY_ADMISSION: FinanceAdmissionListResult = {
  items: [],
  summary: { published: 0, canSell: 0 },
  total: 0,
};

const EMPTY_FEED = mapVenueCatalogFeedPage({
  generatedAt: new Date(0).toISOString(),
  total: 0,
  venues: [],
  page: 1,
  nextCursor: null,
  hasMore: false,
  limit: VENUE_CATALOG_PAGE_SIZE,
});

type VenueDtoLoad =
  | { kind: 'ok'; payload: PublicVenuePageDto }
  | { kind: 'miss' }
  | { kind: 'unavailable' };

/**
 * Prefer cached DTO only. Miss → safeNotFound without any bare `cache:'no-store'`
 * fetch (that + notFound on ISR → DYNAMIC_SERVER_USAGE / static-to-dynamic 500).
 * Soft-misses already bypass Data Cache via throw-inside-cache (v7-isr-fetch).
 * Transient API errors throw from getCachedPublicVenueDto → unavailable (not HTML 404 poison).
 */
async function loadVenueDto(slug: string): Promise<VenueDtoLoad> {
  const key = String(slug || '').trim();
  if (!key) return { kind: 'miss' };

  try {
    const cached = await getCachedPublicVenueDto(key);
    if (cached?.venue) return { kind: 'ok', payload: cached };
    return { kind: 'miss' };
  } catch {
    return { kind: 'unavailable' };
  }
}

function resolveVenueRouteFamily(venue: PublicVenuePageDto['venue']): 'location' | 'institution' {
  const explicit = String(
    (venue as { template?: string | null }).template ||
      (venue as { pageTemplate?: string | null }).pageTemplate ||
      '',
  )
    .trim()
    .toLowerCase();
  if (explicit === 'location' || explicit === 'institution') return explicit;
  return venuePageTemplate(venue.type);
}

function VenueUnavailablePage({ slug }: { slug: string }) {
  return (
    <SiteLayout>
      <main style={{ maxWidth: 640, margin: '4rem auto', padding: '0 1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Площадка временно недоступна</h1>
        <p style={{ color: '#444', lineHeight: 1.5 }}>
          Не удалось загрузить данные для <code>{slug}</code>. Обновите страницу чуть позже.
        </p>
      </main>
    </SiteLayout>
  );
}

type PageProps = {
  params: Promise<{ slug: string }>;
  family: 'institution' | 'location';
  listPath: '/venues' | '/locations';
};

export async function generateVenueListMetadata(
  title: string,
  description: string,
  listPath: '/venues' | '/locations' = '/venues',
): Promise<Metadata> {
  const cleanTitle = pageTitle(title);
  const shareTitle = `${cleanTitle} | Дайбилет`;
  return {
    title: cleanTitle,
    description,
    alternates: { canonical: listPath },
    ...buildShareMetadata({
      title: shareTitle,
      description,
      path: listPath,
    }),
  };
}

export async function generateVenueDetailMetadata(slug: string): Promise<Metadata> {
  const loaded = await loadVenueDto(decodeURIComponent(slug));
  if (loaded.kind === 'miss') safeNotFound();
  if (loaded.kind === 'unavailable') {
    // Do NOT await connection()/noStore() here: on ISR (`revalidate`) that digest
    // DYNAMIC_SERVER_USAGE surfaces as HTTP 500 (2026-08-09 bar-hroniki / gastro PDP).
    // Soft metadata may live ≤ revalidate (300s) - acceptable vs crashing the PDP.
    return {
      title: pageTitle('Площадка временно недоступна'),
      robots: { index: false, follow: false },
    };
  }
  const payload = loaded.payload;
  const venue = applyVenueEditorialOverlay(payload.venue);
  const heroForShare =
    resolveVenueHeroImage(venue.slug || slug, venue.heroImageUrl) || venue.heroImageUrl;
  const decision = evaluateVenueIndexability({
    events: payload.stats?.events ?? venue.events ?? 0,
    isIndexable: venue.isIndexable,
  });
  const { core: title, full: shareTitle } = resolveVenueSeoTitle(venue);
  const description =
    venue.seoDescription || venue.shortDescription || venue.description || undefined;
  const canonicalPath = venueCanonicalPath(venue);

  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: canonicalPath },
    robots: robotsForIndexability(decision.indexable),
    ...buildShareMetadata({
      title: shareTitle,
      description,
      path: canonicalPath,
      image: heroForShare,
    }),
  };
}

export async function VenueListPage({ family }: Pick<PageProps, 'family'>) {
  let initialPage = EMPTY_FEED;
  try {
    const emptyPayload = {
      generatedAt: new Date(0).toISOString(),
      total: 0,
      venues: [] as never[],
      page: 1,
      nextCursor: null,
      hasMore: false,
      limit: VENUE_CATALOG_PAGE_SIZE,
    };
    const payload = await withSoftTimeout(
      // Shell first: SSR HTML must not await cold distinct-product hub (~8-20s).
      getCachedVenuesCatalog(family, { limit: VENUE_CATALOG_PAGE_SIZE, counts: false }),
      VENUE_LIST_TIMEOUT_MS,
      emptyPayload,
      `venue-list-${family}`,
    );
    initialPage = mapVenueCatalogFeedPage(payload);
    // Soft-timeout / miss: bounded retry. noStore ONLY when final HTML has 0 venues
    // (do not call it before retry - that forced permanent private/no-store on /locations|/venues).
    if (!initialPage.venues.length) {
      const retry = await withSoftTimeout(
        getCachedVenuesCatalog(family, { limit: VENUE_CATALOG_PAGE_SIZE, counts: false }),
        VENUE_LIST_RETRY_TIMEOUT_MS,
        emptyPayload,
        `venue-list-retry-${family}`,
      );
      initialPage = mapVenueCatalogFeedPage(retry);
      if (!initialPage.venues.length) noStore();
    }
  } catch {
    noStore();
    initialPage = EMPTY_FEED;
  }
  const initialQueryKey = venueCatalogDefaultQueryKey(family);
  return (
    <SiteLayout>
      {family === 'location' ? (
        <Suspense fallback={<VenueCatalogPageSkeleton family="location" />}>
          <LocationsCatalogView initialPage={initialPage} initialQueryKey={initialQueryKey} />
        </Suspense>
      ) : (
        <Suspense fallback={<VenueCatalogPageSkeleton family="institution" />}>
          <VenuesCatalogView initialPage={initialPage} initialQueryKey={initialQueryKey} />
        </Suspense>
      )}
    </SiteLayout>
  );
}

export async function VenueDetailPage({
  slug,
  routeFamily,
}: {
  slug: string;
  /** Which public route rendered this page (`/locations` vs `/venues`). */
  routeFamily: 'location' | 'institution';
}) {
  const decodedSlug = decodeURIComponent(slug);

  // DTO first. Never start no-store admission in parallel before miss check:
  // no-store fetch + notFound() on ISR → static-to-dynamic HTTP 500.
  const loaded = await loadVenueDto(decodedSlug);
  if (loaded.kind === 'miss') safeNotFound();
  if (loaded.kind === 'unavailable') {
    // Soft 200 UI. Never call connection()/noStore() on this branch: on ISR routes
    // (`revalidate=300`) those APIs throw digest DYNAMIC_SERVER_USAGE which Next
    // surfaces as HTTP 500 instead of a dynamic bailout (live 2026-08-09:
    // /locations/saint-petersburg-bar-hroniki while API was swap-starved).
    // Soft HTML may be ISR-cached ≤ revalidate - far better than 500; ops purge if needed.
    return <VenueUnavailablePage slug={decodedSlug} />;
  }

  let payload = loaded.payload;
  const family = resolveVenueRouteFamily(payload.venue);
  if (family !== routeFamily) {
    // Never trust stored canonicalPath here: if it still points at the wrong
    // family (e.g. /locations/… while template=institution) Next 308-loops and
    // the PDP hangs the tab (live 2026-08-09 Yaani Kirik church).
    permanentRedirect(
      venueHref({
        id: payload.venue.id,
        slug: payload.venue.slug || decodedSlug,
        name: payload.venue.name,
        type: family === 'location' ? 'location' : payload.venue.type,
      }),
    );
  }

  const editorialHero = resolveVenueHeroImage(
    payload.venue.slug || decodedSlug,
    payload.venue.heroImageUrl,
  );
  let venue = applyVenueEditorialOverlay(payload.venue);
  if (editorialHero && editorialHero !== venue.heroImageUrl) {
    venue = { ...venue, heroImageUrl: editorialHero };
  }
  if (venue !== payload.venue) {
    payload = { ...payload, venue };
  }

  const admission = await withSoftTimeout(
    fetchVenueAdmissionProducts(decodedSlug),
    VENUE_ADMISSION_TIMEOUT_MS,
    EMPTY_ADMISSION,
    'venue-admission',
  );
  const jsonLdBlocks = buildVenuePageJsonLd(payload);

  return (
    <>
      <JsonLdScripts blocks={jsonLdBlocks} idPrefix="venue-jsonld" />
      <SiteLayout>
        <VenuePageView
          key={decodedSlug}
          slug={decodedSlug}
          initialPayload={payload}
          admissionProducts={admission.items}
        />
      </SiteLayout>
    </>
  );
}
