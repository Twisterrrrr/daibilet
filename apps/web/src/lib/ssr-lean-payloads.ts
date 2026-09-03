import type {
  PublicCatalogDto,
  PublicCatalogListItemDto,
  PublicDestinationDto,
  PublicLandingDto,
  PublicSessionDto,
} from '@daibilet/contracts/public';

/** Nearest slots on home rails - enough for «сегодня/завтра» tabs. */
const HOME_SLOT_LIMIT = 3;
/** Catalog SSR: keep CTA purchase URLs, drop blurb (grid cards ignore it). */
const CATALOG_SLOT_LIMIT = 4;

type CatalogCardSession = PublicSessionDto | PublicCatalogListItemDto;

/**
 * Trim catalog/home card sessions before they enter client islands.
 * Drops description + deeplink noise; caps slots/tags. Keeps groupKey/sessionCount
 * for home rail scoring and purchase URLs for card CTA.
 */
export function toHomeSsrSession(session: CatalogCardSession): PublicCatalogListItemDto {
  const tags = (session.tags || []).slice(0, 4);
  const upcomingSlots = (session.upcomingSlots || []).slice(0, HOME_SLOT_LIMIT).map((slot) => ({
    startsAt: slot.startsAt,
    dateLabel: slot.dateLabel,
    timeLabel: slot.timeLabel,
    ...(slot.vacant != null ? { vacant: slot.vacant } : {}),
  }));

  const item: PublicCatalogListItemDto = {
    id: session.id,
    title: session.title,
    city: session.city,
    destination: session.destination,
    destinationType: session.destinationType,
    venue: session.venue,
    venueKind: session.venueKind,
    category: session.category,
    tags,
    startsAt: session.startsAt,
    dateLabel: session.dateLabel,
    timeLabel: session.timeLabel,
    timeBucket: session.timeBucket,
    upcomingSlots,
  };

  if (session.slug != null) item.slug = session.slug;
  if (session.groupKey != null) item.groupKey = session.groupKey;
  if (session.groupedEventsCount != null) item.groupedEventsCount = session.groupedEventsCount;
  if (session.sessionCount != null) item.sessionCount = session.sessionCount;
  if (session.citySlug != null) item.citySlug = session.citySlug;
  if (session.venueSlug != null) item.venueSlug = session.venueSlug;
  if (session.venueAddress != null) item.venueAddress = session.venueAddress;
  if (session.subcategories?.length) item.subcategories = session.subcategories.slice(0, 3);
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
  if ('manualLandingStatus' in session && session.manualLandingStatus != null) {
    (item as PublicCatalogListItemDto & { manualLandingStatus?: string | null }).manualLandingStatus =
      session.manualLandingStatus;
  }
  if ('landingSlugs' in session && session.landingSlugs?.length) {
    (item as PublicCatalogListItemDto & { landingSlugs?: string[] }).landingSlugs =
      session.landingSlugs.slice(0, 6);
  }

  return item;
}

/** Catalog page SSR: drop description (grid cards unused; list view refills on filter fetch). */
export function toCatalogSsrItem(session: PublicCatalogListItemDto): PublicCatalogListItemDto {
  const upcomingSlots = (session.upcomingSlots || []).slice(0, CATALOG_SLOT_LIMIT).map((slot) => ({
    ...(slot.id ? { id: slot.id } : {}),
    ...(slot.eventId ? { eventId: slot.eventId } : {}),
    startsAt: slot.startsAt,
    dateLabel: slot.dateLabel,
    timeLabel: slot.timeLabel,
    ...(slot.vacant != null ? { vacant: slot.vacant } : {}),
    ...(slot.purchaseUrl ? { purchaseUrl: slot.purchaseUrl } : {}),
  }));

  const { description: _drop, deeplinkUrl: _deeplink, ...rest } = session;
  return {
    ...rest,
    tags: (session.tags || []).slice(0, 4),
    subcategories: session.subcategories?.slice(0, 4),
    upcomingSlots,
  };
}

export function leanCatalogForSsr(catalog: PublicCatalogDto): PublicCatalogDto {
  return {
    ...catalog,
    items: (catalog.items || []).map(toCatalogSsrItem),
    sessions: catalog.sessions?.map(toCatalogSsrItem),
    facets: {
      ...catalog.facets,
      // Facets stay - filters need them; landings titles alone are small vs session blurbs.
      cities: (catalog.facets?.cities || []).slice(0, 80),
      landings: (catalog.facets?.landings || []).slice(0, 40),
      tags: catalog.facets?.tags?.slice(0, 40),
    },
  };
}

/** City rail / lucky button: drop per-city category facet trees. */
export function toSlimCityDestination(city: PublicDestinationDto): PublicDestinationDto {
  return {
    name: city.name,
    type: city.type,
    events: city.events,
    venues: city.venues,
    categories: [],
    ...(city.id != null ? { id: city.id } : {}),
    ...(city.slug != null ? { slug: city.slug } : {}),
    ...(city.sourceSlug != null ? { sourceSlug: city.sourceSlug } : {}),
  };
}

/** Hero chips / promo rail - no SEO/hero CMS fields. */
export function toSlimLandingPromo(
  landing: PublicLandingDto,
): Pick<PublicLandingDto, 'slug' | 'title' | 'subtitle' | 'events' | 'priceFrom' | 'type'> {
  return {
    slug: landing.slug,
    title: landing.title,
    subtitle: landing.subtitle,
    events: landing.events,
    ...(landing.priceFrom != null ? { priceFrom: landing.priceFrom } : {}),
    ...(landing.type != null ? { type: landing.type } : {}),
  };
}

export function toSlimLandingHeroChip(
  landing: PublicLandingDto,
): Pick<PublicLandingDto, 'slug' | 'title' | 'events' | 'priceFrom'> {
  return {
    slug: landing.slug,
    title: landing.title,
    events: landing.events,
    ...(landing.priceFrom != null ? { priceFrom: landing.priceFrom } : {}),
  };
}

/** Keep fingerprint map only for URLs still present on lean sessions. */
export function filterFingerprintsForSessions(
  fingerprints: Record<string, string>,
  sessions: Array<{ imageUrl?: string | null }>,
): Record<string, string> {
  if (!fingerprints || !Object.keys(fingerprints).length) return {};
  const needed = new Set(
    sessions.map((s) => String(s.imageUrl || '').trim()).filter(Boolean),
  );
  const out: Record<string, string> = {};
  for (const url of needed) {
    if (fingerprints[url]) out[url] = fingerprints[url];
  }
  return out;
}
