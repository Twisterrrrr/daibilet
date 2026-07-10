import { prisma } from '@daibilet/db';
import type {
  PublicEventDto,
  PublicEventPageDto,
  PublicOfferDto,
  PublicSessionDto,
  PublicTicketPriceDto,
} from '@daibilet/contracts';

import { eventSlug } from '@/routes';

import {
  MIN_DISPLAY_PRICE_RUB,
  buildProviderWidgetUrl,
  cleanText,
  formatDate,
  formatTime,
  getNextPublicCatalogSessions,
  landingTitle,
  providerForSource,
  publicSlug,
  timeBucket,
} from './public-catalog';

const CACHE_MS = 5 * 60 * 1000;
const EVENT_SESSIONS_LIMIT = 5;
const RELATED_LIMIT = 8;

type EventDetailRow = Awaited<ReturnType<typeof loadEventDetailRows>>[number];
type EventDetailSessionRow = EventDetailRow['sessions'][number];

type EventPageContext = {
  catalogSession: PublicSessionDto | null;
  eventIds: string[];
};

let eventPageCache = new Map<string, { expiresAt: number; payload: PublicEventPageDto | null }>();
let eventPageBuilds = new Map<string, Promise<PublicEventPageDto | null>>();

export async function buildNextPublicEventPage(rawSlug: string, forceRefresh = false): Promise<PublicEventPageDto | null> {
  const requested = normalizeRouteCandidate(rawSlug);
  if (!requested) return null;
  if (forceRefresh) clearNextPublicEventPageCache();

  const cacheKey = requested;
  const cached = eventPageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;

  const existingBuild = eventPageBuilds.get(cacheKey);
  if (!forceRefresh && existingBuild) return existingBuild;

  const build = buildEventPagePayload(requested).then((payload) => {
    eventPageCache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, payload });
    return payload;
  });

  eventPageBuilds.set(cacheKey, build);
  try {
    return await build;
  } finally {
    if (eventPageBuilds.get(cacheKey) === build) eventPageBuilds.delete(cacheKey);
  }
}

export function clearNextPublicEventPageCache(): void {
  eventPageCache = new Map();
  eventPageBuilds = new Map();
}

async function buildEventPagePayload(requested: string): Promise<PublicEventPageDto | null> {
  const catalogSessions = await getNextPublicCatalogSessions();
  const context = await resolveEventPageContext(requested, catalogSessions);
  if (!context.eventIds.length) return null;

  const rows = await loadEventDetailRows(context.eventIds);
  if (!rows.length) return null;

  const canonical = pickCanonicalRow(rows, context.catalogSession);
  const offers = mapOffers(rows);
  const sessions = mapSessions(rows, context.catalogSession);
  const ticketPrices = buildTicketPrices(offers, sessions, canonical, context.catalogSession);
  const priceFrom = resolvePriceFrom(ticketPrices, sessions, canonical, context.catalogSession);
  const vacant = resolveVacant(sessions, canonical, context.catalogSession);
  const event = mapEvent(canonical, context, {
    priceFrom,
    vacant,
    sessionCount: context.catalogSession?.sessionCount || sessions.length || rows.length,
  });

  return {
    generatedAt: new Date().toISOString(),
    event,
    sessions,
    offers,
    ticketPrices,
    related: buildRelatedSessions(catalogSessions, context.catalogSession, event, context.eventIds),
    landings: buildEventLandings(event.landingSlugs),
    stats: {
      sessions: context.catalogSession?.sessionCount || sessions.length || rows.length,
      priceFrom,
      vacant,
    },
  };
}

async function resolveEventPageContext(
  requested: string,
  catalogSessions: PublicSessionDto[],
): Promise<EventPageContext> {
  const catalogSession = findCatalogSession(requested, catalogSessions);
  if (catalogSession) {
    return {
      catalogSession,
      eventIds: groupEventIds(catalogSession),
    };
  }

  const direct = await findEventReference(requested);
  if (!direct) return { catalogSession: null, eventIds: [] };

  const sessionById = catalogSessions.find((session) => {
    if (session.id === direct.id) return true;
    return (session.groupEventIds || []).includes(direct.id);
  });

  return {
    catalogSession: sessionById || null,
    eventIds: sessionById ? groupEventIds(sessionById) : [direct.id],
  };
}

function findCatalogSession(requested: string, sessions: PublicSessionDto[]): PublicSessionDto | null {
  const possibleId = opaqueIdFromSlug(requested);
  for (const session of sessions) {
    const candidates = [
      session.id,
      session.slug,
      session.sourceSlug,
      eventSlug(session),
      ...(session.groupEventIds || []),
    ];
    if (possibleId) candidates.push(possibleId);
    if (candidates.some((candidate) => normalizeRouteCandidate(candidate) === requested)) return session;
    if (possibleId && (session.groupEventIds || []).includes(possibleId)) return session;
  }
  return null;
}

function groupEventIds(session: PublicSessionDto): string[] {
  const ids = [session.id, ...(session.groupEventIds || [])].filter(Boolean);
  return [...new Set(ids)].slice(0, 24);
}

async function findEventReference(requested: string): Promise<{ id: string } | null> {
  const possibleId = opaqueIdFromSlug(requested);
  const event = await prisma.event.findFirst({
    where: {
      status: { not: 'HIDDEN' },
      OR: [
        { slug: requested },
        ...(possibleId ? [{ id: possibleId }, { slug: possibleId }] : []),
      ],
    },
    select: { id: true },
  });
  return event;
}

async function loadEventDetailRows(eventIds: string[]) {
  const now = new Date();
  return prisma.event.findMany({
    where: {
      id: { in: eventIds },
      status: { not: 'HIDDEN' },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      kind: true,
      sourceStatus: true,
      ageLimit: true,
      imageUrl: true,
      seoH1: true,
      seoTitle: true,
      seoDescription: true,
      canonicalPath: true,
      isIndexable: true,
      priceFromRub: true,
      ticketsVacant: true,
      override: {
        select: {
          title: true,
          description: true,
          shortDescription: true,
          imageUrl: true,
        },
      },
      primaryCity: {
        select: {
          id: true,
          slug: true,
          title: true,
          isDestination: true,
          region: { select: { id: true, slug: true, title: true } },
        },
      },
      venue: {
        select: {
          id: true,
          slug: true,
          title: true,
          address: true,
          kind: true,
          heroImageUrl: true,
        },
      },
      category: { select: { title: true } },
      primarySubcategory: { select: { title: true } },
      subcategories: {
        select: { subcategory: { select: { title: true } } },
      },
      tags: {
        select: { tag: { select: { title: true } } },
      },
      offers: {
        where: { active: true },
        orderBy: [{ priceRub: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          sourceCode: true,
          title: true,
          priceRub: true,
          widgetUrl: true,
          deeplinkUrl: true,
          active: true,
        },
      },
      providerLinks: {
        where: { entityKind: 'EVENT' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: {
          externalId: true,
          externalParentId: true,
          sourceUrl: true,
          source: { select: { code: true, name: true } },
        },
      },
      sourceLinks: {
        orderBy: { updatedAt: 'desc' },
        select: {
          externalId: true,
          sourceUrl: true,
          source: { select: { code: true, name: true } },
        },
      },
      sessions: {
        where: { OR: [{ startsAt: null }, { startsAt: { gte: now } }] },
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          eventId: true,
          startsAt: true,
          endsAt: true,
          sourceStatus: true,
          priceFromRub: true,
          ticketsVacant: true,
          externalId: true,
          providerLinks: {
            where: { entityKind: 'SESSION' },
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            select: {
              externalId: true,
              externalParentId: true,
              source: { select: { code: true } },
            },
          },
        },
      },
    },
  });
}

function pickCanonicalRow(rows: EventDetailRow[], catalogSession: PublicSessionDto | null): EventDetailRow {
  if (catalogSession) {
    const direct = rows.find((row) => row.id === catalogSession.id);
    if (direct) return direct;
    const grouped = rows.find((row) => (catalogSession.groupEventIds || []).includes(row.id));
    if (grouped) return grouped;
  }
  return [...rows].sort(compareRowsForDetail)[0];
}

function mapEvent(
  row: EventDetailRow,
  context: EventPageContext,
  stats: { priceFrom: number | null; vacant: number | null; sessionCount: number },
): PublicEventDto {
  const title = cleanText(row.override?.title || row.title);
  const description = cleanText(row.override?.description || row.description || row.override?.shortDescription || '');
  const tags = row.tags.map((item) => item.tag.title).filter(Boolean).slice(0, 12);
  const subcategories = [
    row.primarySubcategory?.title,
    ...row.subcategories.map((item) => item.subcategory.title),
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
  const destination = destinationForRow(row);
  const source = sourceForEvent(row);
  const provider = providerForSource(source.code || row.offers[0]?.sourceCode || null);
  const purchase = purchaseInfoForRow(row);
  const slug = context.catalogSession?.slug || publicSlug(row.slug) || publicSlug(title) || row.id;
  const landingSlugs = context.catalogSession?.landingSlugs || [];

  return {
    id: row.id,
    slug,
    sourceSlug: row.slug,
    sourceCode: source.code || row.offers[0]?.sourceCode || null,
    externalId: source.externalId,
    widgetProvider: provider,
    widgetPayload: buildWidgetPayload(provider, source.externalId),
    title,
    description,
    imageUrl: row.override?.imageUrl || row.imageUrl || row.venue?.heroImageUrl || null,
    category: row.category?.title || 'События',
    subcategories,
    tags,
    city: row.primaryCity?.title || context.catalogSession?.city || 'Не указан',
    cityId: row.primaryCity?.id || context.catalogSession?.cityId || null,
    citySlug: destination.slug,
    sourceCitySlug: row.primaryCity?.slug || context.catalogSession?.sourceCitySlug || null,
    destination: destination.name,
    destinationType: destination.type,
    venueId: row.venue?.id || context.catalogSession?.venueId || null,
    venueSlug: row.venue?.slug || context.catalogSession?.venueSlug || null,
    venue: row.venue?.title || context.catalogSession?.venue || 'Не указано',
    venueAddress: row.venue?.address || null,
    venueKind: row.venue?.kind || context.catalogSession?.venueKind || 'OTHER',
    ageLimit: row.ageLimit,
    priceFrom: stats.priceFrom,
    vacant: stats.vacant,
    eventType: row.kind || row.sourceStatus || 'EVENT',
    landingSlugs,
    purchaseUrl: purchase.url,
    widgetUrl: purchase.url,
    deeplinkUrl: row.offers[0]?.deeplinkUrl || null,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    seoH1: row.seoH1 || title,
    seoTitle: row.seoTitle || `${title} | Дайбилет`,
    seoDescription: row.seoDescription || eventSeoDescription(title, description, row.primaryCity?.title),
    canonicalPath: row.canonicalPath || `/events/${slug}`,
    isIndexable: row.isIndexable,
    groupKey: context.catalogSession?.groupKey || null,
    groupEventIds: context.eventIds,
    sessionCount: stats.sessionCount,
  };
}

function mapSessions(
  rows: EventDetailRow[],
  catalogSession: PublicSessionDto | null,
): PublicEventPageDto['sessions'] {
  const items = rows
    .flatMap((event) => event.sessions.map((session) => ({ event, session })))
    .sort((left, right) => compareSessionRows(left.session, right.session))
    .slice(0, EVENT_SESSIONS_LIMIT)
    .map(({ event, session }) => {
      const startsAt = session.startsAt ? session.startsAt.toISOString() : null;
      const purchase = purchaseInfoForRow(event, session);
      return {
        id: session.id,
        eventId: event.id,
        startsAt,
        endsAt: session.endsAt ? session.endsAt.toISOString() : null,
        dateLabel: startsAt ? formatDate(startsAt) : 'Открытая дата',
        timeLabel: startsAt ? formatTime(startsAt) : 'В виджете',
        timeBucket: startsAt ? timeBucket(startsAt) : 'day',
        sourceStatus: session.sourceStatus || event.sourceStatus,
        priceFrom: firstDisplayPrice([session.priceFromRub, event.priceFromRub, catalogSession?.priceFrom]),
        vacant: session.ticketsVacant ?? event.ticketsVacant ?? catalogSession?.vacant ?? null,
        purchaseUrl: purchase.url,
        purchaseReady: purchase.ready,
        purchaseUrlSource: purchase.urlSource,
      };
    });

  if (items.length) return items;

  const fallback = rows[0];
  if (!fallback) return [];

  const purchase = purchaseInfoForRow(fallback);
  return [
    {
      id: `${fallback.id}:open-date`,
      eventId: fallback.id,
      startsAt: null,
      endsAt: null,
      dateLabel: 'Открытая дата',
      timeLabel: 'В виджете',
      timeBucket: 'day',
      sourceStatus: fallback.sourceStatus,
      priceFrom: firstDisplayPrice([fallback.priceFromRub, catalogSession?.priceFrom]),
      vacant: fallback.ticketsVacant ?? catalogSession?.vacant ?? null,
      purchaseUrl: purchase.url,
      purchaseReady: purchase.ready,
      purchaseUrlSource: purchase.urlSource,
    },
  ];
}

function mapOffers(rows: EventDetailRow[]): PublicOfferDto[] {
  const seen = new Set<string>();
  const offers: PublicOfferDto[] = [];

  for (const row of rows) {
    for (const offer of row.offers) {
      const purchaseUrl = offer.widgetUrl || offer.deeplinkUrl || null;
      const key = [
        String(offer.sourceCode || ''),
        cleanText(offer.title || ''),
        offer.priceRub ?? '',
        purchaseUrl || '',
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      offers.push({
        id: offer.id,
        sourceCode: String(offer.sourceCode || ''),
        title: cleanText(offer.title || '') || null,
        priceRub: offer.priceRub,
        widgetUrl: offer.widgetUrl,
        deeplinkUrl: offer.deeplinkUrl,
        purchaseUrl,
        purchaseReady: Boolean(purchaseUrl),
        purchaseMode: purchaseUrl ? 'widget' : null,
        purchaseProvider: providerForSource(offer.sourceCode),
        purchaseUrlSource: purchaseUrl ? 'offer' : null,
        active: offer.active,
      });
    }
  }

  return offers.sort((left, right) => {
    const priceDelta = (left.priceRub || Number.POSITIVE_INFINITY) - (right.priceRub || Number.POSITIVE_INFINITY);
    return priceDelta || String(left.title || '').localeCompare(String(right.title || ''), 'ru');
  });
}

function buildTicketPrices(
  offers: PublicOfferDto[],
  sessions: PublicEventPageDto['sessions'],
  row: EventDetailRow,
  catalogSession: PublicSessionDto | null,
): PublicTicketPriceDto[] {
  const prices = new Map<string, PublicTicketPriceDto>();

  for (const offer of offers) {
    if (typeof offer.priceRub !== 'number' || offer.priceRub < MIN_DISPLAY_PRICE_RUB) continue;
    const title = cleanText(offer.title || '') || 'Билет';
    const key = `offer:${title.toLowerCase()}:${offer.priceRub}:${offer.sourceCode}`;
    if (!prices.has(key)) {
      prices.set(key, {
        key,
        title,
        priceRub: offer.priceRub,
        source: offer.sourceCode,
        sourceCode: offer.sourceCode,
        sourceTicketId: offer.id,
        purchaseUrl: offer.widgetUrl || offer.deeplinkUrl || null,
        kind: 'offer',
        sortOrder: prices.size,
      });
    }
  }

  if (!prices.size) {
    for (const session of sessions) {
      if (typeof session.priceFrom !== 'number' || session.priceFrom < MIN_DISPLAY_PRICE_RUB) continue;
      const key = `session:${session.priceFrom}`;
      if (!prices.has(key)) {
        prices.set(key, {
          key,
          title: 'Билет',
          priceRub: session.priceFrom,
          purchaseUrl: session.purchaseUrl || null,
          kind: 'session',
          sortOrder: prices.size,
        });
      }
    }
  }

  if (!prices.size) {
    const fallbackPrice = firstDisplayPrice([row.priceFromRub, catalogSession?.priceFrom]);
    if (fallbackPrice != null) {
      prices.set('fallback:price-from', {
        key: 'fallback:price-from',
        title: 'Билет',
        priceRub: fallbackPrice,
        purchaseUrl: purchaseInfoForRow(row).url,
        kind: 'fallback',
        sortOrder: 0,
      });
    }
  }

  return [...prices.values()].sort((left, right) => left.priceRub - right.priceRub || (left.sortOrder || 0) - (right.sortOrder || 0));
}

function buildRelatedSessions(
  sessions: PublicSessionDto[],
  currentSession: PublicSessionDto | null,
  event: PublicEventDto,
  eventIds: string[],
): PublicSessionDto[] {
  const idSet = new Set(eventIds);
  return sessions
    .filter((session) => {
      if (session.groupKey && currentSession?.groupKey && session.groupKey === currentSession.groupKey) return false;
      if (idSet.has(session.id)) return false;
      if ((session.groupEventIds || []).some((id) => idSet.has(id))) return false;
      return true;
    })
    .map((session) => ({ session, score: relatedScore(session, event) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || compareCatalogSessions(left.session, right.session))
    .slice(0, RELATED_LIMIT)
    .map((item) => item.session);
}

function buildEventLandings(slugs: string[]): PublicEventPageDto['landings'] {
  return [...new Set(slugs.filter(Boolean))].map((slug) => ({
    slug,
    title: landingTitle(slug),
    subtitle: landingSubtitle(slug),
    chips: landingChips(slug),
  }));
}

function sourceForEvent(row: EventDetailRow): { code: string | null; name: string | null; externalId: string | null } {
  const provider = row.providerLinks[0];
  if (provider) {
    return {
      code: String(provider.source.code || ''),
      name: provider.source.name,
      externalId: provider.externalId,
    };
  }
  const source = row.sourceLinks[0];
  if (source) {
    return {
      code: String(source.source.code || ''),
      name: source.source.name,
      externalId: source.externalId,
    };
  }
  return {
    code: row.offers[0]?.sourceCode ? String(row.offers[0].sourceCode) : null,
    name: null,
    externalId: null,
  };
}

function purchaseInfoForRow(row: EventDetailRow, session?: EventDetailSessionRow) {
  const offer = row.offers[0];
  const source = sourceForEvent(row);
  const provider = providerForSource(source.code || offer?.sourceCode || null);
  const sessionLink = session?.providerLinks[0];
  const externalId = provider === 'TEPLOHOD'
    ? sessionLink?.externalParentId || source.externalId
    : sessionLink?.externalId || session?.externalId || sessionLink?.externalParentId || source.externalId;
  const explicitUrl = offer?.widgetUrl || offer?.deeplinkUrl || null;
  const fallbackUrl = buildProviderWidgetUrl(source.code || offer?.sourceCode || null, externalId);
  const url = explicitUrl || fallbackUrl;
  return {
    ready: Boolean(url),
    mode: provider ? 'widget' : url ? 'redirect' : null,
    provider,
    urlSource: explicitUrl ? 'offer' : fallbackUrl ? 'fallback' : null,
    url,
  } as const;
}

function destinationForRow(row: EventDetailRow): { id: string | null; slug: string | null; name: string | null; type: 'city' | 'region' } {
  const city = row.primaryCity;
  if (!city) return { id: null, slug: null, name: null, type: 'city' };
  if (city.isDestination || !city.region) {
    return { id: city.id, slug: city.slug, name: city.title, type: 'city' };
  }
  return { id: city.region.id, slug: city.region.slug, name: city.region.title, type: 'region' };
}

function buildWidgetPayload(provider: ReturnType<typeof providerForSource>, externalId: string | null): PublicEventDto['widgetPayload'] {
  if (!provider || !externalId) return null;
  if (provider === 'TEPLOHOD') {
    return {
      provider,
      tepEventId: externalId,
      tepWidgetId: process.env.NEXT_PUBLIC_TEP_WIDGET_ID || process.env.TEP_WIDGET_ID || null,
    };
  }
  return {
    provider,
    tcEventId: externalId,
  };
}

function resolvePriceFrom(
  ticketPrices: PublicTicketPriceDto[],
  sessions: PublicEventPageDto['sessions'],
  row: EventDetailRow,
  catalogSession: PublicSessionDto | null,
): number | null {
  return firstDisplayPrice([
    ...ticketPrices.map((price) => price.priceRub),
    ...sessions.map((session) => session.priceFrom),
    row.priceFromRub,
    catalogSession?.priceFrom,
  ]);
}

function resolveVacant(
  sessions: PublicEventPageDto['sessions'],
  row: EventDetailRow,
  catalogSession: PublicSessionDto | null,
): number | null {
  if (typeof catalogSession?.vacant === 'number') return catalogSession.vacant;
  const values = sessions.map((session) => session.vacant).filter((value): value is number => typeof value === 'number');
  if (values.length) return values.reduce((sum, value) => sum + value, 0);
  return row.ticketsVacant ?? null;
}

function firstDisplayPrice(values: Array<number | null | undefined>): number | null {
  const prices = values.filter((value): value is number => typeof value === 'number' && value >= MIN_DISPLAY_PRICE_RUB);
  return prices.length ? Math.min(...prices) : null;
}

function relatedScore(session: PublicSessionDto, event: PublicEventDto): number {
  let score = 0;
  if (session.city === event.city || session.destination === event.destination) score += 5;
  if (session.category === event.category) score += 4;
  if (session.venueId && session.venueId === event.venueId) score += 3;
  const eventLandings = new Set(event.landingSlugs || []);
  if ((session.landingSlugs || []).some((slug) => eventLandings.has(slug))) score += 3;
  const eventTags = new Set(event.tags || []);
  if ((session.tags || []).some((tag) => eventTags.has(tag))) score += 1;
  return score;
}

function compareRowsForDetail(left: EventDetailRow, right: EventDetailRow): number {
  return firstRowTime(left) - firstRowTime(right) || left.title.localeCompare(right.title, 'ru');
}

function firstRowTime(row: EventDetailRow): number {
  const startsAt = row.sessions.find((session) => session.startsAt)?.startsAt;
  return startsAt ? startsAt.getTime() : Number.POSITIVE_INFINITY - 1;
}

function compareSessionRows(left: EventDetailSessionRow, right: EventDetailSessionRow): number {
  const leftTime = left.startsAt?.getTime() ?? Number.POSITIVE_INFINITY - 1;
  const rightTime = right.startsAt?.getTime() ?? Number.POSITIVE_INFINITY - 1;
  return leftTime - rightTime || left.id.localeCompare(right.id, 'ru');
}

function compareCatalogSessions(left: PublicSessionDto, right: PublicSessionDto): number {
  const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : Number.POSITIVE_INFINITY - 1;
  const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : Number.POSITIVE_INFINITY - 1;
  return leftTime - rightTime || left.title.localeCompare(right.title, 'ru');
}

function normalizeRouteCandidate(value?: string | null): string {
  const decoded = decodePathSegment(String(value || ''));
  return decoded
    .replace(/^\/?events\//i, '')
    .trim()
    .toLowerCase();
}

function decodePathSegment(value: string): string {
  let decoded = String(value || '');
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function opaqueIdFromSlug(slug: string): string | null {
  if (/^[a-z0-9]{20,}$/i.test(slug)) return slug;
  const tail = slug.split('-').filter(Boolean).pop() || '';
  return /^[a-z0-9]{20,}$/i.test(tail) ? tail : null;
}

function eventSeoDescription(title: string, description: string, city?: string | null): string {
  const base = cleanText(description) || `${title}: расписание, категории билетов и покупка через билетную систему.`;
  const suffix = city ? ` ${city}: билеты и ближайшие даты на Дайбилет.` : ' Билеты и ближайшие даты на Дайбилет.';
  const text = `${base}${suffix}`;
  return text.length > 180 ? `${text.slice(0, 179).trim()}…` : text;
}

function landingSubtitle(slug: string): string {
  const subtitles: Record<string, string> = {
    'river-cruises': 'Ближайшие рейсы, цены и удобный переход к покупке.',
    'river-party': 'Ужины, вечеринки и праздники с быстрым выбором даты.',
    'bus-tours': 'Обзорные маршруты и экскурсии по городу.',
    'salute-9-may': 'Праздничные события и маршруты к конкретной дате.',
  };
  return subtitles[slug] || 'Тематическая подборка событий.';
}

function landingChips(slug: string): string[] {
  const chips: Record<string, string[]> = {
    'river-cruises': ['реки', 'каналы', 'теплоходы'],
    'river-party': ['ужин', 'вечеринка', 'теплоход'],
    'bus-tours': ['автобус', 'обзорная', 'экскурсия'],
    'salute-9-may': ['салют', '9 мая', 'праздник'],
  };
  return chips[slug] || [];
}
