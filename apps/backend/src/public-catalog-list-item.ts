import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

const LIST_SLOT_PREVIEW_LIMIT = 3;

/** Lean catalog card DTO: no widget URLs, no full upcomingSlots payload. */
export function toPublicCatalogListItem(session: PublicSessionDto): PublicCatalogListItemDto {
  const item: PublicCatalogListItemDto = {
    id: session.id,
    title: session.title,
    city: session.city,
    destination: session.destination,
    destinationType: session.destinationType,
    venue: session.venue,
    venueKind: session.venueKind,
    category: session.category,
    tags: (session.tags || []).slice(0, 4),
    startsAt: session.startsAt,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    timeBucket: session.timeBucket,
    upcomingSlots: (session.upcomingSlots || []).slice(0, LIST_SLOT_PREVIEW_LIMIT).map((slot) => ({
      startsAt: slot.startsAt,
      dateLabel: slot.dateLabel,
      timeLabel: slot.timeLabel,
    })),
  };

  if (session.slug != null) item.slug = session.slug;
  if (session.groupKey != null) item.groupKey = session.groupKey;
  if (session.groupedEventsCount != null) item.groupedEventsCount = session.groupedEventsCount;
  if (session.sessionCount != null) item.sessionCount = session.sessionCount;
  if (session.citySlug != null) item.citySlug = session.citySlug;
  if (session.venueSlug != null) item.venueSlug = session.venueSlug;
  if (session.subcategories?.length) item.subcategories = session.subcategories.slice(0, 4);
  if (session.kind != null) item.kind = session.kind;
  if (session.sourceStatus != null) item.sourceStatus = session.sourceStatus;
  if (session.ageLimit != null) item.ageLimit = session.ageLimit;
  if (session.priceFrom != null) item.priceFrom = session.priceFrom;
  if (session.priceTo != null) item.priceTo = session.priceTo;
  if (session.vacant != null) item.vacant = session.vacant;
  if (session.imageUrl != null) item.imageUrl = session.imageUrl;
  if (session.purchaseReady != null) item.purchaseReady = session.purchaseReady;
  if (session.purchaseMode != null) item.purchaseMode = session.purchaseMode;
  if (session.purchaseProvider != null) item.purchaseProvider = session.purchaseProvider;

  return item;
}
