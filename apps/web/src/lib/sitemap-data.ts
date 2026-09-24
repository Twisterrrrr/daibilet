import {
  buildPublicArticlesListDto,
  buildPublicVenuesDto,
} from '@daibilet/backend/public-read';

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
import { venueSitemapEntry } from '@/lib/venue-sitemap-entry';
import { cityPlacesCatalogHref } from '@/lib/catalog-url';
import { getCachedCatalog } from '@/server/cached-catalog-data';
import { getCachedDestinations } from '@/server/cached-public-surfaces';
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

function entry(
  path: string,
  now: Date,
  changeFrequency: SitemapEntry['changeFrequency'],
  priority: number,
): SitemapEntry {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return {
    url: `${getSiteUrl()}${normalized === '/' ? '/' : normalized}`,
    lastModified: now,
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

export async function buildStaticSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const intentPaths = await buildIndexableIntentSitemapPaths();
  const podborkiCityHubPaths = PODBORKI_SEO_PILOT_CITY_SLUGS.map((city) =>
    buildPodborkiCityCanonicalPath(city),
  );
  return [
    entry('/', now, 'hourly', 1),
    entry('/events', now, 'hourly', 0.8),
    entry('/cities', now, 'daily', 0.8),
    entry('/places', now, 'daily', 0.85),
    entry('/podborki', now, 'daily', 0.8),
    ...podborkiCityHubPaths.map((path) => entry(path, now, 'daily', 0.75)),
    ...intentPaths.map((path) => entry(path, now, 'daily', 0.7)),
    entry('/blog', now, 'daily', 0.8),
    entry('/help', now, 'monthly', 0.5),
    entry('/contacts', now, 'monthly', 0.5),
    entry('/partners', now, 'monthly', 0.6),
    entry('/offer', now, 'yearly', 0.3),
    entry('/privacy', now, 'yearly', 0.3),
    entry('/legal', now, 'yearly', 0.3),
    entry('/requisites', now, 'yearly', 0.3),
  ];
}

export async function buildEventsSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const limit = 200;

  for (let offset = 0; offset < MAX_EVENTS; offset += limit) {
    const page = await getCachedCatalog(parseCatalogPageQuery({ limit: String(limit), offset: String(offset) }));
    for (const event of page.items || []) {
      if (entries.length >= MAX_EVENTS) break;
      const slug = event.slug || event.id;
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      entries.push(entry(`/events/${encodeURIComponent(slug)}`, now, 'daily', 0.7));
    }
    if (!page.hasMore || !page.items?.length || entries.length >= MAX_EVENTS) break;
  }

  return entries;
}

export async function buildCitiesSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
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
      entry(`/cities/${encodeURIComponent(String(destination.slug))}`, now, 'daily', destination.type === 'region' ? 0.7 : 0.75),
      ...(destination.type === 'city' && destination.venues > 0
        ? [entry(cityPlacesCatalogHref(String(destination.slug)), now, 'daily', 0.65)]
        : []),
    ]);
}

export async function buildVenuesSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const venuesPayload = await buildPublicVenuesDto(new URLSearchParams(`limit=${MAX_VENUES}`));
  return (venuesPayload?.venues || [])
    .filter((venue) => {
      if (!venue.slug) return false;
      return evaluateVenueIndexability({
        events: venue.events,
        isIndexable: venue.isIndexable,
      }).indexable;
    })
    .slice(0, MAX_VENUES)
    .map((venue) => venueSitemapEntry(venue, getSiteUrl(), now));
}

export async function buildLandingsSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
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

  return [...paths].map((path) => entry(path.replace(/\/$/, '') || '/', now, 'weekly', 0.65));
}

export async function buildBlogSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const payload = await buildPublicArticlesListDto();
  const articles = (payload?.articles || []) as Array<{
    slug?: string | null;
    isIndexable?: boolean | null;
  }>;
  return articles
    .filter((article) => article.slug && article.isIndexable !== false)
    .map((article) => entry(`/blog/${encodeURIComponent(String(article.slug))}`, now, 'weekly', 0.6));
}

export async function buildSitemapChunkEntries(chunk: SitemapChunk): Promise<SitemapEntry[]> {
  const now = new Date();
  let entries: SitemapEntry[];
  switch (chunk) {
    case 'static':
      entries = await buildStaticSitemapEntries(now);
      break;
    case 'events':
      entries = await buildEventsSitemapEntries(now);
      break;
    case 'cities':
      entries = await buildCitiesSitemapEntries(now);
      break;
    case 'venues':
      entries = await buildVenuesSitemapEntries(now);
      break;
    case 'landings':
      entries = await buildLandingsSitemapEntries(now);
      break;
    case 'blog':
      entries = await buildBlogSitemapEntries(now);
      break;
    default:
      entries = [];
  }
  assertSitemapNoindexInvariant(entries);
  return entries;
}

export function assertSitemapNoindexInvariant(entries: readonly SitemapEntry[]): void {
  const conflicts = entries
    .map((item) => item.url)
    .filter((url) => !isEventsCatalogSitemapEligibleUrl(url));
  if (conflicts.length) {
    throw new Error(`Sitemap contains noindex events catalog URL: ${conflicts.join(', ')}`);
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

export function renderSitemapIndexXml(now = new Date()): string {
  const lastmod = now.toISOString();
  const site = getSiteUrl();
  const body = SITEMAP_CHUNKS.map(
    (chunk) => `  <sitemap>
    <loc>${escapeXml(`${site}/sitemaps/${chunk}.xml`)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export const SITEMAP_RESPONSE_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
} as const;
