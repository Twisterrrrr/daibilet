import { Prisma, prisma } from '../../../packages/db/src/client.ts';
import {
  isOpenDateCatalogRow,
  isWideLifetimeSession,
} from './catalog-availability.js';
import { dedupePublicOffers, formatDate, formatTime, isSaleableEventForPublic, normalizeStartsAt, preferNamedTicketOffers, timeBucket } from './dto.js';
import { findLandingRule, matchingLandingSlugs } from './landing-rules.js';
import {
  buildProviderWidgetPayload,
  buildProviderWidgetUrl,
  providerForSource,
  purchaseInfo,
  resolveSessionPurchaseExternalId,
} from './provider-purchase.js';
import { getPublicCatalogSessions } from './public-catalog.dto.js';
import { pickCatalogSubcategories } from './public-catalog.mapper.js';
import type {
  PublicEventDto,
  PublicEventPageDto,
  PublicOfferDto,
  PublicSessionDto,
  PublicTicketPriceDto,
} from './types/public.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_EVENT_CACHE_MS = 5 * 60 * 1000;

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

async function loadPublicEventDto(eventSlugOrId: string): Promise<PublicEventPageDto | null> {
  const catalogSessions = await getPublicCatalogSessions();
  const requestedSlug = publicSlug(eventSlugOrId);
  const targetCatalogSession = catalogSessions.find((session) =>
    session.id === eventSlugOrId ||
    session.sourceSlug === eventSlugOrId ||
    session.slug === requestedSlug ||
    (session.groupEventIds || []).includes(eventSlugOrId)
  );

  const requestedEvent = await resolveEvent(eventSlugOrId, targetCatalogSession);
  if (!requestedEvent) return null;
  const groupEventIds = targetCatalogSession?.groupEventIds?.length
    ? targetCatalogSession.groupEventIds
    : [requestedEvent.id];
  const groupEvents = await prisma.event.findMany({
    where: { id: { in: groupEventIds } },
    include: eventInclude,
  });
  const eventsById = new Map(groupEvents.map((event) => [event.id, event]));
  if (!eventsById.has(requestedEvent.id)) eventsById.set(requestedEvent.id, requestedEvent);
  const representative = eventsById.get(targetCatalogSession?.id || '') || requestedEvent;

  const now = new Date();
  const [sessionRows, offerRows] = await Promise.all([
    prisma.eventSession.findMany({
      where: {
        eventId: { in: groupEventIds },
        OR: [
          { endsAt: { gte: now } },
          { startsAt: { gte: now } },
        ],
      },
      include: sessionInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: 5,
    }),
    prisma.eventOffer.findMany({
      where: {
        eventId: { in: groupEventIds },
        active: true,
        priceRub: { gte: MIN_DISPLAY_PRICE_RUB },
      },
      include: offerInclude,
      orderBy: [{ priceRub: 'asc' }, { id: 'asc' }],
      take: 32,
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
    targetCatalogSession,
  );
  const sessions = publicSessions.length ? publicSessions : widgetOnlySessions;
  const tags = orderedEventTags(requestedEvent);
  const subcategories = pickCatalogSubcategories({
    category: requestedEvent.category?.title || null,
    subcategories: eventSubcategories(requestedEvent),
    tags,
  });
  const destination = eventDestination(requestedEvent, targetCatalogSession);
  const priceFrom = displayPriceFrom(
    targetCatalogSession?.priceFrom,
    requestedEvent.priceFromRub,
    ...sessions.map((session) => session.priceFrom),
    ...offers.map((offer) => offer.priceRub),
  );
  const title = requestedEvent.override?.title || requestedEvent.title;
  const landingSlugs = targetCatalogSession?.landingSlugs || matchingLandingSlugs({
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
    externalId: requestedIdentity.externalId,
    widgetProvider: providerForSource(eventSourceCode),
    widgetPayload: buildProviderWidgetPayload({
      sourceCode: eventSourceCode,
      externalId: requestedIdentity.externalId,
    }),
    title,
    description: cleanImportedDescription(requestedEvent.override?.description || requestedEvent.description),
    imageUrl: requestedEvent.override?.imageUrl || requestedEvent.imageUrl || requestedEvent.venue?.heroImageUrl || requestedEvent.primaryCity?.heroImageUrl || null,
    category: requestedEvent.category?.title || 'События',
    tags,
    subcategories,
    city: requestedEvent.primaryCity?.title || 'Не указан',
    cityId: requestedEvent.primaryCity?.id || null,
    citySlug: destination.slug,
    sourceCitySlug: requestedEvent.primaryCity?.slug || null,
    destination: destination.name,
    destinationType: destination.type,
    venueId: requestedEvent.venue?.id || null,
    venueSlug: requestedEvent.venue?.slug || null,
    venue: requestedEvent.venue?.title || 'Не указано',
    venueAddress: requestedEvent.venue?.address || null,
    venueKind: requestedEvent.venue?.kind || 'OTHER',
    ageLimit: requestedEvent.ageLimit,
    priceFrom,
    vacant: targetCatalogSession?.vacant ?? requestedEvent.ticketsVacant,
    eventType: requestedEvent.kind.toLowerCase(),
    landingSlugs,
    groupKey: targetCatalogSession?.groupKey || eventGroupKey(requestedEvent, requestedIdentity),
    groupEventIds,
    sessionCount: targetCatalogSession?.sessionCount || sessions.length,
    purchaseUrl: eventPurchaseUrl,
    widgetUrl: representativeOffer?.widgetUrl || eventPurchaseUrl,
    deeplinkUrl: representativeOffer?.deeplinkUrl || null,
    purchaseReady: eventPurchase.ready,
    purchaseMode: eventPurchase.mode,
    purchaseProvider: eventPurchase.provider,
    purchaseUrlSource: eventPurchase.urlSource,
    seoH1: requestedEvent.override?.seoH1 || requestedEvent.seoH1 || title,
    seoTitle: requestedEvent.override?.seoTitle || requestedEvent.seoTitle || `${title}: билеты и расписание | Дайбилет`,
    seoDescription: cleanImportedDescription(requestedEvent.override?.seoDescription || requestedEvent.seoDescription) ||
      `Расписание, цены и билеты на ${title}. Покупка через виджет билетной системы.`,
    canonicalPath: requestedEvent.override?.canonicalPath || requestedEvent.canonicalPath || `/events/${publicSlug(representative.slug)}`,
    isIndexable: requestedEvent.override?.isIndexable ?? requestedEvent.isIndexable,
  };
  const ticketPrices = buildTicketPrices(offers, sessions, event);
  const related = relatedSessions(catalogSessions, groupEventIds, requestedEvent, 12);
  const priceValues = [event.priceFrom, ...sessions.map((session) => session.priceFrom)]
    .filter((value): value is number => Number.isFinite(value) && Number(value) >= MIN_DISPLAY_PRICE_RUB);
  const vacantValues = sessions.map((session) => session.vacant)
    .filter((value): value is number => Number.isFinite(value));

  const scheduleSource = sessionRows[0] || sessions[0] || targetCatalogSession;
  if (!isSaleableEventForPublic({
    kind: requestedEvent.kind,
    sourceStatus: requestedEvent.sourceStatus,
    startsAt: scheduleSource && 'startsAt' in scheduleSource ? scheduleSource.startsAt : null,
    endsAt: sessionRows[0]?.endsAt || sessions.find((session) => session.endsAt)?.endsAt || null,
    purchaseReady: event.purchaseReady,
    priceFrom: event.priceFrom,
  })) {
    return null;
  }

  return {
    generatedAt: new Date().toISOString(),
    event,
    sessions,
    offers: offers.map(({ eventId: _eventId, sortOrder: _sortOrder, sourceTicketId: _sourceTicketId, payload: _payload, ...offer }) => offer),
    ticketPrices,
    related,
    landings: landingSlugs.map(findLandingRule).filter(isDefined).map((rule) => ({
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips,
    })),
    stats: {
      sessions: targetCatalogSession?.sessionCount || sessions.length,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      vacant: vacantValues.length ? vacantValues.reduce((sum, value) => sum + value, 0) : null,
    },
  };
}

async function resolveEvent(
  eventSlugOrId: string,
  catalogSession?: PublicSessionDto,
): Promise<EventRecord | null> {
  const direct = await prisma.event.findFirst({
    where: { OR: [{ id: eventSlugOrId }, { slug: eventSlugOrId }] },
    include: eventInclude,
  });
  if (direct) return direct;

  if (catalogSession?.id) {
    const catalogEvent = await prisma.event.findUnique({ where: { id: catalogSession.id }, include: eventInclude });
    if (catalogEvent) return catalogEvent;
  }

  const suffix = eventSlugOrId.match(/(?:^|-)([a-f0-9]{20,})$/i)?.[1];
  if (suffix) {
    const suffixEvent = await prisma.event.findFirst({
      where: { OR: [{ id: suffix }, { id: `evt_${suffix}` }, { slug: suffix }, { slug: `evt_${suffix}` }] },
      include: eventInclude,
    });
    if (suffixEvent) return suffixEvent;
  }

  const candidates = await prisma.event.findMany({
    select: { id: true, slug: true },
    orderBy: { updatedAt: 'desc' },
    take: 20000,
  });
  const match = candidates.find((candidate) => publicSlug(candidate.slug) === publicSlug(eventSlugOrId));
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
  const openDate = requestedEvent.kind === 'OPEN_DATE' || session.sourceStatus?.toLowerCase() === 'open_date';
  const wideLifetime = isWideLifetimeSession(session.startsAt, session.endsAt);
  const startsAt = openDate || wideLifetime ? null : normalizeStartsAt(session.startsAt);
  return {
    id: session.id,
    eventId: session.eventId,
    startsAt,
    endsAt: normalizeStartsAt(session.endsAt),
    dateLabel: openDate ? 'Открытая дата' : wideLifetime ? 'Даты в виджете' : formatDate(session.startsAt),
    timeLabel: openDate ? 'В виджете' : wideLifetime ? 'При покупке' : formatTime(session.startsAt),
    timeBucket: openDate || wideLifetime ? 'day' : timeBucket(session.startsAt),
    sourceStatus: session.sourceStatus,
    priceFrom: displayPriceFrom(session.priceFromRub, offer?.priceRub),
    vacant: session.ticketsVacant,
    purchaseUrl: purchase.url || eventPurchaseUrl,
    purchaseReady: purchase.ready || Boolean(eventPurchaseUrl),
    purchaseUrlSource: purchase.urlSource,
  };
}

function buildWidgetOnlySessions(
  sessions: PublicEventSession[],
  event: EventRecord,
  sourceCode: string | null,
  purchase: ReturnType<typeof purchaseInfo>,
  purchaseUrl: string | null,
  catalogSession?: PublicSessionDto,
): PublicEventSession[] {
  if (
    sessions.length ||
    !isOpenDateCatalogRow({ kind: event.kind, sourceStatus: event.sourceStatus }) ||
    !purchase.ready
  ) {
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
    priceFrom: displayPriceFrom(catalogSession?.priceFrom, event.priceFromRub),
    vacant: catalogSession?.vacant ?? event.ticketsVacant,
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
    unique.set(row.key, row);
  }
  return [...unique.values()].sort((left, right) => {
    const leftOrder = left.sortOrder ?? 9999;
    const rightOrder = right.sortOrder ?? 9999;
    return leftOrder - rightOrder || left.priceRub - right.priceRub || left.title.localeCompare(right.title, 'ru');
  }).slice(0, 32);
}

function relatedSessions(
  sessions: PublicSessionDto[],
  groupEventIds: string[],
  event: EventRecord,
  limit: number,
): PublicSessionDto[] {
  const groupIds = new Set(groupEventIds);
  return sessions.filter((session) =>
    !(session.groupEventIds || [session.id]).some((id) => groupIds.has(id)) &&
    (session.cityId === event.primaryCityId || session.category === event.category?.title)
  ).slice(0, limit);
}

function eventDestination(event: EventRecord, catalogSession?: PublicSessionDto): {
  name: string;
  slug: string;
  type: 'city' | 'region';
} {
  if (catalogSession) {
    return {
      name: catalogSession.destination,
      slug: catalogSession.citySlug || publicSlug(catalogSession.destination),
      type: catalogSession.destinationType,
    };
  }
  const city = event.primaryCity;
  if (city?.isDestination === false && city.region) {
    return { name: city.region.title, slug: publicSlug(city.region.title), type: 'region' };
  }
  const name = city?.title || 'Не указан';
  return { name, slug: publicSlug(name), type: 'city' };
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
  const title = cleanImportedDescription(value) || '';
  const key = normalizeGroupPart(title);
  if (!key || key === eventTitleKey || key === 'widget' || key.includes('ticketscloud widget')) return 'Билет';
  return title;
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
    const last = parts[parts.length - 1];
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

function extractOfferPayloadDescription(payload: Prisma.JsonValue | null): string | null {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  for (const key of ['description', 'comment', 'text']) {
    const direct = cleanImportedDescription(String(record[key] || ''));
    if (direct && !isGenericTicketDescription(direct)) return direct;
  }
  const ticket = record.ticket;
  if (ticket && typeof ticket === 'object' && !Array.isArray(ticket)) {
    for (const key of ['description', 'comment', 'text']) {
      const nested = cleanImportedDescription(String((ticket as Record<string, unknown>)[key] || ''));
      if (nested && !isGenericTicketDescription(nested)) return nested;
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
  if (!supplement || isGenericTicketDescription(supplement)) return null;
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

function publicSlug(value: string): string {
  const letters: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '').trim().toLowerCase().split('').map((character) => letters[character] ?? character)
    .join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
