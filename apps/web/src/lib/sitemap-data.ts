import type { PublicCatalogDto, PublicVenueDto, PublicVenuePageDto } from '@daibilet/contracts/public';

import { evaluateCityIndexability, evaluateRegionIndexability, evaluateVenueIndexability } from '@/lib/hub-indexability';
import {
  CITY_LANDING_PATH_BY_SLUG,
  DEFAULT_CITY_BY_LANDING_SLUG,
  LANDING_CATEGORY_PATH_BY_SLUG,
  MULTI_CITY_LANDING_SLUGS,
  PRIORITY_LISTING_CITY_SLUGS,
  cityPathSegment,
  isLandingCityAllowed,
  landingCategoryHref,
} from '@/lib/landing-routes';
import {
  catalogIntentFilterValues,
  catalogIntentPath,
  listCatalogIntents,
} from '@/lib/catalog-intent-routes';
import { hasSeoListingEditorial } from '@/data/seo-listing-texts';
import { isEventsCatalogSitemapEligibleUrl } from '@/lib/events-catalog-indexing';
import { evaluateListingIndexability, MIN_LISTING_OFFERS_FOR_INDEX } from '@/lib/seo-listing-meta';
import { buildPodborkiCityCanonicalPath, isPodborkiSeoPilotCitySlug, PODBORKI_SEO_PILOT_CITY_SLUGS } from '@/lib/podborki-city-seo';
import { venueCanonicalPath, cityHref, citySlug } from '@/lib/routes';
import { cityPlacesCatalogHref } from '@/lib/catalog-url';
import { getCachedCatalog } from '@/server/cached-catalog-data';
import { getCachedDestinations } from '@/server/cached-public-surfaces';
import { fetchPublicApiJson } from '@/server/public-api-client';
import { parseCatalogPageQuery } from '@/server/catalog-query';
import { finalizeLandingPayload, fetchLandingPageDto } from '@/server/landing-page';

export const SITEMAP_CHUNKS = [
  'static',
  'events',
  'cities',
  'venues',
  'landings',
  'blog',
] as const;

export type SitemapChunk = (typeof SITEMAP_CHUNKS)[number];

export type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
};

const MAX_EVENTS = 45_000;
const MAX_VENUES = 10_000;
const VENUE_SITEMAP_SNAPSHOT_MS = 5 * 60 * 1000;

/**
 * Lean venue row for the sitemap. The HTTP venue list envelope carries the same
 * `buildPublicVenuesCatalog` rows the direct `public-read` call used to build.
 */
type SitemapVenueRow = PublicVenueDto & { events?: number | null };
type SitemapVenuesPayload = { venues?: SitemapVenueRow[] };

let venueSitemapSnapshot: {
  expiresAt: number;
  payload: SitemapVenuesPayload;
} | null = null;
let venueSitemapRebuild: Promise<SitemapVenuesPayload> | null = null;

/**
 * Sitemap waits for one fresh rebuild per TTL; catalog pages keep their existing SWR behavior.
 *
 * INC.504.15 / INC.504.23: this used to call `buildPublicVenuesDto(limit=10000, forceRefresh)`
 * directly, running a 10k-venue DB query + DTO build on the Next web-process event loop.
 * The same `buildPublicVenuesCatalog` builder serves HTTP `/api/public/venues` (backend
 * `withPublicResponseCache`), so the sitemap now fetches over loopback HTTP: DB + DTO
 * work stays in the API process, not in the process that renders HTML.
 */
async function freshVenuesForSitemap(): Promise<SitemapVenuesPayload> {
  if (venueSitemapSnapshot && venueSitemapSnapshot.expiresAt > Date.now()) {
    return venueSitemapSnapshot.payload;
  }
  if (!venueSitemapRebuild) {
    venueSitemapRebuild = fetchPublicApiJson<SitemapVenuesPayload>('/api/public/venues', {
      searchParams: { limit: MAX_VENUES },
      timeoutMs: 30_000,
    })
      .then((payload) => {
        venueSitemapSnapshot = { payload, expiresAt: Date.now() + VENUE_SITEMAP_SNAPSHOT_MS };
        return payload;
      })
      .finally(() => { venueSitemapRebuild = null; });
  }
  return venueSitemapRebuild;
}

/** Priority listing cities + SEO pilot cities (KGD/SPB) - без дублей. */
function listingSitemapCitySlugs(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const city of [...PRIORITY_LISTING_CITY_SLUGS, ...PODBORKI_SEO_PILOT_CITY_SLUGS]) {
    if (seen.has(city)) continue;
    seen.add(city);
    out.push(city);
  }
  return out;
}

const YEAR_ROUND_SITEMAP_LANDINGS = new Set<string>(['salute-9-may']);

export function getSiteUrl(): string {
  return (
    process.env.DAIBILET_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://daibilet.ru'
  ).replace(/\/$/, '');
}

export function isSitemapChunk(value: string): value is SitemapChunk {
  return (SITEMAP_CHUNKS as readonly string[]).includes(value);
}

export function normalizeSitemapChunkParam(raw: string): SitemapChunk | null {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\.xml$/i, '');
  return isSitemapChunk(key) ? key : null;
}

/**
 * Resolve a sitemap lastmod only when an entity provides a real timestamp.
 * Unknown freshness is represented by omitting the tag, never by build time.
 */
export function resolveSitemapLastModified(
  candidate: Date | string | null | undefined,
): Date | undefined {
  if (candidate == null || candidate === '') return undefined;
  const parsed = candidate instanceof Date ? candidate : new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function entry(
  path: string,
  changeFrequency: SitemapEntry['changeFrequency'],
  priority: number,
  lastModified?: Date | string | null,
): SitemapEntry {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return {
    url: `${getSiteUrl()}${normalized === '/' ? '/' : normalized}`,
    lastModified: resolveSitemapLastModified(lastModified),
    changeFrequency,
    priority,
  };
}

async function countIntentOffers(intentSlug: string, citySlug?: string | null): Promise<number> {
  const intent = listCatalogIntents().find((item) => item.intent === intentSlug);
  if (!intent) return 0;
  const filters = catalogIntentFilterValues(intent);
  const pageQuery = parseCatalogPageQuery({
    city: citySlug || undefined,
    date: filters.date,
    minPrice: filters.minPrice != null ? String(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice != null ? String(filters.maxPrice) : undefined,
    sort: filters.sort,
  });
  try {
    const catalog = await getCachedCatalog(pageQuery);
    return catalog?.total ?? catalog?.items?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Intent URLs: threshold 6, except pilot city×intent (stable when offers>0 or SEO skeleton). */
export async function buildIndexableIntentSitemapPaths(): Promise<string[]> {
  const paths = new Set<string>();
  const cities = listingSitemapCitySlugs();

  for (const item of listCatalogIntents()) {
    const offers = await countIntentOffers(item.intent);
    if (evaluateListingIndexability({ offers, minOffers: MIN_LISTING_OFFERS_FOR_INDEX }).indexable) {
      paths.add(catalogIntentPath(item.intent));
    }

    for (const city of cities) {
      const cityOffers = await countIntentOffers(item.intent, city);
      const pilot = isPodborkiSeoPilotCitySlug(city);
      if (
        evaluateListingIndexability({
          offers: cityOffers,
          minOffers: MIN_LISTING_OFFERS_FOR_INDEX,
          stablePilotIndex: pilot,
          hasSeoSkeleton: pilot,
        }).indexable
      ) {
        paths.add(catalogIntentPath(item.intent, city));
      }
    }
  }

  return [...paths];
}

export async function buildStaticSitemapEntries(): Promise<SitemapEntry[]> {
  const intentPaths = await buildIndexableIntentSitemapPaths();
  const podborkiCityHubPaths = PODBORKI_SEO_PILOT_CITY_SLUGS.map((city) =>
    buildPodborkiCityCanonicalPath(city),
  );
  return [
    entry('/', 'hourly', 1),
    entry('/events', 'hourly', 0.8),
    entry('/cities', 'daily', 0.8),
    entry('/places', 'daily', 0.85),
    // Family facets are indexable documents in their own right since the ЧПУ
    // transition on 2026-10-01; before that they canonicalised to /places.
    entry('/places/institution', 'daily', 0.8),
    entry('/places/location', 'daily', 0.8),
    entry('/podborki', 'daily', 0.8),
    ...podborkiCityHubPaths.map((path) => entry(path, 'daily', 0.75)),
    ...intentPaths.map((path) => entry(path, 'daily', 0.7)),
    entry('/blog', 'daily', 0.8),
    entry('/help', 'monthly', 0.5),
    entry('/contacts', 'monthly', 0.5),
    entry('/partners', 'monthly', 0.6),
    entry('/offer', 'yearly', 0.3),
    entry('/privacy', 'yearly', 0.3),
    entry('/legal', 'yearly', 0.3),
    entry('/requisites', 'yearly', 0.3),
  ];
}

export async function buildEventsSitemapEntries(): Promise<SitemapEntry[]> {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const limit = 200;

  // Real per-event `updatedAt`, keyed by the public (transliterated) slug. Without
  // it every entry falls back to the build timestamp, so all ~4k URLs claim to
  // change on every rebuild and crawlers stop trusting the field.
  //
  // The catch must stay loud. It silently returned an empty map once, which made
  // "the query failed" and "there is no data" indistinguishable and cost a full
  // diagnosis cycle on 30.09. An empty map is a valid outcome (zero events with
  // a usable updatedAt); a thrown error is not, so log it and keep going.
  const freshnessPayload = await fetchPublicApiJson<{ freshness: Record<string, string> }>(
    '/api/public/events/freshness', { timeoutMs: 10_000 },
  ).catch((error: unknown) => {
    console.error(
      '[sitemap] event freshness API failed; event lastmod will be omitted',
      error,
    );
    return { freshness: {} as Record<string, string> };
  });
  const freshness = freshnessPayload.freshness;
  if (Object.keys(freshness).length === 0) {
    console.warn('[sitemap] event freshness API returned 0 rows; event lastmod will be omitted');
  }

  for (let offset = 0; offset < MAX_EVENTS; offset += limit) {
    const page = await fetchPublicApiJson<PublicCatalogDto>('/api/public/events', {
      searchParams: { limit, offset }, timeoutMs: 30_000,
    });
    for (const event of page.items || []) {
      if (entries.length >= MAX_EVENTS) break;
      const slug = event.slug || event.id;
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      entries.push(
        entry(`/events/${encodeURIComponent(slug)}`, 'daily', 0.7, freshness[slug] ?? null),
      );
    }
    if (!page.hasMore || !page.items?.length || entries.length >= MAX_EVENTS) break;
  }

  return entries;
}

export async function buildCitiesSitemapEntries(): Promise<SitemapEntry[]> {
  const destinationsPayload = await getCachedDestinations();
  return (destinationsPayload?.destinations || [])
    .filter((destination) => {
      if (!destination.slug) return false;
      if (destination.type === 'city') {
        return evaluateCityIndexability({
          events: destination.events,
          slug: destination.slug,
          sourceSlug: destination.sourceSlug,
        }).indexable;
      }
      if (destination.type === 'region') {
        // Tier C (<3 events): noindex + вне sitemap; A/B с ≥3 - в карту.
        return evaluateRegionIndexability({
          childEventTotal: destination.events,
        }).indexable;
      }
      return false;
    })
    .flatMap((destination) => [
      entry(cityHref(destination), 'daily', destination.type === 'region' ? 0.7 : 0.75),
      ...(destination.type === 'city' && destination.venues > 0
        ? [entry(cityPlacesCatalogHref(citySlug(destination)), 'daily', 0.65)]
        : []),
    ]);
}

export async function buildVenuesSitemapEntries(): Promise<SitemapEntry[]> {
  const venuesPayload = await freshVenuesForSitemap();
  const eligible = (venuesPayload?.venues || [])
    .filter((venue) => {
      if (!venue.slug) return false;
      return evaluateVenueIndexability({
        // futureSessionCount drives indexability (events is an all-time count);
        // venue.events stays as the fallback for rows without the counter.
        futureSessions: venue.futureSessionCount ?? venue.events,
        isIndexable: venue.isIndexable,
        type: venue.type,
        pageStatus: venue.pageStatus,
      }).indexable;
    })
    .slice(0, MAX_VENUES);
  const sources = new Map<string, PublicVenueDto>();
  const entries = eligible.map((venue) => {
    const result = entry(venueCanonicalPath(venue), 'weekly', 0.6);
    sources.set(result.url, venue);
    return result;
  });
  const pathCounts = new Map<string, number>();
  for (const item of entries) pathCounts.set(item.url, (pathCounts.get(item.url) || 0) + 1);
  const uniqueEntries = [...new Map(entries.map((item) => [item.url, item])).values()];
  // Location types and colliding paths can resolve to a different detail row
  // than the list DTO. Verify the final URL through the API used by HTML.
  const checked = new Map<string, boolean>();
  const candidates = uniqueEntries.filter((item) =>
    new URL(item.url).pathname.startsWith('/locations/') || (pathCounts.get(item.url) || 0) > 1);
  for (let i = 0; i < candidates.length; i += 8) {
    const batch = await Promise.all(candidates.slice(i, i + 8).map(async (item) => {
      const pathname = new URL(item.url).pathname;
      const slug = decodeURIComponent(pathname.split('/').pop() || '');
      const detail = await fetchPublicApiJson<PublicVenuePageDto | null>(
        `/api/public/venues/${encodeURIComponent(slug)}`,
        { timeoutMs: 15_000, notFoundAsNull: true, retries: 0 },
      );
      const venue = detail?.venue;
      return [item.url, Boolean(venue &&
        venueCanonicalPath(venue) === pathname &&
        evaluateVenueIndexability({
          futureSessions: venue.futureSessionCount ?? detail.stats?.events ?? 0,
          isIndexable: venue.isIndexable,
          type: venue.type,
          pageStatus: venue.pageStatus,
        }).indexable)] as const;
    }));
    for (const [url, indexable] of batch) checked.set(url, indexable);
  }
  const verifiedEntries = uniqueEntries.filter((item) => checked.get(item.url) !== false);
  assertSitemapNoindexInvariant(verifiedEntries, sources);
  return verifiedEntries;
}

export async function buildLandingsSitemapEntries(): Promise<SitemapEntry[]> {
  const paths = new Set<string>();
  const cities = listingSitemapCitySlugs();

  for (const slug of Object.keys(LANDING_CATEGORY_PATH_BY_SLUG)) {
    if (isLandingCityAllowed(slug, 'moscow') && isLandingCityAllowed(slug, 'saint-petersburg') && isLandingCityAllowed(slug, 'kazan')) {
      paths.add(landingCategoryHref(slug));
    }
    // Year-round seasonal hubs stay in sitemap even with 0 offers (catalog may hide).
    if (YEAR_ROUND_SITEMAP_LANDINGS.has(slug)) {
      paths.add(landingCategoryHref(slug));
    }
    if (!MULTI_CITY_LANDING_SLUGS.has(slug)) continue;
    for (const city of cities) {
      if (!isLandingCityAllowed(slug, city)) continue;
      try {
        const payload = await fetchLandingPageDto(slug);
        if (!payload?.landing) continue;
        const finalized = finalizeLandingPayload(payload, slug, city);
        const offers = finalized.stats?.events ?? 0;
        const pilot = isPodborkiSeoPilotCitySlug(city);
        if (
          !evaluateListingIndexability({
            offers,
            minOffers: MIN_LISTING_OFFERS_FOR_INDEX,
            hasEditorialSeoText: hasSeoListingEditorial(slug, city),
            stablePilotIndex: pilot,
            hasSeoSkeleton: YEAR_ROUND_SITEMAP_LANDINGS.has(slug),
          }).indexable
        ) {
          continue;
        }
        paths.add(landingCategoryHref(slug, city));
      } catch {
        // DB unavailable at build - skip city variant rather than ship thin URL.
      }
    }
  }

  for (const slug of Object.keys(CITY_LANDING_PATH_BY_SLUG)) {
    const city = DEFAULT_CITY_BY_LANDING_SLUG[slug];
    if (!cityPathSegment(city)) continue;
    try {
      const payload = await fetchLandingPageDto(slug);
      if (!payload?.landing) {
        paths.add(landingCategoryHref(slug, city));
        continue;
      }
      const finalized = finalizeLandingPayload(payload, slug, city);
      const offers = finalized.stats?.events ?? 0;
      if (
        evaluateListingIndexability({
          offers,
          hasEditorialSeoText: hasSeoListingEditorial(slug, city),
        }).indexable
      ) {
        paths.add(landingCategoryHref(slug, city));
      }
    } catch {
      paths.add(landingCategoryHref(slug, city));
    }
  }

  return [...paths].map((path) => entry(path.replace(/\/$/, '') || '/', 'weekly', 0.65));
}

export async function buildBlogSitemapEntries(): Promise<SitemapEntry[]> {
  // INC.504.23: article list over loopback HTTP. Same `buildPublicArticlesList`
  // payload the direct `public-read` call produced (the backend route wraps the
  // identical builder with `withPublicResponseCache`); no limit param = the same
  // default options the direct call passed. Keeps the pg/DTO work out of the
  // web process.
  const payload = await fetchPublicApiJson<{
    articles?: Array<{
      slug?: string | null;
      isIndexable?: boolean | null;
      updatedAt?: string | null;
    }>;
  }>('/api/public/articles', { timeoutMs: 10_000 });
  const articles = payload?.articles || [];
  return articles
    .filter((article) => article.slug && article.isIndexable !== false)
    .map((article) =>
      entry(`/blog/${encodeURIComponent(String(article.slug))}`, 'weekly', 0.6, article.updatedAt),
    );
}

export async function buildSitemapChunkEntries(chunk: SitemapChunk): Promise<SitemapEntry[]> {
  let entries: SitemapEntry[];
  switch (chunk) {
    case 'static':
      entries = await buildStaticSitemapEntries();
      break;
    case 'events':
      entries = await buildEventsSitemapEntries();
      break;
    case 'cities':
      entries = await buildCitiesSitemapEntries();
      break;
    case 'venues':
      entries = await buildVenuesSitemapEntries();
      break;
    case 'landings':
      entries = await buildLandingsSitemapEntries();
      break;
    case 'blog':
      entries = await buildBlogSitemapEntries();
      break;
    default:
      entries = [];
  }
  assertSitemapNoindexInvariant(entries);
  return entries;
}

export function assertSitemapNoindexInvariant(
  entries: readonly SitemapEntry[],
  venueSources?: ReadonlyMap<string, PublicVenueDto>,
): void {
  const conflicts = entries
    .map((item) => item.url)
    .filter((url) => !isEventsCatalogSitemapEligibleUrl(url));
  if (conflicts.length) {
    throw new Error(`Sitemap contains noindex events catalog URL: ${conflicts.join(', ')}`);
  }
  if (venueSources) {
    const venueConflicts = entries
      .filter((item) => /\/(venues|locations)\//.test(new URL(item.url).pathname))
      .filter((item) => {
        const venue = venueSources.get(item.url);
        return !venue || !evaluateVenueIndexability({
          futureSessions: venue.futureSessionCount ?? venue.events,
          isIndexable: venue.isIndexable,
          type: venue.type,
          pageStatus: venue.pageStatus,
        }).indexable;
      })
      .map((item) => item.url);
    if (venueConflicts.length) {
      throw new Error(`Sitemap contains noindex venue URL: ${venueConflicts.join(', ')}`);
    }
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastmod(value?: string | Date): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function renderUrlsetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((item) => {
      const lastmod = formatLastmod(item.lastModified);
      const lines = [`  <url>`, `    <loc>${escapeXml(item.url)}</loc>`];
      if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
      if (item.changeFrequency) lines.push(`    <changefreq>${item.changeFrequency}</changefreq>`);
      if (typeof item.priority === 'number') lines.push(`    <priority>${item.priority}</priority>`);
      lines.push(`  </url>`);
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderSitemapIndexXml(): string {
  const site = getSiteUrl();
  const body = SITEMAP_CHUNKS.map(
    (chunk) => `  <sitemap>
    <loc>${escapeXml(`${site}/sitemaps/${chunk}.xml`)}</loc>
  </sitemap>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export const SITEMAP_RESPONSE_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=3600',
} as const;

export function sitemapResponseHeaders(chunk: string): Record<string, string> {
  // Event and venue eligibility can change during catalog sync. Keep their
  // advertised shared-cache freshness short; do not grant a day-long SWR window.
  const maxAge = chunk === 'events' || chunk === 'venues'
    ? 300
    : chunk === 'cities' || chunk === 'landings'
      ? 900
      : 3600;
  return {
    ...SITEMAP_RESPONSE_HEADERS,
    'Cache-Control': `public, s-maxage=${maxAge}`,
    // Runtime route handlers still use a bounded shared cache. Omitting
    // stale-while-revalidate prevents deleted catalog URLs lingering for a day.
  };
}
