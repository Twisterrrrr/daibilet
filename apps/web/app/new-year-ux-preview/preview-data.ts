import { fetchPublicApiJson } from '@/server/public-api-client';
import cityRouting from '../../../../data/geo/city-routing.ru.json';
import regionHubs from '../../../../data/geo/region-hubs.ru.json';
import { resolvePreviewFormat } from './preview-format';

export type PreviewSlot = {
  id?: string;
  startsAt?: string | null;
  dateLabel?: string;
  timeLabel?: string;
  purchaseUrl?: string | null;
  purchaseUrls?: string[];
  vacant?: number | null;
};

export type PreviewEvent = {
  id: string;
  title: string;
  city?: string | null;
  venue?: string | null;
  category?: string | null;
  catalogCategory?: string | { title?: string; slug?: string } | null;
  catalogSubcategory?: string | { title?: string; slug?: string } | null;
  subcategories?: string[];
  tags?: string[];
  tagLabels?: string[];
  sessionCount?: number;
  startsAt?: string | null;
  eventPageSlug?: string | null;
  slug?: string | null;
  groupKey?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  vacant?: number | null;
  purchaseUrl?: string | null;
  widgetUrl?: string | null;
  purchaseProvider?: string | null;
  offerSourceCode?: string | null;
  purchaseMode?: string | null;
  purchaseReady?: boolean;
  sourceStatus?: string | null;
  description?: string | null;
  upcomingSlots?: PreviewSlot[];
};

export type PreviewFilters = {
  city?: string;
  region?: string;
  date?: string;
  price?: string;
  format?: string;
  q?: string;
  sort?: string;
  lowStock?: boolean;
  offset?: number;
};

type EventsResponse = { generatedAt?: string; total?: number; limit?: number; hasMore?: boolean; items?: PreviewEvent[] };
const PAGE_SIZE = 30;
const FIRST_SEASON_DATE = '2026-12-01';
const LAST_SEASON_DATE = '2027-01-14';
const CITY_TO_REGION = cityRouting.cityToRegion as Record<string, string>;
const REGION_CENTER_NAMES = new Set(regionHubs.regionCenters.map((item) => item.centerCity));
const REGION_BY_CENTER = new Map(regionHubs.regionCenters
  .filter((item) => !['Москва', 'Санкт-Петербург', 'Севастополь'].includes(item.centerCity))
  .map((item) => [item.centerCity, item.regionName]));
const NEW_YEAR_CITY_REGION_OVERRIDES: Record<string, string> = {
  Волхов: 'Ленинградская область',
  Истра: 'Московская область',
  'Лосино-Петровский': 'Московская область',
  Одинцово: 'Московская область',
  Сочи: 'Краснодарский край',
};

function cityRegion(city?: string | null): string | null {
  if (!city) return null;
  const clean = city.replace(/\s*\([^)]*\)\s*$/u, '').trim();
  const explicitRegion = city.match(/\(([^)]*(?:область|край|республика|округ)[^)]*)\)\s*$/iu)?.[1];
  const region = CITY_TO_REGION[city] || CITY_TO_REGION[clean] || NEW_YEAR_CITY_REGION_OVERRIDES[clean] || explicitRegion || REGION_BY_CENTER.get(clean) || null;
  return region === 'Москва' ? null : region;
}

function dayKey(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (part: string) => parts.find((item) => item.type === part)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function seasonalSlots(event: PreviewEvent): PreviewSlot[] {
  if (!event.purchaseReady) return [];
  const slots = [...(event.upcomingSlots || [])];
  if (event.startsAt && !slots.some((slot) => slot.startsAt === event.startsAt)) {
    slots.push({
      id: event.id,
      startsAt: event.startsAt,
      purchaseUrl: event.purchaseUrl || event.widgetUrl || null,
      vacant: event.vacant ?? null,
    });
  }
  return slots.filter((slot) => {
    const day = dayKey(slot.startsAt);
    return Boolean(day && day >= FIRST_SEASON_DATE && day <= LAST_SEASON_DATE);
  });
}

function groupEvents(events: PreviewEvent[]): PreviewEvent[] {
  const groups = new Map<string, PreviewEvent[]>();
  for (const event of events) {
    const key = event.eventPageSlug ? `page:${event.eventPageSlug}` : `catalog:${event.groupKey || event.id}`;
    const group = groups.get(key) || [];
    group.push(event);
    groups.set(key, group);
  }
  return [...groups.values()].map((rows) => {
    const first = rows[0]!;
    const pageSlugs = [...new Set(rows.map((row) => row.eventPageSlug).filter((slug): slug is string => Boolean(slug)))];
    const eventSlugs = [...new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)))];
    const slots = new Map<string, PreviewSlot>();
    for (const row of rows) {
      for (const slot of seasonalSlots(row)) {
        const parsedStart = slot.startsAt ? new Date(slot.startsAt) : null;
        const slotKey = parsedStart && !Number.isNaN(parsedStart.getTime())
          ? `start:${parsedStart.toISOString()}`
          : slot.id || `${row.id}:${slot.startsAt || ''}`;
        const existing = slots.get(slotKey);
        if (!existing) {
          slots.set(slotKey, slot);
          continue;
        }
        const purchaseUrls = [...new Set([
          existing.purchaseUrl,
          ...(existing.purchaseUrls || []),
          slot.purchaseUrl,
          ...(slot.purchaseUrls || []),
        ].filter((url): url is string => Boolean(url)))];
        slots.set(slotKey, {
          ...existing,
          purchaseUrl: existing.purchaseUrl || slot.purchaseUrl || purchaseUrls[0],
          purchaseUrls: purchaseUrls.length > 1 ? purchaseUrls : undefined,
        });
      }
    }
    const prices = rows.map((row) => Number(row.priceFrom)).filter((price) => Number.isFinite(price) && price >= 0);
    const vacant = rows.map((row) => row.vacant).filter((value): value is number => typeof value === 'number');
    const upcomingSlots = [...slots.values()].sort((a, b) => new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime());
    return {
      ...first,
      eventPageSlug: pageSlugs.length === 1 ? pageSlugs[0] : null,
      slug: eventSlugs.length === 1 ? eventSlugs[0] : null,
      sessionCount: Math.max(upcomingSlots.length, ...rows.map((row) => row.sessionCount || 0)),
      subcategories: [...new Set(rows.flatMap((row) => row.subcategories || []))],
      tagLabels: [...new Set(rows.flatMap((row) => row.tagLabels || []))],
      tags: [...new Set(rows.flatMap((row) => row.tags || []))],
      upcomingSlots,
      priceFrom: prices.length ? Math.min(...prices) : null,
      vacant: vacant.length ? Math.min(...vacant) : null,
    };
  }).filter((event) => event.upcomingSlots?.length);
}

function slotsForDate(event: PreviewEvent, date: string): PreviewSlot[] {
  const slots = event.upcomingSlots || [];
  if (!date || date === 'all') return slots;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return slots.filter((slot) => dayKey(slot.startsAt) === date);
  return slots.filter((slot) => {
    const day = dayKey(slot.startsAt);
    if (!day) return false;
    if (date === 'dec31') return day === '2026-12-31';
    if (date === 'dec24to31') return day >= '2026-12-24' && day <= '2026-12-31';
    if (date === 'jan1') return day === '2027-01-01';
    if (date === 'jan1to14') return day >= '2027-01-01' && day <= '2027-01-14';
    if (date === 'holidays') return day >= '2026-12-23' && day <= '2027-01-14';
    if (date === 'weekend') {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
      return weekday === 0 || weekday === 6;
    }
    return true;
  });
}

function matchesPrice(event: PreviewEvent, price: string): boolean {
  if (!price || price === 'all') return true;
  if (typeof event.priceFrom !== 'number') return false;
  if (price === 'free') return event.priceFrom === 0;
  if (price === 'under1000') return event.priceFrom <= 1000;
  if (price === 'under2000') return event.priceFrom <= 2000;
  if (price === 'over2000') return event.priceFrom >= 2000;
  if (price === 'over5000') return event.priceFrom >= 5000;
  if (price === 'over10000') return event.priceFrom >= 10000;
  return true;
}

function lowStock(event: PreviewEvent): boolean {
  return typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= 8;
}

async function fetchCatalogPage(offset: number): Promise<EventsResponse> {
  return fetchPublicApiJson<EventsResponse>('/api/public/events', {
    searchParams: { landing: 'new-year', limit: 200, offset },
    timeoutMs: 60_000,
    revalidateSeconds: 300,
  });
}

export async function buildNewYearPreviewData(filters: PreviewFilters = {}) {
  const first = await fetchCatalogPage(0);
  const rawEvents = first.items || [];
  const sourceTotal = Number(first.total) || rawEvents.length;
  const step = Number(first.limit) || 200;
  const offsets = Array.from(
    { length: Math.max(0, Math.ceil(sourceTotal / step) - 1) },
    (_, index) => (index + 1) * step,
  );
  const remainingPages = await Promise.all(offsets.map((offset) => fetchCatalogPage(offset)));
  rawEvents.push(...remainingPages.flatMap((page) => page.items || []));

  const grouped = groupEvents(rawEvents);
  const query = String(filters.q || '').trim().toLocaleLowerCase('ru');
  type Axis = 'geo' | 'date' | 'price' | 'format' | 'stock' | 'q';
  const allFilters = (event: PreviewEvent, except?: Axis) => {
    if (except !== 'geo' && filters.city && filters.city !== 'Вся Россия' && event.city !== filters.city) return false;
    if (except !== 'geo' && filters.region && cityRegion(event.city) !== filters.region) return false;
    if (except !== 'date' && !slotsForDate(event, filters.date || 'all').length) return false;
    if (except !== 'price' && !matchesPrice(event, filters.price || 'all')) return false;
    if (except !== 'format' && filters.format && filters.format !== 'Все форматы' && resolvePreviewFormat(event) !== filters.format) return false;
    if (except !== 'stock' && filters.lowStock && !lowStock(event)) return false;
    if (except !== 'q' && query) {
      const haystack = [event.title, event.city, event.venue, event.category, event.catalogCategory, event.catalogSubcategory, ...(event.tagLabels || []), ...(event.tags || [])].map(String).join(' ').toLocaleLowerCase('ru');
      if (!haystack.includes(query)) return false;
    }
    return true;
  };

  const filtered = grouped.filter((event) => allFilters(event)).map((event) => ({
    ...event,
    upcomingSlots: slotsForDate(event, filters.date || 'all'),
  }));
  if (filters.sort === 'price') filtered.sort((a, b) => (a.priceFrom ?? Number.MAX_SAFE_INTEGER) - (b.priceFrom ?? Number.MAX_SAFE_INTEGER));
  else if (filters.sort === 'price-desc') filtered.sort((a, b) => (b.priceFrom ?? -1) - (a.priceFrom ?? -1));
  else filtered.sort((a, b) => new Date(a.upcomingSlots?.[0]?.startsAt || 0).getTime() - new Date(b.upcomingSlots?.[0]?.startsAt || 0).getTime());

  const count = (axis: Axis, predicate: (event: PreviewEvent) => boolean) =>
    grouped.filter((event) => allFilters(event, axis) && predicate(event)).length;
  const cities = [...new Set(grouped.map((event) => event.city).filter((city): city is string => Boolean(city)))].sort((a, b) => a.localeCompare(b, 'ru'));
  const regions = [...new Set(cities.map(cityRegion).filter((region): region is string => Boolean(region)))];
  const formats = [...new Set(grouped.map(resolvePreviewFormat))].sort((a, b) => a.localeCompare(b, 'ru'));
  const facets = {
    cities: [{ name: 'Вся Россия', count: count('geo', () => true), filterable: true }, ...cities.map((name) => ({
      name,
      count: count('geo', (event) => event.city === name),
      region: cityRegion(name) || undefined,
      filterable: !cityRegion(name) || REGION_CENTER_NAMES.has(name.replace(/\s*\([^)]*\)\s*$/u, '').trim()),
    }))],
    regions: regions.map((name) => ({ name, count: count('geo', (event) => cityRegion(event.city) === name) })).sort((a, b) => b.count - a.count || (a.name || '').localeCompare(b.name || '', 'ru')),
    dates: ['all', 'dec24to31', 'dec31', 'jan1', 'jan1to14', 'weekend', 'holidays'].map((value) => ({ value, count: count('date', (event) => slotsForDate(event, value).length > 0) })),
    prices: ['all', 'free', 'under1000', 'under2000', 'over2000', 'over5000', 'over10000'].map((value) => ({ value, count: count('price', (event) => matchesPrice(event, value)) })),
    formats: [{ name: 'Все форматы', count: count('format', () => true) }, ...formats.map((name) => ({ name, count: count('format', (event) => resolvePreviewFormat(event) === name) }))],
    lowStock: count('stock', lowStock),
  };

  const offset = Math.max(0, Number(filters.offset) || 0);
  const prices = filtered.map((event) => event.priceFrom).filter((value): value is number => typeof value === 'number' && value > 0);
  return {
    items: filtered.slice(offset, offset + PAGE_SIZE),
    total: filtered.length,
    sourceTotal,
    offset,
    limit: PAGE_SIZE,
    hasMore: offset + PAGE_SIZE < filtered.length,
    generatedAt: first.generatedAt || null,
    priceFrom: prices.length ? Math.min(...prices) : null,
    facets,
  };
}
