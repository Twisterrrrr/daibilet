import { unstable_cache } from 'next/cache';
import { prisma } from '@daibilet/db';
import type { PublicCatalogQuery } from '@daibilet/contracts/schemas';
import type { PublicCatalogDto } from '@daibilet/contracts/public';
import type { PublicAdmissionCatalogItemDto, PublicUnifiedCatalogDto, PublicUnifiedCatalogItemDto } from '@daibilet/contracts/catalog';

import { cityLookupSlug } from '@/lib/routes';
import {
  matchesAdmissionCatalogFilters,
  planUnifiedEventWindow,
  sortUnifiedCatalogItems,
  toPublicAdmissionCatalogItem,
  toPublicEventCatalogItem,
  unifiedCatalogItemKey,
  type AdmissionCatalogTaxonomy,
} from '@/lib/unified-catalog';
import { fetchAdmissionProductsPage } from '@/server/finance-projection-client';
import { catalogQueryCacheKey } from '@/server/catalog-query';
import { fetchPublicApiJson } from '@/server/public-api-client';

const EVENT_PAGE_SIZE = 200;
const MAX_ADMISSION_PRODUCTS = 1_000;
const ADMISSION_CACHE_TAG = 'admission-catalog-projection';

type AdmissionPage = NonNullable<Awaited<ReturnType<typeof fetchAdmissionProductsPage>>>;

function offsetFor(query: PublicCatalogQuery, limit: number): number {
  if (query.offset != null) return Math.max(0, query.offset);
  return Math.max(0, ((query.page ?? 1) - 1) * limit);
}

function eventParams(query: PublicCatalogQuery, offset: number) {
  return {
    ...(query.q ? { q: query.q } : {}),
    ...(query.destination ? { destination: query.destination } : {}),
    ...(query.city ? { city: query.city } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.tag ? { tag: query.tag } : {}),
    ...(query.landing ? { landing: query.landing } : {}),
    ...(query.excludeLanding ? { excludeLanding: query.excludeLanding } : {}),
    ...(query.date ? { date: query.date } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.sort ? { sort: query.sort } : { sort: 'time' }),
    ...(query.minPrice != null ? { minPrice: query.minPrice } : {}),
    ...((query.maxPrice ?? query.priceMax) != null ? { maxPrice: query.maxPrice ?? query.priceMax } : {}),
    ...(query.ageMax != null ? { ageMax: query.ageMax } : {}),
    ...(query.ids ? { ids: query.ids } : {}),
    limit: EVENT_PAGE_SIZE,
    offset,
  };
}

async function fetchEventWindow(
  query: PublicCatalogQuery,
  start: number,
  count: number,
  seed?: PublicCatalogDto,
) {
  const first = seed && start === 0 ? seed : await fetchPublicApiJson<PublicCatalogDto>('/api/public/events', {
    searchParams: eventParams(query, start),
    timeoutMs: 20_000,
    revalidateSeconds: 300,
  });
  const total = Math.max(0, first.total || 0);
  const target = Math.min(total, start + count);
  const pageOffsets: number[] = [];
  for (let offset = start + EVENT_PAGE_SIZE; offset < target; offset += EVENT_PAGE_SIZE) pageOffsets.push(offset);
  const rest = await Promise.all(pageOffsets.map((offset) =>
    fetchPublicApiJson<PublicCatalogDto>('/api/public/events', {
      searchParams: eventParams(query, offset),
      timeoutMs: 20_000,
      revalidateSeconds: 300,
    }),
  ));
  const pages = [first, ...rest];
  const items = pages.flatMap((page) => page.items || []);
  const seen = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const key = `${item.id}:${item.startsAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { first, items: uniqueItems, total };
}

async function fetchAllAdmissions(query: PublicCatalogQuery): Promise<{ items: AdmissionPage['items']; available: boolean }> {
  const citySlug = query.city && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(query.city)
    ? cityLookupSlug(query.city)
    : undefined;
  // The finance list's q filter omits some catalog fields (notably city). Load
  // only the selected city slice and apply the shared q matcher below instead.
  const first = await fetchAdmissionProductsPage({ citySlug, limit: 100, offset: 0 });
  if (!first) return { items: [], available: false };
  if (first.total > MAX_ADMISSION_PRODUCTS) {
    throw new Error(`Unified catalog admission window exceeded ${MAX_ADMISSION_PRODUCTS} products`);
  }
  const offsets: number[] = [];
  for (let offset = 100; offset < first.total; offset += 100) offsets.push(offset);
  const pages = await Promise.all(offsets.map((offset) =>
    fetchAdmissionProductsPage({ citySlug, limit: 100, offset }),
  ));
  if (pages.some((page) => !page)) return { items: [], available: false };
  return {
    items: [first, ...(pages as AdmissionPage[])].flatMap((page) => page.items),
    available: true,
  };
}

async function loadAdmissionTaxonomy(slugs: string[]): Promise<Map<string, AdmissionCatalogTaxonomy>> {
  if (!slugs.length) return new Map();
  try {
    const rows = await prisma.admissionProduct.findMany({
      where: { slug: { in: slugs } },
      select: {
        slug: true,
        category: { select: { slug: true, title: true } },
        primarySubcategory: { select: { slug: true, title: true } },
      },
    });
    return new Map(rows.map((row) => [row.slug, {
      category: row.category ? { slug: row.category.slug, title: row.category.title } : null,
      subcategory: row.primarySubcategory ? { slug: row.primarySubcategory.slug, title: row.primarySubcategory.title } : null,
    }]));
  } catch {
    // The finance projection remains the availability source. A taxonomy read failure
    // must not hide otherwise purchasable tickets when no category filter is active.
    return new Map();
  }
}

function mergeFacets(
  eventFacets: PublicCatalogDto['facets'],
  admissions: PublicAdmissionCatalogItemDto[],
): PublicUnifiedCatalogDto['facets'] {
  const bump = (rows: Array<{ name: string; events: number }>, name: string) => {
    const key = name.trim();
    if (!key) return;
    const current = rows.find((row) => row.name.toLowerCase() === key.toLowerCase());
    if (current) current.events += 1;
    else rows.push({ name: key, events: 1 });
  };
  const cities = eventFacets.cities.map((row) => ({ ...row }));
  const categories = eventFacets.categories.map((row) => ({ ...row }));
  const subcategories = eventFacets.subcategories.map((row) => ({ ...row }));
  const priceSteps = new Set(eventFacets.priceSteps);
  for (const item of admissions) {
    bump(cities, item.city);
    bump(categories, item.subcategory?.title || item.category?.title || '');
    bump(subcategories, item.subcategory?.title || '');
    if (item.priceFrom && item.priceFrom >= 100) priceSteps.add(item.priceFrom);
  }
  return {
    cities,
    categories,
    subcategories,
    ...(eventFacets.tags?.length ? { tags: eventFacets.tags } : {}),
    ...(eventFacets.catalogLists ? { catalogLists: eventFacets.catalogLists } : {}),
    landings: eventFacets.landings,
    priceSteps: [...priceSteps].sort((a, b) => a - b).slice(0, 24),
  };
}

async function buildUnifiedCatalog(query: PublicCatalogQuery): Promise<PublicUnifiedCatalogDto> {
  const limit = Math.max(1, Math.min(200, query.limit ?? 50));
  const offset = offsetFor(query, limit);

  const [eventResult, admissionResult] = await Promise.all([
    fetchEventWindow(query, 0, EVENT_PAGE_SIZE),
    fetchAllAdmissions(query),
  ]);
  const sellableProducts = admissionResult.items.filter((product) => product.canSell && product.offers.length > 0);
  const taxonomy = await loadAdmissionTaxonomy(sellableProducts.map((product) => product.slug));
  const admissions = sellableProducts
    .filter((product) => matchesAdmissionCatalogFilters(product, taxonomy.get(product.slug) || { category: null, subcategory: null }, query))
    .map((product) => toPublicAdmissionCatalogItem(product, taxonomy.get(product.slug) || { category: null, subcategory: null }));

  const windowPlan = planUnifiedEventWindow({
    offset,
    limit,
    admissionCount: admissions.length,
    eventTotal: eventResult.total,
  });
  const eventWindow = windowPlan.eventStart === 0 && windowPlan.eventCount <= eventResult.items.length
    ? eventResult
    : await fetchEventWindow(query, windowPlan.eventStart, windowPlan.eventCount, windowPlan.eventStart === 0 ? eventResult.first : undefined);
  const eventItems = eventWindow.items.map(toPublicEventCatalogItem);
  const candidates: PublicUnifiedCatalogItemDto[] = [...eventItems, ...admissions];
  const sorted = sortUnifiedCatalogItems(candidates, query.sort || 'time');
  const unique = new Map<string, PublicUnifiedCatalogItemDto>();
  for (const item of sorted) unique.set(unifiedCatalogItemKey(item), item);
  const combined = [...unique.values()];
  // Only the first `eventStart` Event rows are omitted from this bounded window;
  // all matching admissions are present, so the relative page start is exact.
  const pageStart = windowPlan.pageOffset;
  const items = combined.slice(pageStart, pageStart + limit);
  const total = eventResult.total + admissions.length;
  return {
    generatedAt: new Date().toISOString(),
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
    facets: mergeFacets(eventResult.first.facets, admissions),
    sources: { admissionsAvailable: admissionResult.available },
  };
}

export function getCachedUnifiedCatalog(query: PublicCatalogQuery): Promise<PublicUnifiedCatalogDto> {
  const key = catalogQueryCacheKey(query);
  const cached = unstable_cache(
    () => buildUnifiedCatalog(query),
    ['unified-catalog-v1', key],
    { revalidate: 300, tags: ['unified-catalog', 'catalog-page-v3-http', ADMISSION_CACHE_TAG] },
  );
  return cached();
}
