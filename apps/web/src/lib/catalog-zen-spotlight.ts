import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

import { isCatalogExcludedMuseumAdmission } from '@/lib/catalog-exclusions';
import { resolveEventCardFallbackImage, resolveEventCardPrimaryImage } from '@/lib/event-card-image';
import { formatPublicTitle } from '@/lib/format-public-title';

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

function pickZenItems(
  items: PublicCatalogListItemDto[],
  opts: { diversifyPrice: boolean },
): PublicCatalogListItemDto[] {
  const selected: PublicCatalogListItemDto[] = [];
  const seenTitles = new Set<string>();
  const seenVenues = new Set<string>();
  const seenPrices = new Set<string>();

  for (const item of items) {
    if (isCatalogExcludedMuseumAdmission(item)) continue;
    const image = resolveEventCardPrimaryImage(item) || resolveEventCardFallbackImage(item);
    const titleKey = formatPublicTitle(item.title).trim().toLocaleLowerCase('ru-RU');
    const venueKey = zenVenueDedupeKey(item);
    const priceKey = zenPriceKey(item);
    if (!image || !titleKey || seenTitles.has(titleKey) || seenVenues.has(venueKey)) continue;
    if (opts.diversifyPrice && priceKey && seenPrices.has(priceKey)) continue;
    seenTitles.add(titleKey);
    seenVenues.add(venueKey);
    if (priceKey) seenPrices.add(priceKey);
    selected.push(item);
    if (selected.length === 10) break;
  }

  return selected;
}

/**
 * «Стоит увидеть» on /events: unique title+venue, prefer unique priceFrom
 * so the rail does not look like every card is «от 1 350 ₽».
 */
export function pickCatalogZenSpotlightItems(items: PublicCatalogListItemDto[]): PublicCatalogListItemDto[] {
  const diversified = pickZenItems(items, { diversifyPrice: true });
  const selected = diversified.length >= 4 ? diversified : pickZenItems(items, { diversifyPrice: false });
  return selected.length >= 4 ? selected : [];
}
