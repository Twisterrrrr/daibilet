import { prisma } from '@daibilet/db';
import type { PublicCatalogDto, PublicSessionDto, PublicStatsDto } from '@daibilet/contracts';

const CACHE_MS = 5 * 60 * 1000;
export const MIN_DISPLAY_PRICE_RUB = 100;
const SITE_TIME_ZONE = 'Europe/Moscow';

type CatalogQuery = {
  q?: string;
  city?: string;
  category?: string;
  tag?: string;
  landing?: string;
  date?: string;
  from?: string;
  to?: string;
  sort?: string;
  maxPrice?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
  refresh?: number;
};

type EventRow = Awaited<ReturnType<typeof loadSaleableEventRows>>[number];

type GroupedEvent = {
  key: string;
  representative: EventRow;
  events: EventRow[];
  priceFrom: number;
  vacant: number | null;
  startsAt: string;
  upcomingSlots: NonNullable<PublicSessionDto['upcomingSlots']>;
};

let catalogCache: { expiresAt: number; sessions: PublicSessionDto[] } | null = null;
let catalogBuild: Promise<PublicSessionDto[]> | null = null;
let statsCache: { expiresAt: number; payload: PublicStatsDto } | null = null;
let statsBuild: Promise<PublicStatsDto> | null = null;

export async function buildNextPublicStats(forceRefresh = false): Promise<PublicStatsDto> {
  const now = Date.now();
  if (!forceRefresh && statsCache && statsCache.expiresAt > now) return statsCache.payload;
  if (!forceRefresh && statsBuild) return statsBuild;
  if (forceRefresh) clearNextPublicCatalogCache();

  const build = Promise.all([getNextPublicCatalogSessions(forceRefresh), prisma.venue.count()]).then(([sessions, venueCount]) => {
    const destinations = new Map<string, { events: number; venueIds: Set<string> }>();
    for (const session of sessions) {
      const key = `${session.destinationType}:${session.destination || session.city}`;
      if (!session.destination && !session.city) continue;
      const bucket = destinations.get(key) || { events: 0, venueIds: new Set<string>() };
      bucket.events += 1;
      if (session.venueId) bucket.venueIds.add(session.venueId);
      destinations.set(key, bucket);
    }

    const visibleDestinations = [...destinations.values()].filter((item) => item.events >= 2);
    const payload: PublicStatsDto = {
      generatedAt: new Date().toISOString(),
      stats: {
        events: sessions.length,
        destinations: visibleDestinations.length,
        cities: visibleDestinations.length,
        venues: venueCount,
        landings: countUnique(sessions.flatMap((session) => session.landingSlugs || [])),
      },
    };
    statsCache = { expiresAt: Date.now() + CACHE_MS, payload };
    return payload;
  });

  statsBuild = build;
  try {
    return await build;
  } finally {
    if (statsBuild === build) statsBuild = null;
  }
}

export async function buildNextPublicCatalog(query: CatalogQuery): Promise<PublicCatalogDto> {
  const sessions = await getNextPublicCatalogSessions(query.refresh === 1);
  const filtered = sessions.filter((session) => matchesQuery(session, query));
  const sorted = sortSessions(filtered, query.sort || 'time');
  const limit = clamp(query.limit, 1, 240, 60);
  const offset = clamp(query.offset, 0, 100000, 0);
  const items = sorted.slice(offset, offset + limit);

  return {
    generatedAt: new Date().toISOString(),
    total: sorted.length,
    offset,
    limit,
    hasMore: offset + items.length < sorted.length,
    items,
    facets: buildFacets(sessions),
  };
}

export async function getNextPublicCatalogSessions(forceRefresh = false): Promise<PublicSessionDto[]> {
  const now = Date.now();
  if (!forceRefresh && catalogCache && catalogCache.expiresAt > now) return catalogCache.sessions;
  if (!forceRefresh && catalogBuild) return catalogBuild;
  if (forceRefresh) clearNextPublicCatalogCache();

  const build = loadSaleableEventRows().then((rows) => {
    const grouped = groupSaleableEvents(rows);
    const sessions = grouped.map(mapGroupedEvent).sort(compareSessionTime);
    catalogCache = { expiresAt: Date.now() + CACHE_MS, sessions };
    return sessions;
  });

  catalogBuild = build;
  try {
    return await build;
  } finally {
    if (catalogBuild === build) catalogBuild = null;
  }
}

export function clearNextPublicCatalogCache(): void {
  catalogCache = null;
  catalogBuild = null;
  statsCache = null;
  statsBuild = null;
}

function parseSearchParams(searchParams: URLSearchParams): CatalogQuery {
  return {
    q: textParam(searchParams, 'q'),
    city: textParam(searchParams, 'city'),
    category: textParam(searchParams, 'category'),
    tag: textParam(searchParams, 'tag'),
    landing: textParam(searchParams, 'landing'),
    date: textParam(searchParams, 'date'),
    from: textParam(searchParams, 'from'),
    to: textParam(searchParams, 'to'),
    sort: textParam(searchParams, 'sort'),
    maxPrice: numberParam(searchParams, 'maxPrice'),
    priceMax: numberParam(searchParams, 'priceMax'),
    limit: numberParam(searchParams, 'limit'),
    offset: numberParam(searchParams, 'offset'),
    refresh: numberParam(searchParams, 'refresh'),
  };
}

export function catalogQueryFromRequest(request: Request): CatalogQuery {
  return parseSearchParams(new URL(request.url).searchParams);
}

async function loadSaleableEventRows() {
  const now = new Date();
  return prisma.event.findMany({
    where: {
      status: { not: 'HIDDEN' },
      isIndexable: true,
      OR: [
        { kind: 'OPEN_DATE' },
        { sourceStatus: 'open_date' },
        { sessions: { some: { OR: [{ startsAt: null }, { startsAt: { gte: now } }] } } },
        { providerLinks: { some: { entityKind: 'EVENT', source: { code: 'TEPLOHOD' } } } },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      kind: true,
      sourceStatus: true,
      imageUrl: true,
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
        },
      },
      providerLinks: {
        where: { entityKind: 'EVENT' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        select: {
          externalId: true,
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
        take: 16,
        select: {
          id: true,
          eventId: true,
          startsAt: true,
          priceFromRub: true,
          ticketsVacant: true,
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
    take: 6000,
  });
}

function groupSaleableEvents(rows: EventRow[]): GroupedEvent[] {
  const groups = new Map<string, EventRow[]>();
  for (const row of rows) {
    if (!purchaseReady(row)) continue;
    const price = eventPriceFrom(row);
    if (price == null || price < MIN_DISPLAY_PRICE_RUB) continue;
    const key = groupKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  return [...groups.entries()].map(([key, events]) => {
    const sorted = [...events].sort(compareEventRows);
    const allSlots = sorted.flatMap((event) => event.sessions.map((session) => ({ event, session })));
    const upcomingSlots = allSlots
      .filter(({ session }) => session.startsAt)
      .sort((left, right) => Number(left.session.startsAt) - Number(right.session.startsAt))
      .slice(0, 8)
      .map(({ event, session }) => {
        const startsAt = session.startsAt ? session.startsAt.toISOString() : '';
        return {
          id: session.id,
          eventId: event.id,
          startsAt,
          dateLabel: formatDate(startsAt),
          timeLabel: formatTime(startsAt),
          timeBucket: timeBucket(startsAt),
          purchaseUrl: purchaseUrlForEvent(event, session.providerLinks[0]?.externalId, session.providerLinks[0]?.externalParentId),
        };
      });
    const prices = sorted.map(eventPriceFrom).filter(isPresentNumber);
    const vacant = sorted
      .flatMap((event) => [event.ticketsVacant, ...event.sessions.map((session) => session.ticketsVacant)])
      .filter(isPresentNumber)
      .reduce((sum, value) => sum + value, 0);

    return {
      key,
      representative: sorted[0],
      events: sorted,
      priceFrom: Math.min(...prices),
      vacant: vacant > 0 ? vacant : null,
      startsAt: upcomingSlots[0]?.startsAt || '',
      upcomingSlots,
    };
  });
}

function mapGroupedEvent(group: GroupedEvent): PublicSessionDto {
  const event = group.representative;
  const destination = destinationForEvent(event);
  const title = event.override?.title || event.title;
  const tags = event.tags.map((item) => item.tag.title).filter(Boolean).slice(0, 8);
  const subcategories = [
    event.primarySubcategory?.title,
    ...event.subcategories.map((item) => item.subcategory.title),
  ].filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
  const openDate = isOpenDate(event) || !group.startsAt;
  const startsAt = openDate ? '' : group.startsAt;
  const source = eventSource(event);
  const purchase = purchaseInfoForEvent(event);

  return {
    id: event.id,
    slug: publicSlug(event.slug),
    sourceSlug: event.slug,
    groupKey: group.key,
    groupEventIds: group.events.map((item) => item.id).slice(0, 12),
    groupedEventsCount: group.events.length,
    sessionCount: group.upcomingSlots.length || group.events.reduce((sum, item) => sum + item.sessions.length, 0) || 1,
    upcomingSlots: group.upcomingSlots,
    landingSlugs: landingSlugsForEvent({ title, tags, subcategories, category: event.category?.title || '' }),
    title,
    cityId: event.primaryCity?.id || null,
    citySlug: destination.slug,
    sourceCitySlug: event.primaryCity?.slug || null,
    city: event.primaryCity?.title || 'Не указан',
    destination: destination.name,
    destinationType: destination.type,
    venueId: event.venue?.id || null,
    venueSlug: event.venue?.slug || null,
    venue: event.venue?.title || 'Не указано',
    venueKind: event.venue?.kind || 'OTHER',
    offerTitle: event.offers[0]?.title || null,
    offerSourceCode: event.offers[0]?.sourceCode || source.code,
    purchaseUrl: purchase.url,
    widgetUrl: purchase.url,
    deeplinkUrl: event.offers[0]?.deeplinkUrl || null,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    category: event.category?.title || 'События',
    subcategories: subcategories.slice(0, 4),
    tags: tags.slice(0, 4),
    kind: event.kind,
    sourceStatus: event.sourceStatus,
    description: cleanText(event.override?.description || event.description || event.override?.shortDescription || ''),
    startsAt,
    dateLabel: openDate ? 'Открытая дата' : formatDate(startsAt),
    timeLabel: openDate ? 'В виджете' : formatTime(startsAt),
    timeBucket: openDate ? 'day' : timeBucket(startsAt),
    priceFrom: group.priceFrom,
    vacant: group.vacant,
    imageUrl: event.override?.imageUrl || event.imageUrl || event.venue?.heroImageUrl || null,
  };
}

function matchesQuery(session: PublicSessionDto, query: CatalogQuery): boolean {
  if (query.city && query.city !== 'all' && session.city !== query.city && session.destination !== query.city) return false;
  if (
    query.category &&
    query.category !== 'all' &&
    session.category !== query.category &&
    !(session.subcategories || []).includes(query.category) &&
    !session.tags.includes(query.category)
  ) return false;
  if (query.tag && query.tag !== 'all' && !session.tags.includes(query.tag)) return false;
  if (query.landing && query.landing !== 'all' && !session.landingSlugs.includes(query.landing)) return false;
  if (query.date && query.date !== 'all' && !matchesDate(session, query.date)) return false;
  const maxPrice = query.maxPrice ?? query.priceMax;
  if (maxPrice && (!session.priceFrom || session.priceFrom > maxPrice)) return false;
  if (!matchesDateRange(session.startsAt, query.from, query.to)) return false;

  const search = query.q?.trim().toLowerCase();
  if (!search) return true;
  return [
    session.title,
    session.city,
    session.destination,
    session.venue,
    session.category,
    ...(session.subcategories || []),
    ...session.tags,
  ].join(' ').toLowerCase().includes(search);
}

function buildFacets(sessions: PublicSessionDto[]): PublicCatalogDto['facets'] {
  return {
    cities: countValues(sessions.map((session) => session.destination || session.city))
      .filter((item) => item.events >= 2)
      .map(({ name, events }) => ({ name, events })),
    categories: countValues(sessions.map((session) => session.category)),
    subcategories: countValues(sessions.flatMap((session) => session.subcategories || [])).slice(0, 24),
    tags: countValues(sessions.flatMap((session) => session.tags || [])).slice(0, 24),
    landings: countValues(sessions.flatMap((session) => session.landingSlugs || [])).map(({ name, events }) => ({
      slug: name,
      title: landingTitle(name),
      events,
    })),
    priceSteps: buildPriceSteps(sessions),
  };
}

function purchaseReady(event: EventRow): boolean {
  return purchaseInfoForEvent(event).ready;
}

function purchaseInfoForEvent(event: EventRow) {
  const offer = event.offers[0];
  const source = eventSource(event);
  const externalId = source.externalId;
  const explicitUrl = offer?.widgetUrl || offer?.deeplinkUrl || null;
  const fallbackUrl = buildProviderWidgetUrl(source.code || offer?.sourceCode || null, externalId);
  const url = explicitUrl || fallbackUrl;
  const provider = providerForSource(source.code || offer?.sourceCode || null);
  return {
    ready: Boolean(url),
    mode: provider ? 'widget' : url ? 'redirect' : null,
    provider,
    urlSource: explicitUrl ? 'offer' : fallbackUrl ? 'fallback' : null,
    url,
  } as const;
}

function purchaseUrlForEvent(event: EventRow, sessionExternalId?: string | null, sessionParentId?: string | null): string | null {
  const source = eventSource(event);
  const provider = providerForSource(source.code || event.offers[0]?.sourceCode || null);
  const externalId = provider === 'TEPLOHOD'
    ? sessionParentId || source.externalId
    : sessionExternalId || sessionParentId || source.externalId;
  return event.offers[0]?.widgetUrl || event.offers[0]?.deeplinkUrl || buildProviderWidgetUrl(source.code, externalId);
}

export function buildProviderWidgetUrl(sourceCode?: string | null, externalId?: string | null): string | null {
  const provider = providerForSource(sourceCode);
  if (provider === 'TEPLOHOD') {
    if (!externalId) return null;
    const baseUrl = process.env.TEP_WIDGET_BASE_URL || 'https://teplohod.info';
    return `${baseUrl.replace(/\/+$/, '')}/event/${encodeURIComponent(externalId)}`;
  }
  if (provider === 'TICKETSCLOUD') {
    const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
    if (!token || !externalId) return null;
    const normalizedToken = token.startsWith('r:') ? token : `r:${token}`;
    const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || 'https://ticketscloud.org/v1/widgets/common');
    url.searchParams.set('token', normalizedToken);
    url.searchParams.set('event', externalId);
    return url.toString();
  }
  return null;
}

export function providerForSource(sourceCode?: string | null): 'TICKETSCLOUD' | 'TEPLOHOD' | null {
  const value = String(sourceCode || '').toUpperCase();
  if (value.includes('TEPLOHOD')) return 'TEPLOHOD';
  if (value.includes('TC') || value.includes('TICKETSCLOUD')) return 'TICKETSCLOUD';
  return null;
}

function eventSource(event: EventRow): { code: string | null; name: string | null; externalId: string | null } {
  const provider = event.providerLinks[0];
  if (provider) return { code: provider.source.code, name: provider.source.name, externalId: provider.externalId };
  const source = event.sourceLinks[0];
  if (source) return { code: source.source.code, name: source.source.name, externalId: source.externalId };
  return { code: event.offers[0]?.sourceCode || null, name: null, externalId: null };
}

function eventPriceFrom(event: EventRow): number | null {
  const prices = [
    event.priceFromRub,
    ...event.offers.map((offer) => offer.priceRub),
    ...event.sessions.map((session) => session.priceFromRub),
  ].filter((price): price is number => typeof price === 'number' && price >= MIN_DISPLAY_PRICE_RUB);
  return prices.length ? Math.min(...prices) : null;
}

function groupKey(event: EventRow): string {
  const source = eventSource(event).code || event.offers[0]?.sourceCode || '';
  return [
    normalizeGroupPart(source),
    normalizeGroupPart(event.override?.title || event.title),
    normalizeGroupPart(event.primaryCity?.title || ''),
    normalizeGroupPart(event.venue?.id || event.venue?.title || ''),
  ].join('|');
}

function destinationForEvent(event: EventRow): { id: string; slug: string; name: string; type: 'city' | 'region' } {
  const city = event.primaryCity;
  if (!city) return { id: 'unknown', slug: 'unknown', name: 'Не указан', type: 'city' };
  if (city.isDestination || !city.region) {
    return { id: city.id, slug: city.slug, name: city.title, type: 'city' };
  }
  return { id: city.region.id, slug: city.region.slug, name: city.region.title, type: 'region' };
}

function compareEventRows(left: EventRow, right: EventRow): number {
  const leftOpen = isOpenDate(left);
  const rightOpen = isOpenDate(right);
  if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
  return firstEventTime(left) - firstEventTime(right) || left.title.localeCompare(right.title, 'ru');
}

function firstEventTime(event: EventRow): number {
  const startsAt = event.sessions.find((session) => session.startsAt)?.startsAt;
  return startsAt ? startsAt.getTime() : Number.POSITIVE_INFINITY;
}

function sortSessions(sessions: PublicSessionDto[], sort: string): PublicSessionDto[] {
  const sorted = [...sessions];
  if (sort === 'price' || sort === 'price_asc') return sorted.sort(compareSessionPrice);
  if (sort === 'price_desc') return sorted.sort((left, right) => compareSessionPrice(right, left));
  if (sort === 'popular') {
    return sorted.sort((left, right) => (right.sessionCount || 1) - (left.sessionCount || 1) || compareSessionTime(left, right));
  }
  return sorted.sort(compareSessionTime);
}

function compareSessionPrice(left: PublicSessionDto, right: PublicSessionDto): number {
  return (left.priceFrom || Number.POSITIVE_INFINITY) - (right.priceFrom || Number.POSITIVE_INFINITY) || compareSessionTime(left, right);
}

function compareSessionTime(left: PublicSessionDto, right: PublicSessionDto): number {
  const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : Number.POSITIVE_INFINITY - 1;
  const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : Number.POSITIVE_INFINITY - 1;
  return leftTime - rightTime || left.title.localeCompare(right.title, 'ru');
}

function matchesDate(session: PublicSessionDto, value: string): boolean {
  if (!session.startsAt) return ['today', 'tomorrow', 'weekend'].includes(value);
  const date = new Date(session.startsAt);
  const today = startOfDay(new Date());
  const eventDay = startOfDay(date);
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
  if (value === 'today') return diffDays === 0;
  if (value === 'tomorrow') return diffDays === 1;
  if (value === 'weekend') return date.getDay() === 0 || date.getDay() === 6;
  if (value === 'evening') return session.timeBucket === 'evening' || session.timeBucket === 'night';
  return true;
}

function matchesDateRange(startsAt: string, from?: string, to?: string): boolean {
  if (!startsAt) return !from && !to;
  const timestamp = new Date(startsAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  if (from && timestamp < new Date(from).getTime()) return false;
  if (to && timestamp > new Date(to).getTime() + 86399999) return false;
  return true;
}

function countValues(values: string[]): Array<{ name: string; events: number }> {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = String(raw || '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, events]) => ({ name, events }))
    .sort((left, right) => right.events - left.events || left.name.localeCompare(right.name, 'ru'));
}

function buildPriceSteps(sessions: PublicSessionDto[]): number[] {
  const maxPrice = Math.max(...sessions.map((session) => session.priceFrom || 0));
  const steps = [500, 1000, 1500, 2000, 3000, 5000].filter((step) => step <= maxPrice);
  return steps.length ? steps : [1000, 2000, 3000];
}

function landingSlugsForEvent(input: { title: string; category: string; tags: string[]; subcategories: string[] }): string[] {
  const text = [input.title, input.category, ...input.tags, ...input.subcategories].join(' ').toLowerCase();
  const slugs: string[] = [];
  if (/теплоход|речн|канал|нева|мост|круиз|водн/.test(text)) slugs.push('river-cruises');
  if (/автобус|обзорн/.test(text)) slugs.push('bus-tours');
  if (/салют|9\s*мая|день побед/.test(text)) slugs.push('salute-9-may');
  if (/ужин|вечерин|дискотек|банкет|ресторан/.test(text)) slugs.push('river-party');
  return [...new Set(slugs)];
}

export function landingTitle(slug: string): string {
  const titles: Record<string, string> = {
    'river-cruises': 'Речные прогулки',
    'bus-tours': 'Автобусные экскурсии',
    'salute-9-may': 'Салют 9 мая',
    'river-party': 'Праздники на теплоходе',
  };
  return titles[slug] || slug.replace(/-/g, ' ');
}

function isOpenDate(event: EventRow): boolean {
  return event.kind === 'OPEN_DATE' || event.sourceStatus === 'open_date';
}

export function formatDate(value: string): string {
  if (!value) return 'Открытая дата';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: SITE_TIME_ZONE,
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  if (!value) return 'В виджете';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SITE_TIME_ZONE,
  }).format(new Date(value));
}

export function timeBucket(value: string): PublicSessionDto['timeBucket'] {
  if (!value) return 'day';
  const hour = Number(new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    hour12: false,
    timeZone: SITE_TIME_ZONE,
  }).format(new Date(value)));
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  if (hour < 23) return 'evening';
  return 'night';
}

export function publicSlug(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

export function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeGroupPart(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function textParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value ? value : undefined;
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const value = Number(params.get(key));
  return Number.isFinite(value) ? value : undefined;
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(Number(value))));
}

function isPresentNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function countUnique(values: string[]): number {
  return new Set(values.filter(Boolean)).size;
}
