import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

/** Chip slots for catalog cards (2×2 after primary). Cap keeps list payloads small. */
export const LIST_SLOT_PREVIEW_LIMIT = 4;
/** Homepage /home card sessions: nearest slots without per-slot widget URLs. */
export const HOME_SLOT_PREVIEW_LIMIT = 3;

/** Lean catalog card DTO: capped slots; full plain description (owner: no mid-word ellipsis). */
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
      ...(slot.id ? { id: slot.id } : {}),
      ...(slot.eventId ? { eventId: slot.eventId } : {}),
      startsAt: slot.startsAt,
      dateLabel: slot.dateLabel,
      timeLabel: slot.timeLabel,
      ...(slot.vacant != null ? { vacant: slot.vacant } : {}),
    })),
  };

  if (session.slug != null) item.slug = session.slug;
  if (session.groupKey != null) item.groupKey = session.groupKey;
  if (session.groupedEventsCount != null) item.groupedEventsCount = session.groupedEventsCount;
  if (session.sessionCount != null) item.sessionCount = session.sessionCount;
  if (session.citySlug != null) item.citySlug = session.citySlug;
  if (session.venueSlug != null) item.venueSlug = session.venueSlug;
  if (session.venueAddress != null) item.venueAddress = session.venueAddress;
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
  if (session.purchaseUrl != null) item.purchaseUrl = session.purchaseUrl;
  if (session.widgetUrl != null) item.widgetUrl = session.widgetUrl;
  if (session.deeplinkUrl != null) item.deeplinkUrl = session.deeplinkUrl;

  const description = toListDescriptionPlain(session.description);
  if (description) item.description = description;

  return item;
}

/**
 * Compact homepage card session for GET /api/public/home.
 * Drops full description, groupEventIds, landingSlugs, debug/source fields,
 * and per-slot purchase/widget URLs (nearest CTA stays at top level).
 */
export function toPublicHomeCardSession(session: PublicSessionDto): PublicCatalogListItemDto {
  const base = toPublicCatalogListItem(session);
  return {
    id: base.id,
    title: base.title,
    city: base.city,
    destination: base.destination,
    destinationType: base.destinationType,
    venue: base.venue,
    venueKind: base.venueKind,
    category: base.category,
    tags: base.tags,
    startsAt: base.startsAt,
    dateLabel: base.dateLabel,
    timeLabel: base.timeLabel,
    timeBucket: base.timeBucket,
    upcomingSlots: (session.upcomingSlots || []).slice(0, HOME_SLOT_PREVIEW_LIMIT).map((slot) => ({
      startsAt: slot.startsAt,
      dateLabel: slot.dateLabel,
      timeLabel: slot.timeLabel,
      ...(slot.vacant != null ? { vacant: slot.vacant } : {}),
    })),
    ...(base.slug != null ? { slug: base.slug } : {}),
    ...(base.citySlug != null ? { citySlug: base.citySlug } : {}),
    ...(base.venueSlug != null ? { venueSlug: base.venueSlug } : {}),
    ...(base.venueAddress != null ? { venueAddress: base.venueAddress } : {}),
    ...(base.subcategories?.length ? { subcategories: base.subcategories } : {}),
    ...(base.priceFrom != null ? { priceFrom: base.priceFrom } : {}),
    ...(base.priceTo != null ? { priceTo: base.priceTo } : {}),
    ...(base.vacant != null ? { vacant: base.vacant } : {}),
    ...(base.imageUrl != null ? { imageUrl: base.imageUrl } : {}),
    ...(base.purchaseReady != null ? { purchaseReady: base.purchaseReady } : {}),
    ...(base.purchaseMode != null ? { purchaseMode: base.purchaseMode } : {}),
    ...(base.purchaseProvider != null ? { purchaseProvider: base.purchaseProvider } : {}),
    ...(base.purchaseUrl != null ? { purchaseUrl: base.purchaseUrl } : {}),
    ...(base.widgetUrl != null ? { widgetUrl: base.widgetUrl } : {}),
  };
}

function toListDescriptionPlain(value?: string | null): string | null {
  if (!value) return null;
  const plain = value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return plain || null;
}
