import {
  buildPublicArticlesListDto,
  buildPublicDestinationsDto,
  buildPublicVenuesDto,
  getPublicCatalogSessions,
} from '@daibilet/backend/public-read';

import { evaluateCityIndexability, evaluateVenueIndexability } from '@/lib/hub-indexability';
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
import { evaluateListingIndexability, MIN_LISTING_OFFERS_FOR_INDEX } from '@/lib/seo-listing-meta';
import { getCachedCatalog } from '@/server/cached-catalog-data';
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

/** Intent URLs only when ≥ MIN_LISTING_OFFERS_FOR_INDEX (same rule as pages). */
export async function buildIndexableIntentSitemapPaths(): Promise<string[]> {
  const paths = new Set<string>();

  for (const item of listCatalogIntents()) {
    const offers = await countIntentOffers(item.intent);
    if (evaluateListingIndexability({ offers, minOffers: MIN_LISTING_OFFERS_FOR_INDEX }).indexable) {
      paths.add(catalogIntentPath(item.intent));
    }

    for (const city of PRIORITY_LISTING_CITY_SLUGS) {
      const cityOffers = await countIntentOffers(item.intent, city);
      if (
        evaluateListingIndexability({
          offers: cityOffers,
          minOffers: MIN_LISTING_OFFERS_FOR_INDEX,
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
  return [
    entry('/', now, 'hourly', 1),
    entry('/events', now, 'hourly', 0.8),
    entry('/cities', now, 'daily', 0.8),
    entry('/venues', now, 'daily', 0.8),
    entry('/locations', now, 'daily', 0.7),
    entry('/podborki', now, 'daily', 0.8),
    ...intentPaths.map((path) => entry(path, now, 'daily', 0.7)),
    entry('/blog', now, 'daily', 0.8),
    entry('/help', now, 'monthly', 0.5),
    entry('/contacts', now, 'monthly', 0.5),
    entry('/offer', now, 'yearly', 0.3),
    entry('/privacy', now, 'yearly', 0.3),
    entry('/legal', now, 'yearly', 0.3),
    entry('/requisites', now, 'yearly', 0.3),
  ];
}

export async function buildEventsSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const sessions = await getPublicCatalogSessions(false, { hydrateSlots: false });
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];

  for (const session of sessions) {
    if (entries.length >= MAX_EVENTS) break;
    const slug = session.slug || session.sourceSlug || session.id;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    entries.push(entry(`/events/${encodeURIComponent(slug)}`, now, 'daily', 0.7));
  }

  return entries;
}

export async function buildCitiesSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const destinationsPayload = await buildPublicDestinationsDto();
  return (destinationsPayload?.destinations || [])
    .filter((destination) => {
      if (destination.type !== 'city' || !destination.slug) return false;
      return evaluateCityIndexability({
        events: destination.events,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
      }).indexable;
    })
    .map((destination) =>
      entry(`/cities/${encodeURIComponent(String(destination.slug))}`, now, 'daily', 0.75),
    );
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
    .map((venue) => entry(`/venues/${encodeURIComponent(String(venue.slug))}`, now, 'weekly', 0.6));
}

export async function buildLandingsSitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const paths = new Set<string>();

  for (const slug of Object.keys(LANDING_CATEGORY_PATH_BY_SLUG)) {
    if (isLandingCityAllowed(slug, 'moscow') && isLandingCityAllowed(slug, 'saint-petersburg') && isLandingCityAllowed(slug, 'kazan')) {
      paths.add(landingCategoryHref(slug));
    }
    if (!MULTI_CITY_LANDING_SLUGS.has(slug)) continue;
    for (const city of PRIORITY_LISTING_CITY_SLUGS) {
      if (!isLandingCityAllowed(slug, city)) continue;
      try {
        const payload = await fetchLandingPageDto(slug);
        if (!payload?.landing) continue;
        const finalized = finalizeLandingPayload(payload, slug, city);
        const offers = finalized.stats?.events ?? 0;
        if (!evaluateListingIndexability({ offers, minOffers: MIN_LISTING_OFFERS_FOR_INDEX }).indexable) {
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
      if (evaluateListingIndexability({ offers }).indexable) {
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
  return (payload?.articles || [])
    .filter((article) => article.slug && article.isIndexable !== false)
    .map((article) => entry(`/blog/${encodeURIComponent(String(article.slug))}`, now, 'weekly', 0.6));
}

export async function buildSitemapChunkEntries(chunk: SitemapChunk): Promise<SitemapEntry[]> {
  const now = new Date();
  switch (chunk) {
    case 'static':
      return await buildStaticSitemapEntries(now);
    case 'events':
      return buildEventsSitemapEntries(now);
    case 'cities':
      return buildCitiesSitemapEntries(now);
    case 'venues':
      return buildVenuesSitemapEntries(now);
    case 'landings':
      return buildLandingsSitemapEntries(now);
    case 'blog':
      return buildBlogSitemapEntries(now);
    default:
      return [];
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
