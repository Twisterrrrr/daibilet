import { sortNewYearPreviewEvents } from '@/lib/new-year-preview-order';
import { visibleThematicFormatNames, type PreviewTheme } from './preview-format';
import type { PreviewEvent, PreviewSlot } from './preview-data';

export type CompactPreviewSlot = PreviewSlot & { dayKey: string };
export type CompactPreviewEvent = Omit<PreviewEvent, 'description' | 'imageUrl' | 'upcomingSlots'> & {
  upcomingSlots: CompactPreviewSlot[];
  region: string | null;
  regionCenter: boolean;
  standaloneCity: boolean;
  format: string;
  formats: string[];
  searchText: string;
};

export type NewYearPreviewIndex = {
  events: CompactPreviewEvent[];
  total: number;
  sourceTotal: number;
  generatedAt: string | null;
  priceRange: { min: number; max: number };
  theme: PreviewTheme;
};

type LocalFilters = {
  city?: string;
  region?: string;
  date?: string;
  customDate?: string;
  dateFrom?: string;
  dateTo?: string;
  price?: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  format?: string;
  q?: string;
  sort?: string;
  lowStock?: boolean;
  availableOnly?: boolean;
  ageLimit?: string;
};
type Facet = { name?: string; value?: string; count: number; region?: string; filterable?: boolean; geoKind?: 'city' | 'region' };
export type LocalPreviewData = {
  items: PreviewEvent[];
  total: number;
  sourceTotal: number;
  offset: number;
  nextOffset: number;
  limit: number;
  hasMore: boolean;
  generatedAt: string | null;
  priceFrom: number | null;
  facets: { cities: Facet[]; regions: Facet[]; dates: Facet[]; prices: Facet[]; formats: Facet[]; ages: Facet[]; lowStock: number; priceRange: { min: number; max: number } };
};

const DATE_VALUES = ['all', 'today', 'tomorrow', 'weekend', 'dec24to31', 'dec31', 'jan1', 'jan1to14', 'holidays'];
const PRICE_VALUES = ['all', 'free', 'under1000', 'under2000', 'over2000', 'over5000', 'over10000'];
function slotDayKey(slot: CompactPreviewSlot): string | null {
  return /^\d{4}-\d{2}-\d{2}$/u.test(slot.dayKey) ? slot.dayKey : null;
}

function dayKeyAt(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (name: string) => parts.find((part) => part.type === name)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function slotsForDate(event: CompactPreviewEvent, value: string, customDate?: string, from?: string, to?: string): CompactPreviewSlot[] {
  const eventTimeZone = event.timeZone || 'Europe/Moscow';
  const today = dayKeyAt(new Date(), eventTimeZone);
  const tomorrowDate = new Date(`${today}T00:00:00Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);
  return (event.upcomingSlots || []).filter((slot) => {
    const day = slotDayKey(slot);
    if (!day) return false;
    if (from || to) return (!from || day >= from) && (!to || day <= to);
    if (!value || value === 'all') return true;
    if (value === 'custom') return day === customDate;
    if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) return day === value;
    if (value === 'today') return day === today;
    if (value === 'tomorrow') return day === tomorrow;
    if (value === 'dec24to31') return day >= '2026-12-24' && day <= '2026-12-31';
    if (value === 'dec31') return day === '2026-12-31';
    if (value === 'jan1') return day === '2027-01-01';
    if (value === 'jan1to14') return day >= '2027-01-01' && day <= '2027-01-14';
    if (value === 'holidays') return day >= '2026-12-23' && day <= '2027-01-14';
    if (value === 'weekend') {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
      return weekday === 0 || weekday === 6;
    }
    return false;
  });
}

function matchesPrice(event: PreviewEvent, value: string): boolean {
  if (!value || value === 'all') return true;
  if (typeof event.priceFrom !== 'number') return false;
  if (value === 'free') return event.priceFrom === 0;
  if (value === 'under1000') return event.priceFrom <= 1_000;
  if (value === 'under2000') return event.priceFrom <= 2_000;
  if (value === 'over2000') return event.priceFrom >= 2_000;
  if (value === 'over5000') return event.priceFrom >= 5_000;
  if (value === 'over10000') return event.priceFrom >= 10_000;
  return true;
}

function matchesPriceRange(event: PreviewEvent, from?: number | null, to?: number | null): boolean {
  if (from == null && to == null) return true;
  // Listings advertise the minimum available ticket price. Filter against that
  // same value; overlapping any higher tariff makes an event appear below its
  // displayed starting price threshold.
  const startingPrice = typeof event.priceFrom === 'number' ? event.priceFrom : event.priceTo;
  if (typeof startingPrice !== 'number') return false;
  return (from == null || startingPrice >= from) && (to == null || startingPrice <= to);
}

function isLowStock(event: PreviewEvent): boolean {
  return typeof event.vacant === 'number' && event.vacant > 0 && event.vacant <= 8;
}

function normalizeAgeLimit(value?: string | null): string | null {
  const match = String(value || '').match(/(?:^|\D)(0|3|6|12|16|18)\s*\+/u);
  return match?.[1] ? `${match[1]}+` : null;
}

export function deriveNewYearPreviewData(
  index: NewYearPreviewIndex,
  filters: LocalFilters,
  visibleCount: number,
  pageSize = 30,
): LocalPreviewData {
  type Axis = 'geo' | 'date' | 'price' | 'format' | 'stock' | 'q' | 'age';
  const query = String(filters.q || '').trim().toLocaleLowerCase('ru');
  const indexed = index.events.map((event) => {
    const slots = slotsForDate(event, String(filters.date || 'all'), filters.customDate, filters.dateFrom, filters.dateTo);
    const min = typeof event.priceFrom === 'number' ? event.priceFrom : event.priceTo;
    const max = typeof event.priceTo === 'number' ? event.priceTo : event.priceFrom;
    return {
      event,
      slots,
      matches: {
        geo: (!filters.city || filters.city === 'Вся Россия' || event.city === filters.city) &&
          (!filters.region || (event.region === filters.region && !event.regionCenter)),
        date: slots.length > 0,
        price: matchesPrice(event, String(filters.price || 'all')) && matchesPriceRange(event, filters.priceFrom, filters.priceTo),
        format: !filters.format || filters.format === 'Все форматы' || (event.formats || [event.format]).includes(filters.format),
        stock: (!filters.lowStock || isLowStock(event)) && (!filters.availableOnly || (typeof event.vacant === 'number' && event.vacant > 0)),
        q: !query || event.searchText.includes(query),
        age: !filters.ageLimit || normalizeAgeLimit(event.ageLimit) === filters.ageLimit,
      },
      min,
      max,
    };
  });
  const matchesExcept = (item: typeof indexed[number], except?: Axis) =>
    (except === 'geo' || item.matches.geo) &&
    (except === 'date' || item.matches.date) &&
    (except === 'price' || item.matches.price) &&
    (except === 'format' || item.matches.format) &&
    (except === 'stock' || item.matches.stock) &&
    (except === 'q' || item.matches.q) &&
    (except === 'age' || item.matches.age);

  const filtered = indexed.filter((item) => matchesExcept(item)).map(({ event, slots }) => ({ ...event, upcomingSlots: slots }));
  const sorted = sortNewYearPreviewEvents(filtered, filters.sort === 'price' || filters.sort === 'price-desc' ? filters.sort : 'date');
  const cityCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const dateCounts = new Map(DATE_VALUES.map((value) => [value, 0]));
  const priceCounts = new Map(PRICE_VALUES.map((value) => [value, 0]));
  const formatCounts = new Map<string, number>();
  const ageCounts = new Map<string, number>();
  let allFormatsCount = 0;
  let allGeoCount = 0;
  let lowStockCount = 0;
  for (const item of indexed) {
    if (matchesExcept(item, 'geo')) {
      allGeoCount++;
      if (item.event.city) cityCounts.set(item.event.city, (cityCounts.get(item.event.city) || 0) + 1);
      if (item.event.region && !item.event.regionCenter) regionCounts.set(item.event.region, (regionCounts.get(item.event.region) || 0) + 1);
    }
    if (matchesExcept(item, 'date')) {
      for (const value of DATE_VALUES) {
        if (slotsForDate(item.event, value, filters.customDate).length) dateCounts.set(value, (dateCounts.get(value) || 0) + 1);
      }
    }
    if (matchesExcept(item, 'price')) {
      for (const value of PRICE_VALUES) if (matchesPrice(item.event, value)) priceCounts.set(value, (priceCounts.get(value) || 0) + 1);
    }
    if (matchesExcept(item, 'format')) {
      allFormatsCount++;
      for (const value of item.event.formats || [item.event.format]) formatCounts.set(value, (formatCounts.get(value) || 0) + 1);
    }
    if (matchesExcept(item, 'age')) {
      const age = normalizeAgeLimit(item.event.ageLimit);
      if (age) ageCounts.set(age, (ageCounts.get(age) || 0) + 1);
    }
    if (matchesExcept(item, 'stock') && isLowStock(item.event)) lowStockCount++;
  }
  const cities = [...new Set(index.events.map((event) => event.city).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'ru'));
  const cityFacets: Facet[] = [{ name: 'Вся Россия', count: allGeoCount, filterable: true }, ...cities.map((name) => {
    const sample = index.events.find((event) => event.city === name)!;
    const count = cityCounts.get(name) || 0;
    return { name, count, region: sample.region || undefined, filterable: !sample.region || sample.regionCenter || sample.standaloneCity || count >= 6 };
  })];
  const regionFacets = [...regionCounts.keys()].sort((a, b) => (regionCounts.get(b) || 0) - (regionCounts.get(a) || 0) || a.localeCompare(b, 'ru'))
    .map((name) => ({ name, count: regionCounts.get(name) || 0 }));
  const visibleFormats = visibleThematicFormatNames(formatCounts, index.theme);
  const prices = sorted.map((event) => event.priceFrom).filter((value): value is number => typeof value === 'number' && value > 0);
  const items = sorted.slice(0, visibleCount);
  return {
    items,
    total: sorted.length,
    sourceTotal: index.sourceTotal,
    offset: 0,
    nextOffset: items.length,
    limit: pageSize,
    hasMore: items.length < sorted.length,
    generatedAt: index.generatedAt,
    priceFrom: prices.length ? Math.min(...prices) : null,
    facets: {
      cities: cityFacets,
      regions: regionFacets,
      dates: DATE_VALUES.map((value) => ({ value, count: dateCounts.get(value) || 0 })),
      prices: PRICE_VALUES.map((value) => ({ value, count: priceCounts.get(value) || 0 })),
      formats: [
        { name: 'Все форматы', count: allFormatsCount },
        ...visibleFormats.map((name) => ({ name, count: formatCounts.get(name) || 0 })),
      ],
      ages: [...ageCounts.entries()].sort((a, b) => Number(a[0].replace('+', '')) - Number(b[0].replace('+', ''))).map(([name, count]) => ({ name, value: name, count })),
      lowStock: lowStockCount,
      priceRange: index.priceRange,
    },
  };
}
