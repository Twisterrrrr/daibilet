import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

const LIST_UPCOMING_SLOT_LIMIT = 4;

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
    tags: session.tags || [],
    startsAt: session.startsAt,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    timeBucket: session.timeBucket,
    upcomingSlots: (session.upcomingSlots || []).slice(0, LIST_UPCOMING_SLOT_LIMIT).map((slot) => ({
      startsAt: slot.startsAt,
      dateLabel: slot.dateLabel,
      timeLabel: slot.timeLabel,
      ...(slot.id ? { id: slot.id } : {}),
      ...(slot.eventId ? { eventId: slot.eventId } : {}),
      ...(slot.purchaseUrl ? { purchaseUrl: slot.purchaseUrl } : {}),
      ...(slot.vacant != null ? { vacant: slot.vacant } : {}),
    })),
  };

  if (session.slug != null) item.slug = session.slug;
  if (session.groupKey != null) item.groupKey = session.groupKey;
  if (session.groupedEventsCount != null) item.groupedEventsCount = session.groupedEventsCount;
  if (session.sessionCount != null) item.sessionCount = session.sessionCount;
  if (session.citySlug != null) item.citySlug = session.citySlug;
  if (session.venueSlug != null) item.venueSlug = session.venueSlug;
  if (session.subcategories?.length) item.subcategories = session.subcategories;
  if (session.kind != null) item.kind = session.kind;
  if (session.sourceStatus != null) item.sourceStatus = session.sourceStatus;
  if (session.ageLimit != null) item.ageLimit = session.ageLimit;
  if (session.priceFrom != null) item.priceFrom = session.priceFrom;
  if (session.priceTo != null) item.priceTo = session.priceTo;
  if (session.vacant != null) item.vacant = session.vacant;
  if (session.imageUrl != null) item.imageUrl = session.imageUrl;
  if (session.purchaseUrl != null) item.purchaseUrl = session.purchaseUrl;
  if (session.widgetUrl != null) item.widgetUrl = session.widgetUrl;
  if (session.deeplinkUrl != null) item.deeplinkUrl = session.deeplinkUrl;
  if (session.purchaseReady != null) item.purchaseReady = session.purchaseReady;
  if (session.purchaseMode != null) item.purchaseMode = session.purchaseMode;
  if (session.purchaseProvider != null) item.purchaseProvider = session.purchaseProvider;
  if (session.purchaseUrlSource != null) item.purchaseUrlSource = session.purchaseUrlSource;

  return item;
}
