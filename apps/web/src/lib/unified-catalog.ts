import type { PublicCatalogQuery } from '@daibilet/contracts/schemas';
import type {
  PublicAdmissionCatalogItemDto,
  PublicUnifiedCatalogItemDto,
} from '@daibilet/contracts/catalog';
import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

import type { FinanceAdmissionProduct } from '@/lib/finance-projection';

export type AdmissionCatalogTaxonomy = {
  category: { slug: string; title: string } | null;
  subcategory: { slug: string; title: string } | null;
};

export function normalizeCatalogSearchKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ');
}
function isoDay(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function localDayOffset(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function moscowToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

function presetDateRange(preset: string, now = new Date()): [string, string] | null {
  const today = moscowToday(now);
  if (preset === 'today') return [today, today];
  if (preset === 'tomorrow') {
    const tomorrow = localDayOffset(today, 1);
    return [tomorrow, tomorrow];
  }
  if (preset === 'weekend') {
    const noonUtc = new Date(`${today}T12:00:00.000Z`);
    const weekday = noonUtc.getUTCDay();
    const daysToSaturday = weekday === 0 ? -1 : 6 - weekday;
    const saturday = localDayOffset(today, daysToSaturday);
    return [saturday, localDayOffset(saturday, 1)];
  }
  return null;
}

function validityCoversRange(
  product: FinanceAdmissionProduct,
  from: string,
  to: string,
): boolean {
  const validFrom = isoDay(product.validFrom);
  const validTo = isoDay(product.validTo);
  if (validFrom && validFrom > to) return false;
  if (validTo && validTo < from) return false;
  if (product.validityMode === 'FIXED_WINDOW' && !validFrom && !validTo) return false;
  return true;
}

export function matchesAdmissionCatalogFilters(
  product: FinanceAdmissionProduct,
  taxonomy: AdmissionCatalogTaxonomy,
  query: PublicCatalogQuery,
  now = new Date(),
): boolean {
  if (!product.canSell || !product.offers.length) return false;

  const q = normalizeCatalogSearchKey(query.q);
  if (q) {
    const text = normalizeCatalogSearchKey([
      product.shortTitle,
      product.title,
      product.shortDescription,
      product.venue?.title,
      product.city?.title,
      product.type,
      taxonomy.category?.title,
      taxonomy.subcategory?.title,
    ].filter(Boolean).join(' '));
    if (!text.includes(q)) return false;
  }

  const city = normalizeCatalogSearchKey(query.city);
  if (city && city !== 'all') {
    const cityValues = [product.city?.slug, product.city?.citySlug, product.city?.title, product.venue?.citySlug, product.venue?.cityTitle]
      .map(normalizeCatalogSearchKey);
    if (!cityValues.includes(city)) return false;
  }
  const destination = normalizeCatalogSearchKey(query.destination);
  if (destination && destination !== 'all') {
    const destinationValues = [product.city?.slug, product.city?.citySlug, product.city?.title, product.venue?.citySlug, product.venue?.cityTitle]
      .map(normalizeCatalogSearchKey);
    if (!destinationValues.includes(destination)) return false;
  }

  const category = normalizeCatalogSearchKey(query.category);
  if (category && category !== 'all') {
    const categories = [taxonomy.category?.slug, taxonomy.category?.title, taxonomy.subcategory?.slug, taxonomy.subcategory?.title]
      .map(normalizeCatalogSearchKey);
    if (!categories.includes(category)) return false;
  }

  // AdmissionProduct has no event tags, landing links or verified audience metadata.
  if (query.tag && query.tag !== 'all') return false;
  if (query.landing && query.landing !== 'all') return false;
  if (query.excludeLanding?.length) return false;

  const price = product.priceFromRub;
  const maxPrice = query.maxPrice ?? query.priceMax;
  if (query.minPrice === 0 && maxPrice === 0) return false;
  if (query.minPrice != null && query.minPrice > 0 && (price == null || price < query.minPrice)) return false;
  if (maxPrice != null && maxPrice > 0 && (price == null || price > maxPrice)) return false;

  if (query.date && query.date !== 'all') {
    if (query.date === 'evening') return false;
    const preset = presetDateRange(query.date, now);
    if (preset && !validityCoversRange(product, preset[0], preset[1])) return false;
  }

  if (query.from || query.to) {
    const today = moscowToday(now);
    const from = query.from || today;
    const to = query.to || query.from || today;
    if (!validityCoversRange(product, from, to)) return false;
  }

  // Unknown age is treated the same as the Event catalog: it does not fail the age filter.
  return true;
}

function formatDate(value?: string | null): string | null {
  const day = isoDay(value);
  if (!day) return null;
  const date = new Date(`${day}T12:00:00.000Z`);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }).format(date);
}

function admissionDateLabel(product: FinanceAdmissionProduct): string {
  if (product.validityMode === 'OPEN_DATE') return 'Открытая дата';
  if (product.validityMode === 'VALID_DAYS_AFTER_PURCHASE' && product.validDaysAfterPurchase) {
    return `${product.validDaysAfterPurchase} ${product.validDaysAfterPurchase === 1 ? 'день' : 'дней'} после покупки`;
  }
  const from = formatDate(product.validFrom);
  const to = formatDate(product.validTo);
  if (from && to) return `${from} - ${to}`;
  if (from) return `С ${from}`;
  if (to) return `До ${to}`;
  return 'Дата посещения не указана';
}

export function toPublicAdmissionCatalogItem(
  product: FinanceAdmissionProduct,
  taxonomy: AdmissionCatalogTaxonomy,
): PublicAdmissionCatalogItemDto {
  const prices = product.offers.map((offer) => offer.priceRub).filter((price) => Number.isFinite(price));
  const priceTo = prices.length ? Math.max(...prices) : null;
  return {
    productKind: 'ADMISSION',
    id: product.id,
    slug: product.slug,
    href: `/admissions/${encodeURIComponent(product.slug)}`,
    title: product.shortTitle || product.title,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
    citySlug: product.city?.citySlug || product.city?.slug || product.venue?.citySlug || null,
    city: product.city?.cityTitle || product.city?.title || product.venue?.cityTitle || '',
    venueSlug: product.venue?.slug || null,
    venue: product.venue?.title || '',
    admissionType: product.type,
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,
    validityMode: product.validityMode || 'OPEN_DATE',
    validFrom: product.validFrom,
    validTo: product.validTo,
    validDaysAfterPurchase: product.validDaysAfterPurchase,
    salesStartsAt: product.salesStartsAt,
    salesEndsAt: product.salesEndsAt,
    priceFrom: product.priceFromRub,
    priceTo,
    canSell: product.canSell,
    offersCount: product.offers.length,
    dateLabel: admissionDateLabel(product),
  };
}

export function toPublicEventCatalogItem(item: PublicCatalogListItemDto): PublicUnifiedCatalogItemDto {
  const slug = item.eventPageIndexableSlug || item.eventPageSlug || item.slug || item.id;
  return {
    ...item,
    productKind: 'EVENT',
    href: `/events/${encodeURIComponent(slug)}`,
  };
}

export function unifiedCatalogItemKey(item: PublicUnifiedCatalogItemDto): string {
  return item.productKind === 'ADMISSION'
    ? `admission:${item.id}`
    : `event:${item.id}:${item.startsAt}`;
}

export function planUnifiedEventWindow(input: {
  offset: number;
  limit: number;
  admissionCount: number;
  eventTotal: number;
}): { eventStart: number; eventCount: number; pageOffset: number } {
  const offset = Math.max(0, Math.floor(input.offset));
  const limit = Math.max(1, Math.floor(input.limit));
  const admissionCount = Math.max(0, Math.floor(input.admissionCount));
  const eventTotal = Math.max(0, Math.floor(input.eventTotal));
  const eventStart = Math.min(Math.max(0, offset - admissionCount), eventTotal);
  return {
    eventStart,
    eventCount: Math.min(eventTotal - eventStart, Math.max(0, offset - eventStart) + limit),
    pageOffset: Math.max(0, offset - eventStart),
  };
}

export function sortUnifiedCatalogItems(
  items: PublicUnifiedCatalogItemDto[],
  sort: string | undefined,
): PublicUnifiedCatalogItemDto[] {
  const rank = new Map(items.map((item, index) => [unifiedCatalogItemKey(item), index]));
  const mode = sort || 'time';
  return [...items].sort((left, right) => {
    if (mode === 'price' || mode === 'price_asc' || mode === 'price_desc') {
      const direction = mode === 'price_desc' ? -1 : 1;
      const leftPrice = left.productKind === 'ADMISSION' ? left.priceFrom ?? Number.POSITIVE_INFINITY : left.priceFrom ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.productKind === 'ADMISSION' ? right.priceFrom ?? Number.POSITIVE_INFINITY : right.priceFrom ?? Number.POSITIVE_INFINITY;
      if (leftPrice !== rightPrice) return (leftPrice - rightPrice) * direction;
    } else if (mode === 'time') {
      const dateKey = (item: PublicUnifiedCatalogItemDto): number => {
        if (item.productKind === 'EVENT') {
          if (String(item.kind || '').toUpperCase() === 'OPEN_DATE') return Number.POSITIVE_INFINITY;
          const value = new Date(item.startsAt).getTime();
          return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
        }
        if (item.validityMode !== 'FIXED_WINDOW') return Number.POSITIVE_INFINITY;
        const value = item.validFrom ? new Date(item.validFrom).getTime() : Number.POSITIVE_INFINITY;
        return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
      };
      const delta = dateKey(left) - dateKey(right);
      if (delta !== 0) return delta;
    } else if (left.productKind !== right.productKind) {
      // AdmissionProduct has no popularity signal. Keep Event ranking from the API first.
      return left.productKind === 'EVENT' ? -1 : 1;
    }
    return (rank.get(unifiedCatalogItemKey(left)) ?? 0) - (rank.get(unifiedCatalogItemKey(right)) ?? 0);
  });
}
