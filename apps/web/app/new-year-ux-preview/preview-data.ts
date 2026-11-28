import { unstable_cache } from 'next/cache';
import { fetchPublicApiJson, isProductionBuildPhase } from '@/server/public-api-client';
import { resolveSessionTimeZone } from '@/lib/city-timezone';
import { parseSessionStartsAt } from '@/lib/datetime';
import { getNewYearPreviewPage, sortNewYearPreviewEvents } from '@/lib/new-year-preview-order';
import { isRelevantToNewYearLanding } from '@/lib/new-year-preview-relevance';
import cityRouting from '../../../../data/geo/city-routing.ru.json';
import regionHubs from '../../../../data/geo/region-hubs.ru.json';
import { resolvePreviewFormat, resolveThematicFormats, visibleNewYearFormatNames, visibleThematicFormatNames, type PreviewTheme } from './preview-format';
import type { CompactPreviewEvent, NewYearPreviewIndex } from './preview-index';

export type PreviewSlot = {
  id?: string;
  eventId?: string;
  startsAt?: string | null;
  dateLabel?: string;
  timeLabel?: string;
  purchaseUrl?: string | null;
  purchaseUrls?: string[];
  vacant?: number | null;
  timeZone?: string | null;
};

export type PreviewEvent = {
  id: string;
  title: string;
  city?: string | null;
  destination?: string | null;
  timeZone?: string | null;
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
  eventPageIndexableSlug?: string | null;
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
  imageUrl?: string | null;
  ageLimit?: string | null;
  formats?: string[];
  upcomingSlots?: PreviewSlot[];
};

export type PreviewFilters = {
  city?: string;
  region?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  price?: string;
  priceFrom?: number;
  priceTo?: number;
  format?: string;
  q?: string;
  sort?: string;
  lowStock?: boolean;
  availableOnly?: boolean;
  ageLimit?: string;
  offset?: number;
};

type EventsResponse = { generatedAt?: string; total?: number; limit?: number; hasMore?: boolean; items?: PreviewEvent[] };
const PAGE_SIZE = 30;
const FIRST_SEASON_DATE = '2026-12-01';
const LAST_SEASON_DATE = '2027-01-14';
const CITY_TO_REGION = cityRouting.cityToRegion as Record<string, string>;
const REGION_CENTER_NAMES = new Set(regionHubs.regionCenters.map((item) => item.centerCity));
const NEW_YEAR_REGIONAL_CENTER_NAMES = new Set([
  ...REGION_CENTER_NAMES,
  'Великий Новгород',
  'Владикавказ',
  'Волгоград',
  'Курск',
  'Новосибирск',
  'Петропавловск-Камчатский',
  'Рязань',
  'Смоленск',
]);
const REGION_BY_CENTER = new Map(regionHubs.regionCenters
  .filter((item) => !['Москва', 'Санкт-Петербург', 'Севастополь'].includes(item.centerCity))
  .map((item) => [item.centerCity, item.regionName]));
const STANDALONE_CITY_NAMES = new Set([
  ...cityRouting.standaloneCities.map((name) => name.replace(/\s*\([^)]*\)\s*$/u, '').trim()),
  'Петропавловск-Камчатский',
]);
const DAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const SLOT_DAY_KEYS = new WeakMap<PreviewSlot, Map<string, string | null>>();
type PreviewCatalogSnapshot = { events: PreviewEvent[]; total: number; generatedAt: string | null };
const NEW_YEAR_CITY_REGION_OVERRIDES: Record<string, string> = {
  'Великий Новгород': 'Новгородская область',
  Владикавказ: 'Республика Северная Осетия - Алания',
  Волгоград: 'Волгоградская область',
  Волхов: 'Ленинградская область',
  Истра: 'Московская область',
  Курск: 'Курская область',
  'Лосино-Петровский': 'Московская область',
  Новосибирск: 'Новосибирская область',
  Одинцово: 'Московская область',
  'Петропавловск-Камчатский': 'Камчатский край',
  Рязань: 'Рязанская область',
  Смоленск: 'Смоленская область',
  Сочи: 'Краснодарский край',
};

const EMPTY_CATALOG_SNAPSHOT: PreviewCatalogSnapshot = {
  events: [],
  total: 0,
  generatedAt: null,
};

function cityRegion(city?: string | null): string | null {
  if (!city) return null;
  const clean = city.replace(/\s*\([^)]*\)\s*$/u, '').trim();
  const explicitRegion = city.match(/\(([^)]*(?:область|край|республика|округ)[^)]*)\)\s*$/iu)?.[1];
  const region = CITY_TO_REGION[city] || CITY_TO_REGION[clean] || NEW_YEAR_CITY_REGION_OVERRIDES[clean] || explicitRegion || REGION_BY_CENTER.get(clean) || null;
  return region === 'Москва' ? null : region;
}

function isRegionalCenter(city?: string | null): boolean {
  if (!city) return false;
  return NEW_YEAR_REGIONAL_CENTER_NAMES.has(city.replace(/\s*\([^)]*\)\s*$/u, '').trim());
}

function dayKey(value?: string | null, timeZone = 'Europe/Moscow'): string | null {
  if (!value) return null;
  const date = parseSessionStartsAt(value);
  if (Number.isNaN(date.getTime())) return null;
  let formatter = DAY_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    DAY_FORMATTERS.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const get = (part: string) => parts.find((item) => item.type === part)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function slotDayKey(slot: PreviewSlot, fallbackTimeZone = 'Europe/Moscow'): string | null {
  const timeZone = slot.timeZone || fallbackTimeZone;
  const cached = SLOT_DAY_KEYS.get(slot);
  if (cached?.has(timeZone)) return cached.get(timeZone) ?? null;
  const value = dayKey(slot.startsAt, timeZone);
  const timezoneCache = cached || new Map<string, string | null>();
  timezoneCache.set(timeZone, value);
  SLOT_DAY_KEYS.set(slot, timezoneCache);
  return value;
}

function seasonalSlots(event: PreviewEvent, restrictToSeason = true): PreviewSlot[] {
  if (!event.purchaseReady) return [];
  const eventTimeZone = resolveSessionTimeZone(event);
  const eventPurchaseUrl = event.purchaseUrl || event.widgetUrl || null;
  const sourceSlots = [...(event.upcomingSlots || [])];
  const slots = sourceSlots.map((slot) => ({
    ...slot,
    id: slot.id || slot.eventId || `${event.id}:${slot.startsAt || ''}`,
    timeZone: slot.timeZone || eventTimeZone,
    vacant: slot.vacant ?? event.vacant ?? null,
    purchaseUrl: slot.purchaseUrl || (sourceSlots.length === 1 || slot.startsAt === event.startsAt ? eventPurchaseUrl : null),
  }));
  if (event.startsAt && !slots.some((slot) => slot.startsAt === event.startsAt)) {
    slots.push({
      id: event.id,
      startsAt: event.startsAt,
      timeZone: eventTimeZone,
      purchaseUrl: event.purchaseUrl || event.widgetUrl || null,
      vacant: event.vacant ?? null,
    });
  }
  return slots.filter((slot) => {
    const day = slotDayKey(slot, eventTimeZone);
    return Boolean(day && (!restrictToSeason || (day >= FIRST_SEASON_DATE && day <= LAST_SEASON_DATE)) && slot.vacant !== 0);
  });
}

function recurringProgramIdentity(event: PreviewEvent): { key: string; title: string } | null {
  const match = event.title.match(/^(.*?),\s*\d{1,2}\s+\p{L}+(?:\.)?,\s*\d{1,2}:\d{2}$/u);
  const title = (match?.[1] || event.title).trim();
  if (!title || !event.city || !event.venue || !event.purchaseProvider) return null;
  const taxonomy = [event.catalogCategory, event.catalogSubcategory].map((item) =>
    typeof item === 'string' ? item : item?.slug || item?.title || '',
  );
  return {
    title,
    key: JSON.stringify([
      event.purchaseProvider,
      event.city.trim().toLocaleLowerCase('ru'),
      event.venue.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru'),
      title.toLocaleLowerCase('ru'),
      event.category?.trim().toLocaleLowerCase('ru') || '',
      taxonomy.map((value) => value.trim().toLocaleLowerCase('ru')),
      event.ageLimit || '',
    ]),
  };
}

function groupEvents(events: PreviewEvent[], options: { restrictToSeason?: boolean; splitByDate?: boolean } = {}): PreviewEvent[] {
  const restrictToSeason = options.restrictToSeason ?? true;
  const splitByDate = options.splitByDate ?? true;
  const candidateGroups = new Map<string, { identity: { key: string; title: string }; rows: PreviewEvent[] }>();
  const directGroups = new Map<string, PreviewEvent[]>();
  const slotsByEvent = new Map<PreviewEvent, PreviewSlot[]>();
  const getSlots = (event: PreviewEvent) => {
    let slots = slotsByEvent.get(event);
    if (!slots) {
      slots = seasonalSlots(event, restrictToSeason);
      slotsByEvent.set(event, slots);
    }
    return slots;
  };
  const addDirect = (event: PreviewEvent) => {
    const key = event.eventPageSlug ? `page:${event.eventPageSlug}` : `catalog:${event.groupKey || event.id}`;
    const rows = directGroups.get(key) || [];
    rows.push(event);
    directGroups.set(key, rows);
  };

  for (const event of events) {
    const identity = recurringProgramIdentity(event);
    if (!identity) {
      addDirect(event);
      continue;
    }
    const group = candidateGroups.get(identity.key) || { identity, rows: [] };
    group.rows.push(event);
    candidateGroups.set(identity.key, group);
  }

  const datedGroups: Array<{ rows: PreviewEvent[]; identity: { key: string; title: string } | null; date: string }> = [];
  const splitByLocalDate = (rows: PreviewEvent[], identity: { key: string; title: string } | null, groupKey: string) => {
    const byDate = new Map<string, PreviewEvent[]>();
    for (const row of rows) {
      const slotsByDate = new Map<string, PreviewSlot[]>();
      for (const slot of getSlots(row)) {
        const date = slotDayKey(slot, resolveSessionTimeZone(row));
        if (!date) continue;
        const slots = slotsByDate.get(date) || [];
        slots.push(slot);
        slotsByDate.set(date, slots);
      }
      for (const [date, slots] of slotsByDate) {
        const dailyRows = byDate.get(date) || [];
        dailyRows.push({ ...row, groupKey, startsAt: slots[0]?.startsAt || row.startsAt, upcomingSlots: slots });
        byDate.set(date, dailyRows);
      }
    }
    if (splitByDate) {
      for (const [date, dailyRows] of byDate) datedGroups.push({ rows: dailyRows, identity, date });
    } else {
      const allRows = [...byDate.values()].flat();
      if (allRows.length) datedGroups.push({ rows: allRows, identity, date: 'all' });
    }
  };

  for (const group of candidateGroups.values()) {
    splitByLocalDate(group.rows, group.identity, `program:${group.rows[0]?.id || group.identity.key}`);
  }
  for (const [key, rows] of directGroups) splitByLocalDate(rows, null, key);

  return datedGroups.map(({ rows, identity, date }) => {
    const first = rows[0]!;
    const pageSlugs = [...new Set(rows.map((row) => row.eventPageSlug).filter((slug): slug is string => Boolean(slug)))];
    const eventSlugs = [...new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)))];
    const widgetUrls = [...new Set(rows.map((row) => row.widgetUrl).filter((url): url is string => Boolean(url)))];
    const slots = new Map<string, PreviewSlot>();
    for (const row of rows) {
      for (const slot of getSlots(row)) {
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
        const knownVacant = [existing.vacant, slot.vacant].filter((value): value is number => typeof value === 'number');
        slots.set(slotKey, {
          ...existing,
          purchaseUrl: existing.purchaseUrl || slot.purchaseUrl || purchaseUrls[0],
          purchaseUrls: purchaseUrls.length > 1 ? purchaseUrls : undefined,
          vacant: knownVacant.length ? Math.max(...knownVacant) : null,
        });
      }
    }
    const prices = rows.map((row) => Number(row.priceFrom)).filter((price) => Number.isFinite(price) && price >= 0);
    const upcomingSlots = [...slots.values()].sort((a, b) => new Date(a.startsAt || 0).getTime() - new Date(b.startsAt || 0).getTime());
    const vacant = upcomingSlots.map((slot) => slot.vacant).filter((value): value is number => typeof value === 'number');
    const baseGroupKey = identity ? `program:${first.id}` : first.groupKey || first.id;
    return {
      ...first,
      title: identity ? identity.title : first.title,
      groupKey: `${baseGroupKey}:date:${date}`,
      eventPageSlug: pageSlugs.length === 1 ? pageSlugs[0] : null,
      eventPageIndexableSlug: pageSlugs.length === 1 ? first.eventPageIndexableSlug : null,
      slug: eventSlugs.length === 1 ? eventSlugs[0] : null,
      purchaseUrl: upcomingSlots[0]?.purchaseUrl || null,
      widgetUrl: widgetUrls.length === 1 ? widgetUrls[0] : null,
      sessionCount: upcomingSlots.length,
      subcategories: [...new Set(rows.flatMap((row) => row.subcategories || []))],
      tagLabels: [...new Set(rows.flatMap((row) => row.tagLabels || []))],
      tags: [...new Set(rows.flatMap((row) => row.tags || []))],
      upcomingSlots,
      priceFrom: prices.length ? Math.min(...prices) : null,
      vacant: vacant.length ? Math.min(...vacant) : null,
    };
  }).filter((event) => event.upcomingSlots?.length);
}

function slotsForDate(event: PreviewEvent, date: string, restrictToSeason = true): PreviewSlot[] {
  const slots = event.upcomingSlots || [];
  if (!date || date === 'all') return slots;
  const eventTimeZone = resolveSessionTimeZone(event);
  const today = dayKey(new Date().toISOString(), eventTimeZone) || '';
  const tomorrowDate = today ? new Date(`${today}T00:00:00Z`) : null;
  tomorrowDate?.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate?.toISOString().slice(0, 10) || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return slots.filter((slot) => slotDayKey(slot, eventTimeZone) === date);
  return slots.filter((slot) => {
    const day = slotDayKey(slot, eventTimeZone);
    if (!day) return false;
    if (date === 'today') return day === today;
    if (date === 'tomorrow') return day === tomorrow;
    if (date === 'dec31') return day === '2026-12-31';
    if (date === 'dec24to31') return day >= '2026-12-24' && day <= '2026-12-31';
    if (date === 'jan1') return day === '2027-01-01';
    if (date === 'jan1to14') return day >= '2027-01-01' && day <= '2027-01-14';
    if (date === 'holidays') return day >= '2026-12-23' && day <= '2027-01-14';
    if (date === 'weekend') {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
      return weekday === 0 || weekday === 6;
    }
    return false;
  });
}

function slotsForDateRange(event: PreviewEvent, from?: string, to?: string, restrictToSeason = true): PreviewSlot[] {
  if (!from && !to) return seasonalSlots(event, restrictToSeason);
  const eventTimeZone = resolveSessionTimeZone(event);
  return seasonalSlots(event, restrictToSeason).filter((slot) => {
    const day = slotDayKey(slot, eventTimeZone);
    return Boolean(day && (!from || day >= from) && (!to || day <= to));
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

function matchesPriceRange(event: PreviewEvent, from?: number, to?: number): boolean {
  if (from == null && to == null) return true;
  // The visible “from” price is the event's lowest available tariff.
  // Keep range filtering consistent with the price shown on each card.
  const startingPrice = typeof event.priceFrom === 'number' ? event.priceFrom : event.priceTo;
  if (typeof startingPrice !== 'number') return false;
  return (from == null || startingPrice >= from) && (to == null || startingPrice <= to);
}

function lowStock(event: PreviewEvent): boolean {
  return typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= 8;
}

function normalizeAgeLimit(value?: string | null): string | null {
  const match = String(value || '').match(/(?:^|\D)(0|3|6|12|16|18)\s*\+/u);
  return match?.[1] ? `${match[1]}+` : null;
}

async function fetchCatalogPage(landingSlug: string, offset: number): Promise<EventsResponse | null> {
  const allowCiBuildFallback =
    process.env.DAIBILET_CI_ALLOW_EMPTY_NEW_YEAR === '1' && isProductionBuildPhase();

  return fetchPublicApiJson<EventsResponse | null>('/api/public/events', {
    searchParams: { landing: landingSlug, limit: 200, offset },
    timeoutMs: 60_000,
    revalidateSeconds: 300,
    // The generic CI build has no API process. In that build only, render an
    // empty fixture so the route and component still compile. Production deploy
    // builds keep this strict and must read the live catalog through the tunnel.
    notFoundAsNull: allowCiBuildFallback,
  });
}

const fetchCachedCatalogPage = (landingSlug: string, offset: number) => unstable_cache(
  () => fetchCatalogPage(landingSlug, offset),
  [
    'thematic-preview-catalog-page-v2',
    `${landingSlug}:${offset}`,
    // Keep local catalog previews isolated when they switch between the local
    // API and the read-only production catalog.
    process.env.DAIBILET_PUBLIC_CATALOG_API_INTERNAL_URL?.trim() || 'default-api',
  ],
  { revalidate: 300, tags: ['thematic-preview-catalog'] },
)();

async function fetchCatalogSnapshot(landingSlug: string): Promise<PreviewCatalogSnapshot> {
  const first = await fetchCachedCatalogPage(landingSlug, 0);
  if (!first) return EMPTY_CATALOG_SNAPSHOT;
  const events = first.items || [];
  const total = Number(first.total) || events.length;
  const pageSize = Number(first.limit) || 200;
  const offsets = Array.from(
    { length: Math.max(0, Math.ceil(total / pageSize) - 1) },
    (_, index) => (index + 1) * pageSize,
  );
  // Cache pages separately. A whole thematic catalog can exceed Next's 2 MB
  // per-item data-cache limit even though each API page is safely below it.
  const remainingPages: Array<EventsResponse | null> = [];
  for (const offset of offsets) {
    remainingPages.push(await fetchCachedCatalogPage(landingSlug, offset));
  }
  if (remainingPages.some((page) => !page)) return EMPTY_CATALOG_SNAPSHOT;
  events.push(...remainingPages.flatMap((page) => page?.items || []));
  return { events, total, generatedAt: first.generatedAt || null };
}

export async function buildThematicPreviewData(landingSlug: PreviewTheme, filters: PreviewFilters = {}) {
  const snapshot = await fetchCatalogSnapshot(landingSlug);
  const rawEvents = snapshot.events;
  const sourceTotal = snapshot.total;

  // First narrow the seasonal source to explicitly holiday-related events,
  // then group sessions and derive the user-facing format facets.
  const relevantEvents = landingSlug === 'new-year' ? rawEvents.filter(isRelevantToNewYearLanding) : rawEvents;
  const grouped = groupEvents(relevantEvents, { restrictToSeason: landingSlug === 'new-year', splitByDate: landingSlug === 'new-year' });
  const query = String(filters.q || '').trim().toLocaleLowerCase('ru');
  const dateFilter = filters.date || 'all';
  const priceFilter = filters.price || 'all';
  const formatFilter = filters.format || '';
  type Axis = 'geo' | 'date' | 'price' | 'format' | 'stock' | 'q' | 'age';
  type IndexedEvent = {
    event: PreviewEvent;
    city: string;
    region: string | null;
    format: string;
    formats: string[];
    upcomingSlots: PreviewSlot[];
    matches: Record<Axis, boolean>;
  };
  const indexed = grouped.map((event): IndexedEvent => {
    const city = event.city || '';
    const region = cityRegion(city);
    const formats = resolveThematicFormats(event, landingSlug);
    const format = formats[0] || (landingSlug === 'family-kids' ? 'Другие мероприятия' : 'Другие жанры');
    const upcomingSlots = filters.dateFrom || filters.dateTo
      ? slotsForDateRange(event, filters.dateFrom, filters.dateTo, landingSlug === 'new-year')
      : slotsForDate(event, dateFilter, landingSlug === 'new-year');
    const haystack = query
      ? [event.title, event.city, event.venue, event.category, event.catalogCategory, event.catalogSubcategory, ...(event.tagLabels || []), ...(event.tags || [])]
        .map(String).join(' ').toLocaleLowerCase('ru')
      : '';
    return {
      event,
      city,
      region,
      format,
      formats,
      upcomingSlots,
      matches: {
        geo: (!filters.city || filters.city === 'Вся Россия' || event.city === filters.city) &&
          (!filters.region || (region === filters.region && !isRegionalCenter(city))),
        date: upcomingSlots.length > 0,
        price: matchesPrice(event, priceFilter) && matchesPriceRange(event, filters.priceFrom, filters.priceTo),
        format: !formatFilter || formatFilter === 'Все форматы' || formats.includes(formatFilter),
        stock: (!filters.lowStock || lowStock(event)) && (!filters.availableOnly || (typeof event.vacant === 'number' && event.vacant > 0)),
        q: !query || haystack.includes(query),
        age: !filters.ageLimit || normalizeAgeLimit(event.ageLimit) === filters.ageLimit,
      },
    };
  });
  const matchesExcept = (item: IndexedEvent, except?: Axis) =>
    (except === 'geo' || item.matches.geo) &&
    (except === 'date' || item.matches.date) &&
    (except === 'price' || item.matches.price) &&
    (except === 'format' || item.matches.format) &&
    (except === 'stock' || item.matches.stock) &&
    (except === 'q' || item.matches.q) &&
    (except === 'age' || item.matches.age);

  const filtered = indexed.filter((item) => matchesExcept(item)).map(({ event, upcomingSlots }) => ({
    ...event,
    upcomingSlots,
  }));
  const sorted = sortNewYearPreviewEvents(filtered, filters.sort === 'price' || filters.sort === 'price-desc' ? filters.sort : 'date');

  const dateValues = landingSlug === 'new-year'
    ? ['all', 'dec24to31', 'dec31', 'jan1', 'jan1to14', 'weekend', 'holidays']
    : ['all', 'today', 'tomorrow', 'weekend'];
  const priceValues = ['all', 'free', 'under1000', 'under2000', 'over2000', 'over5000', 'over10000'];
  const cityCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const dateCounts = new Map(dateValues.map((value) => [value, 0]));
  const priceCounts = new Map(priceValues.map((value) => [value, 0]));
  const formatCounts = new Map<string, number>();
  const ageCounts = new Map<string, number>();
  let allFormatsCount = 0;
  let lowStockCount = 0;
  let allGeoFacetCount = 0;
  for (const item of indexed) {
    if (matchesExcept(item, 'geo')) {
      allGeoFacetCount++;
      if (item.city) cityCounts.set(item.city, (cityCounts.get(item.city) || 0) + 1);
      if (item.region && !isRegionalCenter(item.city)) regionCounts.set(item.region, (regionCounts.get(item.region) || 0) + 1);
    }
    if (matchesExcept(item, 'date')) {
      for (const value of dateValues) {
        if (slotsForDate(item.event, value, landingSlug === 'new-year').length) dateCounts.set(value, (dateCounts.get(value) || 0) + 1);
      }
    }
    if (matchesExcept(item, 'price')) {
      for (const value of priceValues) {
        if (matchesPrice(item.event, value)) priceCounts.set(value, (priceCounts.get(value) || 0) + 1);
      }
    }
    if (matchesExcept(item, 'format')) {
      allFormatsCount++;
      for (const label of item.formats) formatCounts.set(label, (formatCounts.get(label) || 0) + 1);
    }
    if (matchesExcept(item, 'age')) {
      const age = normalizeAgeLimit(item.event.ageLimit);
      if (age) ageCounts.set(age, (ageCounts.get(age) || 0) + 1);
    }
    if (matchesExcept(item, 'stock') && lowStock(item.event)) lowStockCount++;
  }
  const cities = [...new Set(indexed.map((item) => item.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const regions = [...regionCounts.keys()];
  const visibleFormatNames = visibleThematicFormatNames(formatCounts, landingSlug);
  const facets = {
    cities: [{ name: 'Вся Россия', count: allGeoFacetCount, filterable: true }, ...cities.map((name) => {
      const normalizedName = name.replace(/\s*\([^)]*\)\s*$/u, '').trim();
      const eventCount = cityCounts.get(name) || 0;
      return {
        name,
        count: eventCount,
        region: cityRegion(name) || undefined,
        filterable: !cityRegion(name) || REGION_CENTER_NAMES.has(normalizedName) || STANDALONE_CITY_NAMES.has(normalizedName) || eventCount >= 6,
      };
    })],
    regions: regions.map((name) => ({ name, count: regionCounts.get(name) || 0 })).filter((region) => region.count > 0).sort((a, b) => b.count - a.count || (a.name || '').localeCompare(b.name || '', 'ru')),
    dates: dateValues.map((value) => ({ value, count: dateCounts.get(value) || 0 })),
    prices: priceValues.map((value) => ({ value, count: priceCounts.get(value) || 0 })),
    formats: [
      { name: 'Все форматы', count: allFormatsCount },
      ...visibleFormatNames.map((name) => ({ name, count: formatCounts.get(name) || 0 })),
    ],
    ages: [...ageCounts.entries()].sort((a, b) => Number(a[0].replace('+', '')) - Number(b[0].replace('+', ''))).map(([name, count]) => ({ name, value: name, count })),
    lowStock: lowStockCount,
    priceRange: (() => {
      const values = indexed.flatMap(({ event }) => [event.priceFrom, event.priceTo])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);
      const max = values.length ? Math.max(...values) : 10_000;
      return { min: 0, max: Math.max(10_000, Math.ceil(max / 1_000) * 1_000) };
    })(),
  };

  const page = getNewYearPreviewPage(sorted, sorted.length, Number(filters.offset) || 0, PAGE_SIZE);
  const prices = sorted.map((event) => event.priceFrom).filter((value): value is number => typeof value === 'number' && value > 0);
  return {
    ...page,
    sourceTotal,
    generatedAt: snapshot.generatedAt,
    priceFrom: prices.length ? Math.min(...prices) : null,
    facets,
  };
}

export function buildNewYearPreviewData(filters: PreviewFilters = {}) {
  return buildThematicPreviewData('new-year', filters);
}

/** Compact browser-side index. Rich descriptions and image data stay in SSR/detail requests. */
export async function buildThematicPreviewIndex(landingSlug: PreviewTheme): Promise<NewYearPreviewIndex> {
  const snapshot = await fetchCatalogSnapshot(landingSlug);
  const relevantEvents = landingSlug === 'new-year' ? snapshot.events.filter(isRelevantToNewYearLanding) : snapshot.events;
  const events: CompactPreviewEvent[] = groupEvents(relevantEvents, { restrictToSeason: landingSlug === 'new-year', splitByDate: landingSlug === 'new-year' }).map((event) => {
    const region = cityRegion(event.city);
    const cleanCity = (event.city || '').replace(/\s*\([^)]*\)\s*$/u, '').trim();
    const catalogCategory = typeof event.catalogCategory === 'string'
      ? event.catalogCategory
      : event.catalogCategory ? { title: event.catalogCategory.title, slug: event.catalogCategory.slug } : null;
    const catalogSubcategory = typeof event.catalogSubcategory === 'string'
      ? event.catalogSubcategory
      : event.catalogSubcategory ? { title: event.catalogSubcategory.title, slug: event.catalogSubcategory.slug } : null;
    const searchText = [event.title, event.city, event.venue, event.category,
      typeof catalogCategory === 'string' ? catalogCategory : catalogCategory?.title,
      typeof catalogSubcategory === 'string' ? catalogSubcategory : catalogSubcategory?.title,
      ...(event.tagLabels || []), ...(event.tags || []), ...(event.subcategories || []),
    ].filter(Boolean).join(' ').toLocaleLowerCase('ru');
    return {
      id: event.id,
      title: event.title,
      city: event.city,
      destination: event.destination,
      timeZone: event.timeZone,
      venue: event.venue,
      category: event.category,
      catalogCategory,
      catalogSubcategory,
      subcategories: event.subcategories,
      tags: event.tags,
      tagLabels: event.tagLabels,
      sessionCount: event.sessionCount,
      startsAt: event.startsAt,
      eventPageSlug: event.eventPageSlug,
      eventPageIndexableSlug: event.eventPageIndexableSlug,
      slug: event.slug,
      groupKey: event.groupKey,
      priceFrom: event.priceFrom,
      priceTo: event.priceTo,
      vacant: event.vacant,
      purchaseUrl: event.purchaseUrl,
      widgetUrl: event.widgetUrl,
      purchaseProvider: event.purchaseProvider,
      offerSourceCode: event.offerSourceCode,
      purchaseMode: event.purchaseMode,
      purchaseReady: event.purchaseReady,
      ageLimit: event.ageLimit,
      upcomingSlots: (event.upcomingSlots || []).map((slot) => ({
        id: slot.id,
        startsAt: slot.startsAt,
        dayKey: slotDayKey(slot, resolveSessionTimeZone(event)) || '',
        dateLabel: slot.dateLabel,
        timeLabel: slot.timeLabel,
        timeZone: slot.timeZone,
        purchaseUrl: slot.purchaseUrl,
        purchaseUrls: slot.purchaseUrls,
        vacant: slot.vacant,
      })),
      region,
      regionCenter: isRegionalCenter(event.city),
      standaloneCity: STANDALONE_CITY_NAMES.has(cleanCity),
      format: resolveThematicFormats(event, landingSlug)[0] || (landingSlug === 'family-kids' ? 'Другие мероприятия' : 'Другие жанры'),
      formats: resolveThematicFormats(event, landingSlug),
      searchText,
    };
  });
  const prices = events.flatMap((event) => [event.priceFrom, event.priceTo])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);
  const max = prices.length ? Math.max(...prices) : 10_000;
  return {
    events,
    total: events.length,
    theme: landingSlug,
    sourceTotal: snapshot.total,
    generatedAt: snapshot.generatedAt,
    priceRange: { min: 0, max: Math.max(10_000, Math.ceil(max / 1_000) * 1_000) },
  };
}

export function buildNewYearPreviewIndex(): Promise<NewYearPreviewIndex> {
  return buildThematicPreviewIndex('new-year');
}
