import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

import { isCatalogExcludedMuseumAdmission } from '@/lib/catalog-exclusions';
import { resolveEventCardFallbackImage, resolveEventCardPrimaryImage } from '@/lib/event-card-image';
import { formatPublicTitle } from '@/lib/format-public-title';

const ZEN_SPOTLIGHT_LIMIT = 10;
const ZEN_SPOTLIGHT_MIN = 3;
/** After unique-price pass, allow at most this many cards with the same priceFrom. */
const ZEN_MAX_SAME_PRICE = 2;

/** One card per venue so the rail does not flood with same-venue twins (same price/address). */
export function zenVenueDedupeKey(item: PublicCatalogListItemDto): string {
  const venueSlug = String(item.venueSlug || '').trim().toLowerCase();
  if (venueSlug) return `slug:${venueSlug}`;
  const venue = String(item.venue || '').trim().toLocaleLowerCase('ru-RU');
  if (venue) return `venue:${venue}`;
  return `id:${item.id}`;
}

function zenPriceKey(item: PublicCatalogListItemDto): string | null {
  const price = item.priceFrom;
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 100) return null;
  return String(Math.round(price));
}

function zenTitleKey(item: PublicCatalogListItemDto): string {
  return formatPublicTitle(item.title).trim().toLocaleLowerCase('ru-RU');
}

function canPickZenItem(
  item: PublicCatalogListItemDto,
  seenTitles: Set<string>,
  seenVenues: Set<string>,
): { titleKey: string; venueKey: string } | null {
  if (isCatalogExcludedMuseumAdmission(item)) return null;
  const image = resolveEventCardPrimaryImage(item) || resolveEventCardFallbackImage(item);
  const titleKey = zenTitleKey(item);
  const venueKey = zenVenueDedupeKey(item);
  if (!image || !titleKey || seenTitles.has(titleKey) || seenVenues.has(venueKey)) return null;
  return { titleKey, venueKey };
}

/** Round-robin across price buckets so a quest flood at 1350 does not starve other prices. */
export function orderZenSpotlightCandidates(items: PublicCatalogListItemDto[]): PublicCatalogListItemDto[] {
  const buckets = new Map<string, PublicCatalogListItemDto[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = zenPriceKey(item) || `id:${item.id}`;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  }
  const queues = order.map((key) => buckets.get(key)!);
  const out: PublicCatalogListItemDto[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      out.push(next);
      progressed = true;
    }
  }
  return out;
}

/**
 * «Стоит увидеть» on /events: unique title+venue, prefer unique priceFrom.
 * Candidates are price-round-robined first; pass 2 caps same priceFrom.
 */
export function pickCatalogZenSpotlightItems(items: PublicCatalogListItemDto[]): PublicCatalogListItemDto[] {
  const selected: PublicCatalogListItemDto[] = [];
  const seenTitles = new Set<string>();
  const seenVenues = new Set<string>();
  const priceCounts = new Map<string, number>();
  const ordered = orderZenSpotlightCandidates(items);

  const tryPush = (item: PublicCatalogListItemDto, maxSamePrice: number): boolean => {
    if (selected.length >= ZEN_SPOTLIGHT_LIMIT) return false;
    const keys = canPickZenItem(item, seenTitles, seenVenues);
    if (!keys) return false;
    const priceKey = zenPriceKey(item);
    if (priceKey && (priceCounts.get(priceKey) || 0) >= maxSamePrice) return false;
    seenTitles.add(keys.titleKey);
    seenVenues.add(keys.venueKey);
    if (priceKey) priceCounts.set(priceKey, (priceCounts.get(priceKey) || 0) + 1);
    selected.push(item);
    return true;
  };

  for (const item of ordered) tryPush(item, 1);
  if (selected.length < ZEN_SPOTLIGHT_LIMIT) {
    for (const item of ordered) tryPush(item, ZEN_MAX_SAME_PRICE);
  }

  return selected.length >= ZEN_SPOTLIGHT_MIN ? selected : [];
}
