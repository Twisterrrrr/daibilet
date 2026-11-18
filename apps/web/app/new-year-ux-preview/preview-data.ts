import { unstable_cache } from 'next/cache';
import { fetchPublicApiJson } from '@/server/public-api-client';
import { resolveSessionTimeZone } from '@/lib/city-timezone';
import { parseSessionStartsAt } from '@/lib/datetime';
import cityRouting from '../../../../data/geo/city-routing.ru.json';
import regionHubs from '../../../../data/geo/region-hubs.ru.json';
import { resolvePreviewFormat } from './preview-format';

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

function seasonalSlots(event: PreviewEvent): PreviewSlot[] {
  if (!event.purchaseReady) return [];
  const eventTimeZone = resolveSessionTimeZone(event);
  const eventPurchaseUrl = event.purchaseUrl || event.widgetUrl || null;
  const sourceSlots = [...(event.upcomingSlots || [])];
  const slots = sourceSlots.map((slot) => ({
    ...slot,
    id: slot.id || slot.eventId || `${event.id}:${slot.startsAt || ''}`,
    timeZone: slot.timeZone || eventTimeZone,
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
    return Boolean(day && day >= FIRST_SEASON_DATE && day <= LAST_SEASON_DATE);
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

function groupEvents(events: PreviewEvent[]): PreviewEvent[] {
  const candidateGroups = new Map<string, { identity: { key: string; title: string }; rows: PreviewEvent[] }>();
  const directGroups = new Map<string, PreviewEvent[]>();
  const slotsByEvent = new Map<PreviewEvent, PreviewSlot[]>();
  const getSlots = (event: PreviewEvent) => {
    let slots = slotsByEvent.get(event);
    if (!slots) {
      slots = seasonalSlots(event);
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
    for (const [date, dailyRows] of byDate) datedGroups.push({ rows: dailyRows, identity, date });
  };

  for (const group of candidateGroups.values()) {
    splitByLocalDate(group.rows, group.identity, `program:${group.rows[0]?.id || group.identity.key}`);
  }
  for (const [key, rows] of directGroups) splitByLocalDate(rows, null, key);

  return datedGroups.map(({ rows, identity, date }) => {
    const first = rows[0]!;
    const pageSlugs = [...new Set(rows.map((row) => row.eventPageSlug).filter((slug): slug is string => Boolean(slug)))];
    const eventSlugs = [...new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)))];
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
    const baseGroupKey = identity ? `program:${first.id}` : first.groupKey || first.id;
    return {
      ...first,
      title: identity ? identity.title : first.title,
      groupKey: `${baseGroupKey}:date:${date}`,
      eventPageSlug: pageSlugs.length === 1 ? pageSlugs[0] : null,
      eventPageIndexableSlug: pageSlugs.length === 1 ? first.eventPageIndexableSlug : null,
      slug: eventSlugs.length === 1 ? eventSlugs[0] : null,
      purchaseUrl: upcomingSlots[0]?.purchaseUrl || null,
      widgetUrl: null,
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

function slotsForDate(event: PreviewEvent, date: string): PreviewSlot[] {
  const slots = event.upcomingSlots || [];
  if (!date || date === 'all') return slots;
  const eventTimeZone = resolveSessionTimeZone(event);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return slots.filter((slot) => slotDayKey(slot, eventTimeZone) === date);
  return slots.filter((slot) => {
    const day = slotDayKey(slot, eventTimeZone);
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

const fetchCatalogSnapshot = unstable_cache(async (): Promise<PreviewCatalogSnapshot> => {
  const first = await fetchCatalogPage(0);
  const events = first.items || [];
  const total = Number(first.total) || events.length;
  const pageSize = Number(first.limit) || 200;
  const offsets = Array.from(
    { length: Math.max(0, Math.ceil(total / pageSize) - 1) },
    (_, index) => (index + 1) * pageSize,
  );
  const remainingPages = await Promise.all(offsets.map((offset) => fetchCatalogPage(offset)));
  events.push(...remainingPages.flatMap((page) => page.items || []));
  return { events, total, generatedAt: first.generatedAt || null };
}, ['new-year-preview-catalog-v1'], { revalidate: 300, tags: ['new-year-preview-catalog'] });

export async function buildNewYearPreviewData(filters: PreviewFilters = {}) {
  const snapshot = await fetchCatalogSnapshot();
  const rawEvents = snapshot.events;
  const sourceTotal = snapshot.total;

  const grouped = groupEvents(rawEvents);
  const query = String(filters.q || '').trim().toLocaleLowerCase('ru');
  const dateFilter = filters.date || 'all';
  const priceFilter = filters.price || 'all';
  const formatFilter = filters.format || '';
  type Axis = 'geo' | 'date' | 'price' | 'format' | 'stock' | 'q';
  type IndexedEvent = {
    event: PreviewEvent;
    city: string;
    region: string | null;
    format: string;
    upcomingSlots: PreviewSlot[];
    matches: Record<Axis, boolean>;
  };
  const indexed = grouped.map((event): IndexedEvent => {
    const city = event.city || '';
    const region = cityRegion(city);
    const format = resolvePreviewFormat(event);
    const upcomingSlots = slotsForDate(event, dateFilter);
    const haystack = query
      ? [event.title, event.city, event.venue, event.category, event.catalogCategory, event.catalogSubcategory, ...(event.tagLabels || []), ...(event.tags || [])]
        .map(String).join(' ').toLocaleLowerCase('ru')
      : '';
    return {
      event,
      city,
      region,
      format,
      upcomingSlots,
      matches: {
        geo: (!filters.city || filters.city === 'Вся Россия' || event.city === filters.city) &&
          (!filters.region || (region === filters.region && !isRegionalCenter(city))),
        date: upcomingSlots.length > 0,
        price: matchesPrice(event, priceFilter),
        format: !formatFilter || formatFilter === 'Все форматы' || format === formatFilter,
        stock: !filters.lowStock || lowStock(event),
        q: !query || haystack.includes(query),
      },
    };
  });
  const matchesExcept = (item: IndexedEvent, except?: Axis) =>
    (except === 'geo' || item.matches.geo) &&
    (except === 'date' || item.matches.date) &&
    (except === 'price' || item.matches.price) &&
    (except === 'format' || item.matches.format) &&
    (except === 'stock' || item.matches.stock) &&
    (except === 'q' || item.matches.q);

  const filtered = indexed.filter((item) => matchesExcept(item)).map(({ event, upcomingSlots }) => ({
    ...event,
    upcomingSlots,
  }));
  if (filters.sort === 'price') filtered.sort((a, b) => (a.priceFrom ?? Number.MAX_SAFE_INTEGER) - (b.priceFrom ?? Number.MAX_SAFE_INTEGER));
  else if (filters.sort === 'price-desc') filtered.sort((a, b) => (b.priceFrom ?? -1) - (a.priceFrom ?? -1));
  else filtered.sort((a, b) => new Date(a.upcomingSlots?.[0]?.startsAt || 0).getTime() - new Date(b.upcomingSlots?.[0]?.startsAt || 0).getTime());

  const dateValues = ['all', 'dec24to31', 'dec31', 'jan1', 'jan1to14', 'weekend', 'holidays'];
  const priceValues = ['all', 'free', 'under1000', 'under2000', 'over2000', 'over5000', 'over10000'];
  const cityCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const dateCounts = new Map(dateValues.map((value) => [value, 0]));
  const priceCounts = new Map(priceValues.map((value) => [value, 0]));
  const formatCounts = new Map<string, number>();
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
        if (slotsForDate(item.event, value).length) dateCounts.set(value, (dateCounts.get(value) || 0) + 1);
      }
    }
    if (matchesExcept(item, 'price')) {
      for (const value of priceValues) {
        if (matchesPrice(item.event, value)) priceCounts.set(value, (priceCounts.get(value) || 0) + 1);
      }
    }
    if (matchesExcept(item, 'format')) formatCounts.set(item.format, (formatCounts.get(item.format) || 0) + 1);
    if (matchesExcept(item, 'stock') && lowStock(item.event)) lowStockCount++;
  }
  const cities = [...new Set(indexed.map((item) => item.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  const regions = [...regionCounts.keys()];
  const formats = [...new Set(indexed.map((item) => item.format))].sort((a, b) => a.localeCompare(b, 'ru'));
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
    formats: [{ name: 'Все форматы', count: [...formatCounts.values()].reduce((sum, value) => sum + value, 0) }, ...formats.map((name) => ({ name, count: formatCounts.get(name) || 0 }))],
    lowStock: lowStockCount,
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
    generatedAt: snapshot.generatedAt,
    priceFrom: prices.length ? Math.min(...prices) : null,
    facets,
  };
}
