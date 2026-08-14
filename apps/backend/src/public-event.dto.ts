import type { Prisma } from '@daibilet/db';
import { prisma } from '@daibilet/db';
import { join } from '@daibilet/db/sql';
import {
  hasUpcomingOrOpenSchedule,
  isOpenDateCatalogRow,
  isPublicSessionRowOnSale,
  isSaleableEventForPublic,
  isWideLifetimeSession,
} from './catalog-availability.js';
import { resolveCityTimeZone } from './city-timezone.js';
import { formatDate, formatTime, normalizeStartsAt, timeBucket } from './public-datetime.js';
import { dedupePublicOffers, preferNamedTicketOffers } from './public-offers.js';
import { findLandingRule, matchingLandingSlugs } from './landing-rules.js';
import {
  buildProviderWidgetPayload,
  buildProviderWidgetUrl,
  providerForSource,
  purchaseInfo,
  resolveSessionPurchaseExternalId,
} from './provider-purchase.js';
import type { PurchaseProvider } from './types/common.js';
import { resolveEditorialEventImage } from './event-cover-images.js';
import { pickFirstUsableEventImageUrl } from './event-image-url.js';
import {
  pickPrimarySessionPurchase,
  shouldSynthesizeWidgetOnlySession,
} from './public-event-widget-fallback.js';
import { pickCatalogSubcategories } from './public-catalog.mapper.js';
import { formatPublicEventTitle } from './event-title-normalize.ts';
import type {
  PublicEventDto,
  PublicEventPageDto,
  PublicOfferDto,
  PublicPurchaseOptionDto,
  PublicSessionDto,
  PublicTicketPriceDto,
} from './types/public.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_EVENT_CACHE_MS = 5 * 60 * 1000;
/** DB fetch budget before STAND_BY/closed filter (meta products have many dated TC children). */
const PUBLIC_EVENT_SESSION_FETCH_LIMIT = 64;
/** Max on-sale sessions on the public event page (was hard-capped at 5). */
const PUBLIC_EVENT_SESSION_DISPLAY_LIMIT = 32;

const eventInclude = {
  primaryCity: { include: { region: true } },
  venue: true,
  category: true,
  primarySubcategory: true,
  subcategories: { include: { subcategory: true } },
  tags: { include: { tag: true } },
  override: true,
  providerLinks: {
    where: { entityKind: 'EVENT' },
    include: { source: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  },
  sourceLinks: {
    include: { source: true },
    orderBy: { updatedAt: 'desc' },
  },
} as const satisfies Prisma.EventInclude;

const sessionInclude = {
  providerLinks: {
    where: { entityKind: 'SESSION' },
    include: { source: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  },
} as const satisfies Prisma.EventSessionInclude;

const offerInclude = {
  providerLinks: {
    where: { entityKind: 'OFFER' },
    include: { source: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  },
} as const satisfies Prisma.EventOfferInclude;

type EventRecord = Prisma.EventGetPayload<{ include: typeof eventInclude }>;
type SessionRecord = Prisma.EventSessionGetPayload<{ include: typeof sessionInclude }>;
type OfferRecord = Prisma.EventOfferGetPayload<{ include: typeof offerInclude }>;

interface CachedEventPage {
  expiresAt: number;
  payload: PublicEventPageDto | null;
}

interface EventIdentity {
  sourceCode: string | null;
  sourceName: string | null;
  externalId: string | null;
  sourceUrl: string | null;
}

interface MappedOffer extends PublicOfferDto {
  eventId: string;
  sortOrder: number | null;
  sourceTicketId: string | null;
  payload: Prisma.JsonValue | null;
}

type PublicEventSession = PublicEventPageDto['sessions'][number];

const eventCache = new Map<string, CachedEventPage>();
const eventBuilds = new Map<string, Promise<PublicEventPageDto | null>>();

export function clearPublicEventDtoCache(): void {
  eventCache.clear();
  eventBuilds.clear();
}

export async function buildPublicEventDto(
  eventSlugOrId: string,
  forceRefresh = false,
): Promise<PublicEventPageDto | null> {
  const key = publicSlug(eventSlugOrId) || eventSlugOrId;
  const now = Date.now();
  const cached = eventCache.get(key);
  if (!forceRefresh && cached && cached.expiresAt > now) return cached.payload;
  const activeBuild = eventBuilds.get(key);
  if (!forceRefresh && activeBuild) return activeBuild;

  if (forceRefresh) eventCache.delete(key);
  const build = loadPublicEventDto(eventSlugOrId).then((payload) => {
    eventCache.set(key, { expiresAt: Date.now() + PUBLIC_EVENT_CACHE_MS, payload });
    return payload;
  });
  eventBuilds.set(key, build);
  try {
    return await build;
  } finally {
    if (eventBuilds.get(key) === build) eventBuilds.delete(key);
  }
}

async function loadPublicEventDto(eventSlugOrId: string, allowSoftRedirect = true): Promise<PublicEventPageDto | null> {
  // PERF.E5: resolve by slug/id via Prisma - do NOT load full public catalog (~2600 rows).
  const requestedSlug = publicSlug(eventSlugOrId);
  const requestedEvent = await resolveEvent(eventSlugOrId);
  if (!requestedEvent) return null;
  const mergeGroupMembers = await loadMergeGroupMembers(requestedEvent);
  const metaGroupMembers = await loadMetaGroupMembers(requestedEvent);
  const eventsById = new Map<string, EventRecord>([[requestedEvent.id, requestedEvent]]);
  for (const member of mergeGroupMembers) eventsById.set(member.id, member);
  for (const member of metaGroupMembers) eventsById.set(member.id, member);
  const mergedGroupEvents = [...eventsById.values()];
  const groupEventIds = [...eventsById.keys()];
  const purchaseProvider = pickGroupPurchaseProvider(undefined, mergedGroupEvents, requestedEvent);
  const purchaseGroupEventIds = filterGroupEventIdsByPurchaseProvider(
    groupEventIds,
    eventsById,
    purchaseProvider,
    requestedEvent.id,
  );
  const offerScopeEventIds = [...new Set([
    ...purchaseGroupEventIds,
    ...mergeGroupMembers.map((member) => member.id),
    ...metaGroupMembers.map((member) => member.id),
  ])];
  const representative = eventsById.get(purchaseGroupEventIds[0] || '') || requestedEvent;
  // Tariff/offer rows must come from the page event (and merge peers), not from
  // hundreds of dated TC siblings. Ordering the whole meta-group by price ASC +
  // take 32 keeps only the cheapest child tariffs and drops adult/other categories.
  const tariffOfferEventIds = [...new Set([
    requestedEvent.id,
    representative.id,
    ...mergeGroupMembers.map((member) => member.id),
  ])];

  const now = new Date();
  // Prefer live sibling when the opened slug itself is STAND_BY/closed (meta TC children).
  if (
    allowSoftRedirect &&
    !isPublicSessionRowOnSale({ sourceStatus: requestedEvent.sourceStatus })
  ) {
    const nearestSibling =
      (await findNearestSaleableSiblingSlug(requestedEvent, metaGroupMembers, mergeGroupMembers)) ||
      (await findSaleableTitleTwinSlug(requestedEvent));
    if (nearestSibling && publicSlug(nearestSibling) !== requestedSlug) {
      return loadPublicEventDto(nearestSibling, false);
    }
  }
  const [sessionRows, offerRows] = await Promise.all([
    prisma.eventSession.findMany({
      where: {
        eventId: { in: offerScopeEventIds },
        isActive: true,
        cancelledAt: null,
        OR: [
          { endsAt: { gte: now } },
          { startsAt: { gte: now } },
        ],
      },
      include: sessionInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: PUBLIC_EVENT_SESSION_FETCH_LIMIT,
    }).then((rows) =>
      rows.filter((session) => {
        if (!isPublicSessionRowOnSale(session)) return false;
        const event = eventsById.get(session.eventId) || requestedEvent;
        if (!isPublicSessionRowOnSale({ sourceStatus: event.sourceStatus })) return false;
        return hasUpcomingOrOpenSchedule({
          kind: event.kind,
          sourceStatus: session.sourceStatus,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
        });
      }).slice(0, PUBLIC_EVENT_SESSION_DISPLAY_LIMIT),
    ),
    prisma.eventOffer.findMany({
      where: {
        eventId: { in: tariffOfferEventIds },
        active: true,
        priceRub: { gte: MIN_DISPLAY_PRICE_RUB },
      },
      include: offerInclude,
      orderBy: [{ priceRub: 'asc' }, { id: 'asc' }],
      take: 64,
    }),
  ]);

  const offers = preferNamedTicketOffers(
    dedupePublicOffers(offerRows.map(mapOfferRecord)),
  ).slice(0, 32) as MappedOffer[];
  const primaryOffers = primaryOfferMap(offers);
  const representativeOffer = primaryOffers.get(representative.id) || offers[0] || null;
  const requestedIdentity = eventIdentity(requestedEvent);
  const representativeIdentity = eventIdentity(representative);
  const eventSourceCode = requestedIdentity.sourceCode || representativeOffer?.sourceCode || null;
  const representativeSourceCode = representativeIdentity.sourceCode || representativeOffer?.sourceCode || eventSourceCode;
  const eventPurchase = purchaseInfo({
    sourceCode: representativeSourceCode,
    offerSourceCode: representativeOffer?.sourceCode,
    offerWidgetUrl: representativeOffer?.widgetUrl,
    offerDeeplinkUrl: representativeOffer?.deeplinkUrl,
    externalId: representativeIdentity.externalId || requestedIdentity.externalId,
  });
  const eventPurchaseUrl = eventPurchase.url || buildProviderWidgetUrl({
    sourceCode: representativeSourceCode,
    externalId: representativeIdentity.externalId || requestedIdentity.externalId,
  });

  const publicSessions = sessionRows.map((session) => mapSession(
    session,
    eventsById.get(session.eventId) || requestedEvent,
    primaryOffers.get(session.eventId) || representativeOffer,
    eventPurchaseUrl,
    requestedEvent,
  ));
  const widgetOnlySessions = buildWidgetOnlySessions(
    publicSessions,
    requestedEvent,
    eventSourceCode,
    eventPurchase,
    eventPurchaseUrl,
    undefined,
  );
  const sessions = dedupePublicEventSessionsByStartsAt(
    publicSessions.length ? publicSessions : widgetOnlySessions,
  );
  const primaryPurchase = pickPrimarySessionPurchase(sessions, eventPurchaseUrl, requestedIdentity.externalId);
  const tags = orderedEventTags(requestedEvent);
  const subcategories = pickCatalogSubcategories({
    category: requestedEvent.category?.title || null,
    subcategories: eventSubcategories(requestedEvent),
    tags,
    title: requestedEvent.override?.title || requestedEvent.title,
    venue: requestedEvent.venue?.title || null,
  });
  const destination = eventDestination(requestedEvent);
  const priceFrom = displayPriceFrom(
    requestedEvent.priceFromRub,
    ...sessions.map((session) => session.priceFrom),
    ...offers.map((offer) => offer.priceRub),
  );
  const title = formatPublicEventTitle(requestedEvent.override?.title || requestedEvent.title);
  const landingSlugs = matchingLandingSlugs({
    title,
    category: requestedEvent.category?.title || null,
    sourceCategory: requestedEvent.category?.title || null,
    tags,
    subcategories,
    venue: requestedEvent.venue?.title || null,
    city: requestedEvent.primaryCity?.title || null,
    destination: destination.name,
    startsAt: sessions[0]?.startsAt || null,
    upcomingSlots: sessions,
  });
  const event: PublicEventDto = {
    id: representative.id,
    slug: publicSlug(representative.slug),
    sourceSlug: representative.slug,
    sourceCode: eventSourceCode,
    externalId: primaryPurchase.externalId,
    widgetProvider: providerForSource(eventSourceCode),
    widgetPayload: buildProviderWidgetPayload({
      sourceCode: eventSourceCode,
      externalId: primaryPurchase.externalId,
    }),
    title,
    description: cleanImportedDescription(requestedEvent.override?.description || requestedEvent.description),
    imageUrl:
      resolveEditorialEventImage(requestedEvent.id, requestedEvent.slug, null) ||
      pickFirstUsableEventImageUrl(
        requestedEvent.override?.imageUrl,
        requestedEvent.imageUrl,
        requestedEvent.venue?.heroImageUrl,
        requestedEvent.primaryCity?.heroImageUrl,
      ),
    category: requestedEvent.category?.title || 'События',
    tags,
    subcategories,
    city: requestedEvent.primaryCity?.title || 'Не указан',
    cityId: requestedEvent.primaryCity?.id || null,
    citySlug: destination.slug,
    sourceCitySlug: requestedEvent.primaryCity?.slug || null,
    destination: destination.name,
    destinationType: destination.type,
    timeZone: resolveCityTimeZone(requestedEvent.primaryCity?.title, destination.name),
    venueId: requestedEvent.venue?.id || null,
    venueSlug: requestedEvent.venue?.slug || null,
    venue: requestedEvent.venue?.title || 'Не указано',
    venueAddress: requestedEvent.venue?.address || null,
    venueKind: requestedEvent.venue?.kind || 'OTHER',
    venueLatitude:
      requestedEvent.venue?.latitude == null || !Number.isFinite(requestedEvent.venue.latitude)
        ? null
        : Number(requestedEvent.venue.latitude),
    venueLongitude:
      requestedEvent.venue?.longitude == null || !Number.isFinite(requestedEvent.venue.longitude)
        ? null
        : Number(requestedEvent.venue.longitude),
    venueMetroStation: (() => {
      const text = String(requestedEvent.venue?.metroStation ?? '').trim();
      return text || null;
    })(),
    venueWayToFind: (() => {
      const text = String(requestedEvent.venue?.wayToFind ?? '').trim();
      return text || null;
    })(),
    venueParkingInfo: (() => {
      const text = String(requestedEvent.venue?.parkingInfo ?? '').trim();
      return text || null;
    })(),
    ageLimit: requestedEvent.ageLimit,
    priceFrom,
    vacant: requestedEvent.ticketsVacant,
    eventType: requestedEvent.kind.toLowerCase(),
    landingSlugs,
    groupKey: eventGroupKey(requestedEvent, requestedIdentity),
    groupEventIds: [...new Set([
      ...groupEventIds,
      ...metaGroupMembers.map((member) => member.id),
    ])],
    sessionCount: sessions.length,
    purchaseUrl: primaryPurchase.purchaseUrl,
    widgetUrl: representativeOffer?.widgetUrl || primaryPurchase.purchaseUrl,
    deeplinkUrl: representativeOffer?.deeplinkUrl || null,
    purchaseReady: eventPurchase.ready || Boolean(primaryPurchase.purchaseUrl),
    purchaseMode: eventPurchase.mode,
    purchaseProvider: eventPurchase.provider,
    purchaseUrlSource: primaryPurchase.urlSource || eventPurchase.urlSource,
    seoH1: requestedEvent.override?.seoH1 || requestedEvent.seoH1 || title,
    seoTitle: requestedEvent.override?.seoTitle || requestedEvent.seoTitle || (() => {
      const nearest = sessions[0];
      const dateBit = [nearest?.dateLabel, nearest?.timeLabel].filter(Boolean).join(', ');
      const core = dateBit && !String(title).includes(String(nearest?.dateLabel || ''))
        ? `${title} (${dateBit})`
        : title;
      return `${core}: билеты и расписание | Дайбилет`;
    })(),
    seoDescription: cleanImportedDescription(requestedEvent.override?.seoDescription || requestedEvent.seoDescription) ||
      `Расписание, цены и билеты на ${title}. Покупка через виджет билетной системы.`,
    canonicalPath: requestedEvent.override?.canonicalPath || requestedEvent.canonicalPath || `/events/${publicSlug(representative.slug)}`,
    isIndexable: requestedEvent.override?.isIndexable ?? requestedEvent.isIndexable,
  };
  const ticketPrices = buildTicketPrices(offers, sessions, event);
  const purchaseOptions = await buildMergedPurchaseOptions(mergedGroupEvents, offers, requestedEvent, eventPurchaseUrl);
  const related = await loadRelatedSessionsFromDb(requestedEvent, groupEventIds, 12);
  const priceValues = [event.priceFrom, ...sessions.map((session) => session.priceFrom)]
    .filter((value): value is number => Number.isFinite(value) && Number(value) >= MIN_DISPLAY_PRICE_RUB);
  const vacantValues = sessions.map((session) => session.vacant)
    .filter((value): value is number => Number.isFinite(value));

  const scheduleSource = sessionRows[0] || sessions[0];
  const scheduleSourceStatus = scheduleSource && 'sourceStatus' in scheduleSource
    ? scheduleSource.sourceStatus
    : requestedEvent.sourceStatus;
  if (!isSaleableEventForPublic({
    kind: requestedEvent.kind,
    sourceStatus: scheduleSourceStatus,
    startsAt: scheduleSource && 'startsAt' in scheduleSource ? scheduleSource.startsAt : null,
    endsAt: sessionRows[0]?.endsAt || sessions.find((session) => session.endsAt)?.endsAt || null,
    purchaseReady: event.purchaseReady,
    priceFrom: event.priceFrom,
  })) {
    if (allowSoftRedirect) {
      const nearestSibling =
        (await findNearestSaleableSiblingSlug(requestedEvent, metaGroupMembers, mergeGroupMembers)) ||
        (await findSaleableTitleTwinSlug(requestedEvent));
      if (nearestSibling && publicSlug(nearestSibling) !== requestedSlug) {
        return loadPublicEventDto(nearestSibling, false);
      }
    }
    return null;
  }

  return {
    generatedAt: new Date().toISOString(),
    event,
    sessions,
    offers: offers.map(({ eventId: _eventId, sortOrder: _sortOrder, sourceTicketId: _sourceTicketId, payload: _payload, ...offer }) => offer),
    ticketPrices,
    ...(purchaseOptions.length >= 2 ? { purchaseOptions } : {}),
    related,
    landings: landingSlugs.map(findLandingRule).filter(isDefined).map((rule) => ({
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips,
    })),
    stats: {
      sessions: sessions.length,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      vacant: vacantValues.length ? vacantValues.reduce((sum, value) => sum + value, 0) : null,
    },
  };
}

async function resolveEvent(eventSlugOrId: string): Promise<EventRecord | null> {
  const direct = await prisma.event.findFirst({
    where: { OR: [{ id: eventSlugOrId }, { slug: eventSlugOrId }] },
    include: eventInclude,
  });
  if (direct) return direct;

  const requestedSlug = publicSlug(eventSlugOrId);
  if (requestedSlug && requestedSlug !== eventSlugOrId) {
    const byPublicSlug = await prisma.event.findFirst({
      where: { slug: requestedSlug },
      include: eventInclude,
    });
    if (byPublicSlug) return byPublicSlug;
  }

  const tcPrefixMatch = eventSlugOrId.match(/^tc-([a-f0-9]{24})-/i);
  if (tcPrefixMatch?.[1]) {
    const tcId = tcPrefixMatch[1];
    const tcEvent = await prisma.event.findFirst({
      where: { OR: [{ id: tcId }, { id: `evt_${tcId}` }] },
      include: eventInclude,
    });
    if (tcEvent) return tcEvent;
  }

  const suffix = eventSlugOrId.match(/(?:^|-)([a-f0-9]{20,})$/i)?.[1];
  if (suffix) {
    const suffixEvent = await prisma.event.findFirst({
      where: { OR: [{ id: suffix }, { id: `evt_${suffix}` }, { slug: suffix }, { slug: `evt_${suffix}` }] },
      include: eventInclude,
    });
    if (suffixEvent) return suffixEvent;
  }

  // PERF.E5 fallback: DB slug is often Cyrillic/source while public URLs use transliterated slug.
  // Scanning only the latest 20k rows misses stale catalog rows (34k+ events on prod).
  if (requestedSlug) {
    const byCanonical = await prisma.event.findFirst({
      where: {
        OR: [
          { canonicalPath: `/events/${requestedSlug}` },
          { override: { is: { canonicalPath: `/events/${requestedSlug}` } } },
        ],
      },
      include: eventInclude,
    });
    if (byCanonical) return byCanonical;
  }

  const trailingToken = extractEventTrailingLookupToken(eventSlugOrId);
  if (trailingToken) {
    const byTepId = await prisma.event.findFirst({
      where: { id: buildTepEventIdFromTrailingToken(trailingToken) },
      include: eventInclude,
    });
    if (byTepId && publicSlug(byTepId.slug) === requestedSlug) return byTepId;

    const suffixCandidates = await prisma.event.findMany({
      where: { slug: { endsWith: `-${trailingToken}` } },
      select: { id: true, slug: true },
      take: 32,
    });
    const matched = suffixCandidates.find((candidate) => publicSlug(candidate.slug) === requestedSlug);
    if (matched) {
      return prisma.event.findUnique({ where: { id: matched.id }, include: eventInclude });
    }
  }

  const candidates = await prisma.event.findMany({
    select: { id: true, slug: true },
    orderBy: { updatedAt: 'desc' },
    take: 20000,
  });
  const match = candidates.find((candidate) => publicSlug(candidate.slug) === requestedSlug);
  return match ? prisma.event.findUnique({ where: { id: match.id }, include: eventInclude }) : null;
}

function mapSession(
  session: SessionRecord,
  event: EventRecord,
  offer: MappedOffer | null,
  eventPurchaseUrl: string | null,
  requestedEvent: EventRecord,
): PublicEventSession {
  const sessionLink = session.providerLinks[0];
  const identity = eventIdentity(event);
  const sourceCode = sessionLink?.source.code || offer?.sourceCode || identity.sourceCode;
  const externalId = resolveSessionPurchaseExternalId({
    sourceCode,
    providerSessionId: sessionLink?.externalId || session.externalId,
    providerEventId: sessionLink?.externalParentId || identity.externalId,
    fallbackEventId: identity.externalId,
  });
  const purchase = purchaseInfo({
    sourceCode,
    offerSourceCode: offer?.sourceCode,
    offerWidgetUrl: offer?.widgetUrl,
    offerDeeplinkUrl: offer?.deeplinkUrl,
    externalId,
  });
  // TC meta-group siblings often inherit the representative offer widgetUrl (same event=).
  // Rebuild from this session's externalId so each slot opens its own TicketsCloud event.
  const rebuiltPurchaseUrl = buildProviderWidgetUrl({
    sourceCode,
    offerSourceCode: offer?.sourceCode,
    externalId,
  });
  const resolvedPurchaseUrl =
    (providerForSource(sourceCode) === 'TICKETSCLOUD' && rebuiltPurchaseUrl) ||
    purchase.url ||
    eventPurchaseUrl;
  const openDate = requestedEvent.kind === 'OPEN_DATE' || session.sourceStatus?.toLowerCase() === 'open_date';
  const wideLifetime = isWideLifetimeSession(session.startsAt, session.endsAt);
  const startsAt = openDate || wideLifetime ? null : normalizeStartsAt(session.startsAt);
  // Display = local wall-clock of the event city/region (same as TC/TEP widget), not browser TZ / forced MSK.
  const destination = eventDestination(event);
  const timeZone = resolveCityTimeZone(
    event.primaryCity?.title || requestedEvent.primaryCity?.title,
    destination.name,
  );
  return {
    id: session.id,
    eventId: session.eventId,
    startsAt,
    endsAt: normalizeStartsAt(session.endsAt),
    dateLabel: openDate ? 'Открытая дата' : wideLifetime ? 'Даты в виджете' : formatDate(session.startsAt, timeZone),
    timeLabel: openDate ? 'В виджете' : wideLifetime ? 'При покупке' : formatTime(session.startsAt, timeZone),
    timeBucket: openDate || wideLifetime ? 'day' : timeBucket(session.startsAt, timeZone),
    timeZone,
    sourceStatus: session.sourceStatus,
    priceFrom: displayPriceFrom(session.priceFromRub, offer?.priceRub),
    vacant: session.ticketsVacant,
    purchaseUrl: resolvedPurchaseUrl,
    purchaseReady: purchase.ready || Boolean(resolvedPurchaseUrl),
    purchaseUrlSource: purchase.urlSource,
  };
}

function buildWidgetOnlySessions(
  sessions: PublicEventSession[],
  event: EventRecord,
  _sourceCode: string | null,
  purchase: ReturnType<typeof purchaseInfo>,
  purchaseUrl: string | null,
  _catalogSession?: PublicSessionDto,
): PublicEventSession[] {
  if (!shouldSynthesizeWidgetOnlySession({
    sessionsLength: sessions.length,
    kind: event.kind,
    sourceStatus: event.sourceStatus,
    purchaseReady: purchase.ready,
  })) {
    return [];
  }
  return [{
    id: `widget_tep_${event.id}`,
    eventId: event.id,
    startsAt: null,
    endsAt: null,
    dateLabel: 'В виджете',
    timeLabel: 'Выберите время',
    timeBucket: 'day',
    sourceStatus: 'widget',
    priceFrom: displayPriceFrom(event.priceFromRub),
    vacant: event.ticketsVacant,
    purchaseUrl,
    purchaseReady: true,
    purchaseUrlSource: purchase.urlSource,
  }];
}

function eventIdentity(event: EventRecord): EventIdentity {
  const providerLink = event.providerLinks[0];
  if (providerLink) {
    return {
      sourceCode: providerLink.source.code,
      sourceName: providerLink.source.name,
      externalId: providerLink.externalId,
      sourceUrl: providerLink.sourceUrl,
    };
  }
  const sourceLink = event.sourceLinks[0];
  return {
    sourceCode: sourceLink?.source.code || null,
    sourceName: sourceLink?.source.name || null,
    externalId: sourceLink?.externalId || null,
    sourceUrl: sourceLink?.sourceUrl || null,
  };
}

function mapOfferRecord(offer: OfferRecord): MappedOffer {
  const sourceLink = offer.providerLinks[0];
  return {
    id: offer.id,
    eventId: offer.eventId,
    sourceCode: offer.sourceCode,
    title: offer.title || 'Ticketscloud widget',
    priceRub: offer.priceRub,
    oldPriceRub: offer.oldPriceRub ?? null,
    widgetUrl: offer.widgetUrl,
    deeplinkUrl: offer.deeplinkUrl,
    active: offer.active,
    sortOrder: offerSortOrder(offer.payload),
    sourceTicketId: sourceLink?.externalId || null,
    payload: offer.payload,
  };
}

function primaryOfferMap(offers: MappedOffer[]): Map<string, MappedOffer> {
  const result = new Map<string, MappedOffer>();
  for (const offer of offers) {
    if (!result.has(offer.eventId)) result.set(offer.eventId, offer);
  }
  return result;
}

function purchaseProviderForEvent(event: EventRecord): PurchaseProvider | null {
  return providerForSource(eventIdentity(event).sourceCode);
}

function pickGroupPurchaseProvider(
  catalogSession: PublicSessionDto | undefined,
  groupEvents: EventRecord[],
  requestedEvent: EventRecord,
): PurchaseProvider | null {
  const fromCatalog = providerForSource(
    catalogSession?.purchaseProvider || catalogSession?.offerSourceCode,
  );
  if (fromCatalog) return fromCatalog;

  const requestedProvider = purchaseProviderForEvent(requestedEvent);
  if (requestedProvider) return requestedProvider;

  for (const event of groupEvents) {
    if (purchaseProviderForEvent(event) === 'TEPLOHOD') return 'TEPLOHOD';
  }
  for (const event of groupEvents) {
    if (purchaseProviderForEvent(event) === 'TICKETSCLOUD') return 'TICKETSCLOUD';
  }
  return null;
}

function filterGroupEventIdsByPurchaseProvider(
  groupEventIds: string[],
  eventsById: Map<string, EventRecord>,
  provider: PurchaseProvider | null,
  requestedEventId: string,
): string[] {
  if (!provider || groupEventIds.length <= 1) {
    return groupEventIds.includes(requestedEventId)
      ? groupEventIds
      : [requestedEventId, ...groupEventIds];
  }

  const filtered = groupEventIds.filter((id) => {
    const event = eventsById.get(id);
    if (!event) return id === requestedEventId;
    return purchaseProviderForEvent(event) === provider;
  });

  if (!filtered.length) return [requestedEventId];
  if (!filtered.includes(requestedEventId)) return [requestedEventId, ...filtered];
  return filtered;
}

function scorePublicEventSession(session: PublicEventSession): number {
  let score = 0;
  if (session.purchaseReady !== false) score += 40;
  if (typeof session.vacant === 'number') {
    if (session.vacant > 0) score += 20 + Math.min(session.vacant, 180);
    if (session.vacant === 0) score -= 30;
  } else {
    score += 5;
  }
  return score;
}

function dedupePublicEventSessionsByStartsAt(sessions: PublicEventSession[]): PublicEventSession[] {
  const ranked = new Map<string, PublicEventSession>();

  for (const session of sessions) {
    const key = session.startsAt || session.id;
    const current = ranked.get(key);
    if (!current || scorePublicEventSession(session) > scorePublicEventSession(current)) {
      ranked.set(key, session);
    }
  }

  return [...ranked.values()].sort((left, right) => {
    const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : Number.POSITIVE_INFINITY;
    return leftTime - rightTime || String(left.id).localeCompare(String(right.id));
  });
}

function mergedCatalogTitle(event: EventRecord): string | null {
  return cleanImportedDescription(event.override?.title);
}

function normalizeMergeGroupKey(value: string | null | undefined): string | null {
  const raw = cleanImportedDescription(value)?.trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || null;
}

async function loadMergeGroupMembers(requestedEvent: EventRecord): Promise<EventRecord[]> {
  const mergeGroupKey = normalizeMergeGroupKey(requestedEvent.override?.mergeGroupKey);
  if (!mergeGroupKey) return [];

  return prisma.event.findMany({
    where: {
      status: { notIn: ['HIDDEN', 'DRAFT'] },
      primaryCityId: requestedEvent.primaryCityId,
      override: { mergeGroupKey },
    },
    include: eventInclude,
  });
}

/** Same TicketsCloud meta product → sibling dated events with future slots. */
async function loadMetaGroupMembers(requestedEvent: EventRecord): Promise<EventRecord[]> {
  const metaIds = [...new Set(
    requestedEvent.sourceLinks
      .map((link) => link.metaExternalId)
      .filter((value): value is string => Boolean(value)),
  )];
  if (!metaIds.length) return [];

  // Critical: do NOT take an arbitrary 200 EventSourceLink rows - for large meta products
  // (600+ dated TC children) that sample often has zero upcoming sessions, so the event
  // page shows only the current slug's single slot. Prefer nearest future siblings.
  const upcomingRows = await prisma.$queryRaw<Array<{ eventId: string }>>`
    SELECT s."eventId" AS "eventId"
    FROM "EventSession" s
    INNER JOIN "EventSourceLink" sl ON sl."eventId" = s."eventId"
    INNER JOIN "Event" e ON e.id = s."eventId"
    WHERE sl."metaExternalId" IN (${join(metaIds)})
      AND e.status NOT IN ('HIDDEN', 'DRAFT')
      AND s."eventId" <> ${requestedEvent.id}
      AND (
        s."startsAt" >= NOW() - INTERVAL '15 minutes'
        OR (s."endsAt" IS NOT NULL AND s."endsAt" >= NOW())
      )
    ORDER BY s."startsAt" ASC NULLS LAST, s.id ASC
    LIMIT 48
  `;
  let eventIds = [...new Set(upcomingRows.map((row) => row.eventId))];
  if (!eventIds.length) {
    const links = await prisma.eventSourceLink.findMany({
      where: {
        metaExternalId: { in: metaIds },
        eventId: { not: requestedEvent.id },
      },
      select: { eventId: true },
      take: 48,
    });
    eventIds = [...new Set(links.map((link) => link.eventId))];
  }
  if (!eventIds.length) return [];

  return prisma.event.findMany({
    where: {
      id: { in: eventIds },
      status: { notIn: ['HIDDEN', 'DRAFT'] },
    },
    include: eventInclude,
  });
}

/**
 * Past dated / unsaleable slug → nearest meta/merge sibling that still has a future
 * on-sale session. Used as soft-404 recovery so order deep-links stay useful.
 * Skip STAND_BY / closed siblings - they would soft-404 again under allowSoftRedirect=false.
 */
async function findNearestSaleableSiblingSlug(
  requestedEvent: EventRecord,
  metaMembers: EventRecord[],
  mergeMembers: EventRecord[],
): Promise<string | null> {
  const candidates = [...metaMembers, ...mergeMembers].filter((event) => {
    if (event.id === requestedEvent.id) return false;
    return isPublicSessionRowOnSale({ sourceStatus: event.sourceStatus });
  });
  if (!candidates.length) return null;

  const now = new Date();
  const sessions = await prisma.eventSession.findMany({
    where: {
      eventId: { in: candidates.map((event) => event.id) },
      isActive: true,
      cancelledAt: null,
      OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }],
    },
    select: { eventId: true, startsAt: true, sourceStatus: true },
    orderBy: { startsAt: 'asc' },
    take: 50,
  });
  if (!sessions.length) return null;

  const byId = new Map(candidates.map((event) => [event.id, event]));
  for (const session of sessions) {
    if (!isPublicSessionRowOnSale(session)) continue;
    const event = byId.get(session.eventId);
    if (event?.slug) return event.slug;
  }
  return null;
}

/**
 * TC STAND_BY (or cancelled) product with a live Teplohod twin of the same title
 * (token-set equal, word order may differ). Same-city only.
 * Prod case: evt_6a1ef2c… STAND_BY → evt_tep_910.
 */
async function findSaleableTitleTwinSlug(requestedEvent: EventRecord): Promise<string | null> {
  const fingerprint = eventTitleTokenFingerprint(
    requestedEvent.override?.title || requestedEvent.title,
  );
  const tokens = fingerprint.split(' ').filter((token) => token.length >= 4);
  if (tokens.length < 4 || !requestedEvent.primaryCityId) return null;

  const keyTokens = [...tokens].sort((left, right) => right.length - left.length).slice(0, 5);
  const candidates = await prisma.event.findMany({
    where: {
      id: { not: requestedEvent.id },
      primaryCityId: requestedEvent.primaryCityId,
      status: { notIn: ['HIDDEN', 'DRAFT'] },
      AND: keyTokens.map((token) => ({
        title: { contains: token, mode: 'insensitive' as const },
      })),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      sourceStatus: true,
    },
    take: 48,
  });

  const twins = candidates.filter(
    (row) =>
      eventTitleTokenFingerprint(row.title) === fingerprint &&
      isPublicSessionRowOnSale({ sourceStatus: row.sourceStatus }),
  );
  if (!twins.length) return null;

  const now = new Date();
  const sessions = await prisma.eventSession.findMany({
    where: {
      eventId: { in: twins.map((twin) => twin.id) },
      isActive: true,
      cancelledAt: null,
      startsAt: { gte: now },
    },
    select: { eventId: true, startsAt: true, sourceStatus: true },
    orderBy: { startsAt: 'asc' },
    take: 30,
  });

  const byId = new Map(twins.map((twin) => [twin.id, twin]));
  for (const session of sessions) {
    if (!isPublicSessionRowOnSale(session)) continue;
    const twin = byId.get(session.eventId);
    if (twin?.slug) return twin.slug;
  }
  return null;
}

/** Order-insensitive title key so TC/TEP twins with shuffled phrases still match. */
export function eventTitleTokenFingerprint(title: string): string {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[«»""„']/g, '')
    .replace(/[^a-zа-яё0-9\s]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((token) => token.length >= 2)
    .sort()
    .join(' ');
}

function resolveMultiPurchasePeers(groupEvents: EventRecord[], requestedEvent: EventRecord): EventRecord[] {
  const mergeGroupKey = normalizeMergeGroupKey(requestedEvent.override?.mergeGroupKey);
  if (mergeGroupKey) {
    return groupEvents.filter(
      (event) =>
        normalizeMergeGroupKey(event.override?.mergeGroupKey) === mergeGroupKey &&
        event.primaryCityId === requestedEvent.primaryCityId,
    );
  }

  const mergeTitle = mergedCatalogTitle(requestedEvent);
  if (!mergeTitle) return [];

  return groupEvents.filter(
    (event) =>
      mergedCatalogTitle(event) === mergeTitle &&
      event.primaryCityId === requestedEvent.primaryCityId,
  );
}

function isMultiProductMergedGroup(peers: EventRecord[]): boolean {
  if (peers.length < 2) return false;

  const distinctTitles = new Set(
    peers.map((event) => normalizeGroupPart(formatPublicEventTitle(event.title))).filter(Boolean),
  );
  return distinctTitles.size >= 2;
}

function buildPurchaseOptionDescription(event: EventRecord): string | null {
  const title = formatPublicEventTitle(event.title);
  if (isAdultOrChildPurchaseOptionTitle(title)) return null;

  const raw = cleanImportedDescription(
    event.override?.shortDescription || event.description || event.override?.description,
  );
  if (!raw) return null;

  const lines = raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-–—•*]\s*/, '').trim())
    .filter(Boolean);
  const snippet = lines.slice(0, 3).join(' · ');
  if (!snippet) return null;
  return snippet.length > 260 ? `${snippet.slice(0, 257).trim()}…` : snippet;
}

function isAdultOrChildPurchaseOptionTitle(title: string): boolean {
  const normalized = normalizeGroupPart(title);
  if (!normalized) return false;
  return normalized.includes('взросл') || normalized.includes('детск');
}

function purchaseOptionDisplayPriority(title: string): number {
  const normalized = normalizeGroupPart(title);
  if (normalized.includes('взросл')) return 0;
  if (normalized.includes('детск')) return 1;
  return 100;
}

function purchaseOptionSortKey(title: string): number {
  const match = title.match(/(\d+)/);
  return match ? Number(match[1]) : 9999;
}

async function loadEarliestUpcomingStartsAt(eventIds: string[]): Promise<Map<string, number>> {
  if (!eventIds.length) return new Map();
  const now = new Date();
  const rows = await prisma.eventSession.findMany({
    where: {
      eventId: { in: eventIds },
      OR: [{ endsAt: { gte: now } }, { startsAt: { gte: now } }],
    },
    select: { eventId: true, startsAt: true },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    if (map.has(row.eventId) || !row.startsAt) continue;
    map.set(row.eventId, row.startsAt.getTime());
  }
  return map;
}

function pickBetterPurchaseOption(
  left: PublicPurchaseOptionDto,
  right: PublicPurchaseOptionDto,
  upcomingStartsAt: Map<string, number>,
): PublicPurchaseOptionDto {
  const leftStart = upcomingStartsAt.get(left.id);
  const rightStart = upcomingStartsAt.get(right.id);
  if (leftStart && !rightStart) return left;
  if (rightStart && !leftStart) return right;
  if (leftStart && rightStart && leftStart !== rightStart) {
    return leftStart < rightStart ? left : right;
  }

  const leftPrice = left.priceFrom ?? Number.POSITIVE_INFINITY;
  const rightPrice = right.priceFrom ?? Number.POSITIVE_INFINITY;
  if (leftPrice !== rightPrice) return leftPrice < rightPrice ? left : right;
  return left.title.localeCompare(right.title, 'ru') <= 0 ? left : right;
}

async function buildMergedPurchaseOptions(
  groupEvents: EventRecord[],
  offers: MappedOffer[],
  requestedEvent: EventRecord,
  fallbackPurchaseUrl: string | null,
): Promise<PublicPurchaseOptionDto[]> {
  const peers = resolveMultiPurchasePeers(groupEvents, requestedEvent);
  if (!isMultiProductMergedGroup(peers)) return [];

  const mergeGroupKey = normalizeMergeGroupKey(requestedEvent.override?.mergeGroupKey);
  const mergeTitle = mergedCatalogTitle(requestedEvent);
  const upcomingStartsAt = await loadEarliestUpcomingStartsAt(peers.map((event) => event.id));

  const offersByEventId = new Map<string, MappedOffer[]>();
  for (const offer of offers) {
    const bucket = offersByEventId.get(offer.eventId) || [];
    bucket.push(offer);
    offersByEventId.set(offer.eventId, bucket);
  }

  const options = peers
    .map((event) => {
      const identity = eventIdentity(event);
      const title = formatPublicEventTitle(event.title);
      const titleKey = normalizeGroupPart(title);
      if (!titleKey) return null;
      if (!mergeGroupKey && mergeTitle && titleKey === normalizeGroupPart(mergeTitle)) return null;

      const eventOffers = preferNamedTicketOffers(offersByEventId.get(event.id) || []);
      const primaryOffer = eventOffers[0] || offersByEventId.get(event.id)?.[0] || null;
      const purchase = purchaseInfo({
        sourceCode: identity.sourceCode,
        offerSourceCode: primaryOffer?.sourceCode,
        offerWidgetUrl: primaryOffer?.widgetUrl,
        offerDeeplinkUrl: primaryOffer?.deeplinkUrl,
        externalId: identity.externalId,
      });
      const priceFrom = displayPriceFrom(primaryOffer?.priceRub, event.priceFromRub);
      if (!priceFrom || !purchase.ready) return null;

      return {
        id: event.id,
        slug: publicSlug(event.slug),
        title,
        description: buildPurchaseOptionDescription(event) ?? null,
        priceFrom,
        externalId: identity.externalId,
        purchaseProvider: purchase.provider,
        purchaseUrl: purchase.url || fallbackPurchaseUrl,
        widgetUrl: primaryOffer?.widgetUrl || purchase.url || fallbackPurchaseUrl,
        deeplinkUrl: primaryOffer?.deeplinkUrl || null,
        purchaseReady: purchase.ready,
        purchaseMode: purchase.mode,
        purchaseUrlSource: purchase.urlSource,
      } as PublicPurchaseOptionDto;
    })
    .filter((option): option is PublicPurchaseOptionDto => option !== null);

  return dedupePurchaseOptionsByTitle(options, upcomingStartsAt);
}

function dedupePurchaseOptionsByTitle(
  options: PublicPurchaseOptionDto[],
  upcomingStartsAt: Map<string, number> = new Map(),
): PublicPurchaseOptionDto[] {
  const byTitle = new Map<string, PublicPurchaseOptionDto>();
  for (const option of options) {
    const key = normalizeGroupPart(option.title);
    const current = byTitle.get(key);
    if (!current) {
      byTitle.set(key, option);
      continue;
    }
    byTitle.set(key, pickBetterPurchaseOption(current, option, upcomingStartsAt));
  }

  return [...byTitle.values()].sort((left, right) =>
    purchaseOptionDisplayPriority(left.title) - purchaseOptionDisplayPriority(right.title) ||
    purchaseOptionSortKey(left.title) - purchaseOptionSortKey(right.title) ||
    (left.priceFrom ?? 0) - (right.priceFrom ?? 0) ||
    left.title.localeCompare(right.title, 'ru'),
  );
}

function buildTicketPrices(
  offers: MappedOffer[],
  sessions: PublicEventSession[],
  event: PublicEventDto,
): PublicTicketPriceDto[] {
  const rows: PublicTicketPriceDto[] = [];
  const eventTitleKey = normalizeGroupPart(event.title);
  for (const offer of preferNamedTicketOffers(offers)) {
    if (!Number.isFinite(offer.priceRub) || Number(offer.priceRub) < MIN_DISPLAY_PRICE_RUB) continue;
    const title = normalizeTicketTitle(offer.title, eventTitleKey);
    rows.push({
      key: `offer:${offer.id}:${normalizeGroupPart(title)}:${offer.priceRub}`,
      title,
      priceRub: Number(offer.priceRub),
      oldPriceRub:
        typeof offer.oldPriceRub === 'number' && offer.oldPriceRub > Number(offer.priceRub)
          ? Number(offer.oldPriceRub)
          : null,
      source: sourceLabel(offer.sourceCode),
      sourceTicketId: offer.sourceTicketId,
      description: resolveOfferTicketDescription(offer, title),
      purchaseUrl: offer.widgetUrl || offer.deeplinkUrl || event.purchaseUrl || null,
      kind: 'offer',
      sortOrder: offer.sortOrder ?? null,
    });
  }
  const offerPrices = new Set(rows.map((row) => row.priceRub));
  for (const session of sessions) {
    if (!Number.isFinite(session.priceFrom) || Number(session.priceFrom) < MIN_DISPLAY_PRICE_RUB || offerPrices.has(Number(session.priceFrom))) continue;
    rows.push({
      key: `session:${session.id || session.priceFrom}:${session.priceFrom}`,
      title: 'Билет на отдельные сеансы',
      priceRub: Number(session.priceFrom),
      source: null,
      description: null,
      purchaseUrl: session.purchaseUrl || event.purchaseUrl || null,
      kind: 'session',
      sortOrder: null,
    });
  }
  if (!rows.length && Number.isFinite(event.priceFrom) && Number(event.priceFrom) >= MIN_DISPLAY_PRICE_RUB) {
    rows.push({
      key: `fallback:${event.priceFrom}`,
      title: 'Билет',
      priceRub: Number(event.priceFrom),
      source: null,
      description: null,
      purchaseUrl: event.purchaseUrl || null,
      kind: 'fallback',
      sortOrder: null,
    });
  }
  const unique = new Map<string, PublicTicketPriceDto>();
  for (const row of rows) {
    const labelKey = normalizeGroupPart(normalizeTicketCategoryLabel(row.title));
    const mergeKey = `${labelKey}:${row.priceRub}`;
    const current = unique.get(mergeKey);
    if (!current || (row.kind === 'offer' && current.kind !== 'offer')) {
      unique.set(mergeKey, row);
    }
  }
  return [...unique.values()].sort((left, right) => {
    const leftOrder = left.sortOrder ?? 9999;
    const rightOrder = right.sortOrder ?? 9999;
    return leftOrder - rightOrder || left.priceRub - right.priceRub || left.title.localeCompare(right.title, 'ru');
  }).slice(0, 32);
}

/** PERF.E5: related cards without full catalog - same city or category, upcoming only. */
async function loadRelatedSessionsFromDb(
  event: EventRecord,
  excludeEventIds: string[],
  limit: number,
): Promise<PublicSessionDto[]> {
  const exclude = new Set(excludeEventIds);
  const now = new Date();
  const cityOrCategory: Prisma.EventWhereInput[] = [];
  if (event.primaryCityId) cityOrCategory.push({ primaryCityId: event.primaryCityId });
  if (event.categoryId) cityOrCategory.push({ categoryId: event.categoryId });
  if (!cityOrCategory.length) return [];

  const rows = await prisma.event.findMany({
    where: {
      id: { notIn: [...exclude] },
      status: { in: ['READY', 'PUBLISHED'] },
      OR: cityOrCategory,
      sessions: {
        some: {
          OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }],
        },
      },
    },
    include: {
      primaryCity: { include: { region: true } },
      venue: true,
      category: true,
      override: true,
      sessions: {
        where: {
          OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }],
        },
        orderBy: { startsAt: 'asc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit * 3,
  });

  const related: PublicSessionDto[] = [];
  for (const row of rows) {
    if (exclude.has(row.id)) continue;
    const next = row.sessions[0];
    if (!next) continue;
    const city = row.primaryCity;
    const destName =
      city?.isDestination === false && city.region
        ? city.region.title
        : city?.title || 'Не указан';
    const destSlug = city?.isDestination === false && city.region
      ? publicSlug(city.region.title)
      : city?.slug
        ? publicSlug(city.slug)
        : publicSlug(destName);
    const destType: 'city' | 'region' =
      city?.isDestination === false && city.region ? 'region' : 'city';
    const timeZone = resolveCityTimeZone(city?.title, destName);
    const startsAt = normalizeStartsAt(next.startsAt) || '';
    related.push({
      id: row.id,
      slug: publicSlug(row.slug),
      sourceSlug: row.slug,
      title: formatPublicEventTitle(row.override?.title || row.title),
      cityId: row.primaryCityId,
      citySlug: destSlug,
      sourceCitySlug: city?.slug || null,
      city: city?.title || 'Не указан',
      destination: destName,
      destinationType: destType,
      venueId: row.venueId,
      venueSlug: row.venue?.slug || null,
      venue: row.venue?.title || 'Не указано',
      venueKind: row.venue?.kind || 'OTHER',
      category: row.category?.title || 'События',
      tags: [],
      kind: row.kind.toLowerCase(),
      startsAt,
      dateLabel: formatDate(next.startsAt, timeZone),
      timeLabel: formatTime(next.startsAt, timeZone),
      timeBucket: timeBucket(next.startsAt, timeZone),
      timeZone,
      priceFrom: displayPriceFrom(row.priceFromRub, next.priceFromRub),
      vacant: next.ticketsVacant ?? row.ticketsVacant,
      imageUrl:
        resolveEditorialEventImage(row.id, row.slug, null) ||
        pickFirstUsableEventImageUrl(row.override?.imageUrl, row.imageUrl, row.venue?.heroImageUrl),
      purchaseReady: true,
    });
    if (related.length >= limit) break;
  }
  return related;
}

function eventDestination(event: EventRecord): {
  name: string;
  slug: string;
  type: 'city' | 'region';
} {
  const city = event.primaryCity;
  if (city?.isDestination === false && city.region) {
    return { name: city.region.title, slug: publicSlug(city.region.title), type: 'region' };
  }
  const name = city?.title || 'Не указан';
  return { name, slug: city?.slug ? publicSlug(city.slug) : publicSlug(name), type: 'city' };
}

function eventSubcategories(event: EventRecord): string[] {
  return [...new Set([
    event.primarySubcategory?.title,
    ...event.subcategories.map((row) => row.subcategory.title),
  ].filter((value): value is string => Boolean(value)))];
}

function orderedEventTags(event: EventRecord): string[] {
  return [...new Set(event.tags.map((row) => row.tag.title))].sort((left, right) =>
    tagPriority(left) - tagPriority(right) || left.localeCompare(right, 'ru'));
}

function tagPriority(tag: string): number {
  if (['Речные прогулки', 'Экскурсии', 'Водные экскурсии', 'Автобусные туры', 'Автобусные экскурсии', 'Смотровые площадки', 'Банкеты', 'Разводные мосты', 'Ночные'].includes(tag)) return 1;
  if (/^(Теплоход|Площадка):/i.test(tag)) return 2;
  if (/^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i.test(tag)) return 3;
  return 4;
}

function eventGroupKey(event: EventRecord, identity: EventIdentity): string {
  return [identity.sourceName || identity.sourceCode, event.title, event.primaryCity?.title, event.venueId || event.venue?.title]
    .map(normalizeGroupPart)
    .join('|');
}

function offerSortOrder(payload: Prisma.JsonValue | null): number | null {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') return null;
  const value = (payload as Record<string, unknown>).sortOrder;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function displayPriceFrom(...values: Array<number | null | undefined>): number | null {
  const prices = values.filter((value): value is number => Number.isFinite(value) && Number(value) >= MIN_DISPLAY_PRICE_RUB);
  return prices.length ? Math.min(...prices) : null;
}

function normalizeTicketTitle(value: string | null | undefined, eventTitleKey: string): string {
  const raw = cleanImportedDescription(value) || '';
  const key = normalizeGroupPart(raw);
  if (!key || key === eventTitleKey || key === 'widget' || key.includes('ticketscloud widget')) return 'Билет';
  return normalizeTicketCategoryLabel(raw);
}

function sourceLabel(sourceCode: string): string | null {
  const provider = providerForSource(sourceCode);
  if (provider === 'TICKETSCLOUD') return 'Ticketscloud';
  if (provider === 'TEPLOHOD') return 'Teplohod.info';
  return sourceCode || null;
}

function cleanImportedDescription(value?: string | null): string | null {
  const cleaned = String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return cleaned || null;
}

function normalizeGroupPart(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function splitTitlePartsWithoutWeekdays(title: string): string[] {
  const parts = title.split(',').map((part) => part.trim()).filter(Boolean);
  const weekdayToken = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)$/iu;
  const weekdayRange = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)(?:\s*[,—–\-]\s*(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС))+$/iu;

  while (parts.length > 1) {
    const last = parts.at(-1);
    if (!last) break;
    if (weekdayToken.test(last) || weekdayRange.test(last)) {
      parts.pop();
      continue;
    }
    break;
  }

  return parts;
}

function isGenericTicketDescription(value?: string | null): boolean {
  const text = cleanImportedDescription(value)?.toLowerCase() || '';
  if (!text) return true;
  if (text.includes('покупка открывается в виджете')) return true;
  if (text.includes('уточняется в виджете')) return true;
  if (text.includes('минимальная доступная цена')) return true;
  return false;
}

function isTransportBoilerplate(value?: string | null): boolean {
  const text = cleanImportedDescription(value);
  if (!text) return false;
  return /перевозка\s+пас[-.\s]?в/i.test(text) && /\bТС\s*\d+/i.test(text);
}

function normalizeTicketCategoryLabel(raw?: string | null): string {
  let text = cleanImportedDescription(raw);
  if (!text) return 'Билет';

  const dashSplit = text.split(/\s[-–—]\s/);
  if (dashSplit.length > 1) {
    const head = dashSplit[0]?.trim() || '';
    const tail = dashSplit.slice(1).join(' - ').trim();
    if (head && (!tail || isTransportBoilerplate(tail))) return head;
  }

  text = text
    .replace(/\s*[-–—]?\s*перевозка\s+пас[-.\s]?в\s+.+?\s+ТС\s*\d+\s*$/iu, '')
    .trim();

  const parts = splitTitlePartsWithoutWeekdays(text);
  if (parts.length > 1) {
    const tail = parts.slice(1).join(', ').trim();
    if (!tail || isTransportBoilerplate(tail)) return parts[0] || 'Билет';
  }

  return text || 'Билет';
}

function extractOfferPayloadDescription(payload: Prisma.JsonValue | null): string | null {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  for (const key of ['description', 'comment', 'text']) {
    const direct = cleanImportedDescription(String(record[key] || ''));
    if (direct && !isGenericTicketDescription(direct) && !isTransportBoilerplate(direct)) return direct;
  }
  const ticket = record.ticket;
  if (ticket && typeof ticket === 'object' && !Array.isArray(ticket)) {
    for (const key of ['description', 'comment', 'text']) {
      const nested = cleanImportedDescription(String((ticket as Record<string, unknown>)[key] || ''));
      if (nested && !isGenericTicketDescription(nested) && !isTransportBoilerplate(nested)) return nested;
    }
  }
  return null;
}

function parseTitleSupplement(rawTitle: string | null | undefined, normalizedTitle: string): string | null {
  const clean = cleanImportedDescription(rawTitle);
  if (!clean) return null;
  const parts = splitTitlePartsWithoutWeekdays(clean);
  if (parts.length <= 1) return null;
  const supplement = parts.slice(1).join(', ').trim();
  if (!supplement || isGenericTicketDescription(supplement) || isTransportBoilerplate(supplement)) return null;
  if (normalizeGroupPart(parts[0]) === normalizeGroupPart(normalizedTitle)) return supplement;
  if (normalizeGroupPart(clean) === normalizeGroupPart(normalizedTitle)) return supplement;
  return supplement;
}

function resolveOfferTicketDescription(offer: MappedOffer, normalizedTitle: string): string | null {
  const fromPayload = extractOfferPayloadDescription(offer.payload);
  if (fromPayload) return fromPayload;
  const fromTitle = parseTitleSupplement(offer.title, normalizedTitle);
  if (fromTitle) return fromTitle;
  return null;
}

export function publicSlug(value: string): string {
  const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '').trim().toLowerCase().split('').map((character) => letters[character] ?? character)
    .join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

export function extractEventTrailingLookupToken(eventSlugOrId: string): string | null {
  return eventSlugOrId.match(/-([a-z0-9]+)$/i)?.[1] ?? null;
}

export function buildTepEventIdFromTrailingToken(token: string): string {
  return `evt_tep_${token}`;
}

export function matchesPublicEventSlug(requestedSlug: string, dbSlug: string): boolean {
  return publicSlug(dbSlug) === publicSlug(requestedSlug);
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
