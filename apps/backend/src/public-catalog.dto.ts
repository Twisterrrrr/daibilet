import { Prisma, prisma } from '../../../packages/db/src/client.ts';
import { LANDING_RULES, mapGroupedPublicSession } from './dto.js';
import type { PublicCatalogDto, PublicSessionDto } from './types/public.js';
import type { PublicCatalogQuery } from './types/schemas.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_CATALOG_CACHE_MS = 5 * 60 * 1000;

interface PublicCatalogRow {
  id: string;
  slug: string;
  externalId: string | null;
  sourceCode: string | null;
  sourceName: string | null;
  sourceLabel: string;
  title: string;
  kind: string;
  imageUrl: string | null;
  category: string | null;
  cityId: string | null;
  city: string | null;
  citySlug: string | null;
  cityIsDestination: boolean | null;
  regionId: string | null;
  regionSlug: string | null;
  regionTitle: string | null;
  venueId: string | null;
  venueSlug: string | null;
  venue: string | null;
  venueKind: string | null;
  overrideTitle: string | null;
  overrideImageUrl: string | null;
  offerSourceCode: string | null;
  offerTitle: string | null;
  offerPriceRub: number | null;
  offerWidgetUrl: string | null;
  offerDeeplinkUrl: string | null;
  startsAt: Date;
  tags: string[];
  groupKey: string;
  groupEventIds: string[];
  groupedEventsCount: number;
  sessionCount: number;
  priceFrom: number;
  vacant: number | null;
  upcomingSlots: unknown;
}

interface CatalogCache {
  expiresAt: number;
  sessions: PublicSessionDto[];
}

let catalogCache: CatalogCache | null = null;
let catalogBuildPromise: Promise<PublicSessionDto[]> | null = null;

export function clearPublicCatalogDtoCache(): void {
  catalogCache = null;
  catalogBuildPromise = null;
}

export async function buildPublicCatalogDto(query: PublicCatalogQuery): Promise<PublicCatalogDto> {
  const sessions = await getPublicCatalogSessions(query.refresh === 1);
  const facets = buildCatalogFacets(sessions);
  const filtered = sessions.filter((session) => matchesCatalogQuery(session, query));
  const sorted = sortCatalogSessions(filtered, query.sort || 'time');
  const limit = clampNumber(query.limit, 1, 240, 120);
  const offset = clampNumber(query.offset, 0, 100000, 0);
  const items = sorted.slice(offset, offset + limit);

  return {
    generatedAt: new Date().toISOString(),
    total: sorted.length,
    offset,
    limit,
    hasMore: offset + items.length < sorted.length,
    items,
    facets,
  };
}

async function getPublicCatalogSessions(forceRefresh: boolean): Promise<PublicSessionDto[]> {
  const now = Date.now();
  if (!forceRefresh && catalogCache && catalogCache.expiresAt > now) return catalogCache.sessions;
  if (!forceRefresh && catalogBuildPromise) return catalogBuildPromise;

  if (forceRefresh) clearPublicCatalogDtoCache();

  const buildPromise = loadPublicCatalogRows().then((rows) => {
    const sessions = rows.map(mapPublicCatalogRow);
    catalogCache = {
      expiresAt: Date.now() + PUBLIC_CATALOG_CACHE_MS,
      sessions,
    };
    return sessions;
  });

  catalogBuildPromise = buildPromise;
  try {
    return await buildPromise;
  } finally {
    if (catalogBuildPromise === buildPromise) catalogBuildPromise = null;
  }
}

async function loadPublicCatalogRows(): Promise<PublicCatalogRow[]> {
  return prisma.$queryRaw<PublicCatalogRow[]>(Prisma.sql`
    with event_identity as (
      select distinct on (identity."eventId")
        identity."eventId",
        identity."sourceId",
        identity."externalId",
        identity."sourceUrl"
      from (
        select
          link."eventId",
          link."sourceId",
          link."externalId",
          link."sourceUrl",
          link."updatedAt",
          0 as priority
        from "ProviderLink" link
        where link."entityKind" = 'EVENT'
          and link."eventId" is not null

        union all

        select
          link."eventId",
          link."sourceId",
          link."externalId",
          link."sourceUrl",
          link."updatedAt",
          1 as priority
        from "EventSourceLink" link
      ) identity
      order by identity."eventId", identity.priority, identity."updatedAt" desc
    ),
    primary_offer as (
      select distinct on (offer."eventId")
        offer."eventId",
        offer."sourceCode",
        offer.title,
        offer."priceRub",
        offer."widgetUrl",
        offer."deeplinkUrl"
      from "EventOffer" offer
      where offer.active = true
      order by offer."eventId", (offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB}) desc nulls last, offer."priceRub" asc nulls last
    ),
    event_base as (
      select
        event.id,
        event.slug,
        identity."externalId",
        source.code as "sourceCode",
        source.name as "sourceName",
        coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as "sourceLabel",
        event.title,
        event.kind,
        event."imageUrl",
        event."priceFromRub",
        event."ticketsVacant",
        category.title as category,
        city.id as "cityId",
        city.title as city,
        city.slug as "citySlug",
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.slug as "venueSlug",
        venue.title as venue,
        venue.kind as "venueKind",
        override.title as "overrideTitle",
        override."imageUrl" as "overrideImageUrl",
        primary_offer."sourceCode" as "offerSourceCode",
        primary_offer.title as "offerTitle",
        primary_offer."priceRub" as "offerPriceRub",
        primary_offer."widgetUrl" as "offerWidgetUrl",
        primary_offer."deeplinkUrl" as "offerDeeplinkUrl",
        min(session."startsAt") filter (where session."startsAt" >= now()) as "startsAt",
        min(session."priceFromRub") filter (
          where session."startsAt" >= now()
            and session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "sessionPriceFromRub",
        count(distinct session.id) filter (where session."startsAt" >= now())::int as "slotCount",
        coalesce(array_remove(array_agg(distinct tag.title), null), '{}') as tags
      from "Event" event
      left join "Category" category on category.id = event."categoryId"
      left join "City" city on city.id = event."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = event."venueId"
      left join event_identity identity on identity."eventId" = event.id
      left join "Source" source on source.id = identity."sourceId"
      left join "EventOverride" override on override."eventId" = event.id
      left join "EventSession" session on session."eventId" = event.id
      left join primary_offer on primary_offer."eventId" = event.id
      left join "EventTag" event_tag on event_tag."eventId" = event.id
      left join "Tag" tag on tag.id = event_tag."tagId"
      group by
        event.id,
        identity."externalId",
        source.code,
        source.name,
        override.id,
        category.title,
        city.id,
        city.title,
        city.slug,
        city."isDestination",
        region.id,
        region.slug,
        region.title,
        venue.id,
        venue.slug,
        venue.title,
        venue.kind,
        primary_offer."sourceCode",
        primary_offer.title,
        primary_offer."priceRub",
        primary_offer."widgetUrl",
        primary_offer."deeplinkUrl"
    ),
    normalized as (
      select
        *,
        (
          select min(price)
          from (values ("priceFromRub"), ("sessionPriceFromRub"), ("offerPriceRub")) as prices(price)
          where price is not null and price >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "priceFrom",
        (
          "offerWidgetUrl" is not null
          or "offerDeeplinkUrl" is not null
          or (
            coalesce("sourceCode"::text, "offerSourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
            and "externalId" is not null
          )
        ) as "purchaseReady"
      from event_base
    ),
    saleable as (
      select
        *,
        concat_ws(
          '|',
          lower(regexp_replace(trim(coalesce("sourceLabel", '')), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce(title, '')), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce("venueId", venue, '')), '\\s+', ' ', 'g'))
        ) as "groupKey"
      from normalized
      where "startsAt" is not null
        and "priceFrom" >= ${MIN_DISPLAY_PRICE_RUB}
        and "purchaseReady" = true
    ),
    ranked as (
      select
        *,
        row_number() over (partition by "groupKey" order by "startsAt" asc nulls last, title asc) as rank
      from saleable
    ),
    grouped as (
      select
        "groupKey",
        array_agg(id order by "startsAt" asc nulls last)::text[] as "groupEventIds",
        count(*)::int as "groupedEventsCount",
        sum(coalesce("slotCount", 0))::int as "sessionCount",
        min("priceFrom")::int as "priceFrom",
        nullif(sum(coalesce("ticketsVacant", 0)), 0)::int as vacant,
        jsonb_agg(
          jsonb_build_object(
            'eventId', id,
            'startsAt', "startsAt",
            'externalId', "externalId",
            'sourceCode', "sourceCode",
            'offerSourceCode', "offerSourceCode",
            'offerWidgetUrl', "offerWidgetUrl",
            'offerDeeplinkUrl', "offerDeeplinkUrl"
          )
          order by "startsAt" asc nulls last
        ) as "upcomingSlots"
      from ranked
      group by "groupKey"
    )
    select
      representative.id,
      representative.slug,
      representative."externalId",
      representative."sourceCode",
      representative."sourceName",
      representative."sourceLabel",
      representative.title,
      representative.kind,
      representative."imageUrl",
      representative.category,
      representative."cityId",
      representative.city,
      representative."citySlug",
      representative."cityIsDestination",
      representative."regionId",
      representative."regionSlug",
      representative."regionTitle",
      representative."venueId",
      representative."venueSlug",
      representative.venue,
      representative."venueKind",
      representative."overrideTitle",
      representative."overrideImageUrl",
      representative."offerSourceCode",
      representative."offerTitle",
      representative."offerPriceRub",
      representative."offerWidgetUrl",
      representative."offerDeeplinkUrl",
      representative."startsAt",
      representative.tags,
      grouped."groupKey",
      grouped."groupEventIds",
      grouped."groupedEventsCount",
      grouped."sessionCount",
      grouped."priceFrom",
      grouped.vacant,
      grouped."upcomingSlots"
    from grouped
    join ranked representative
      on representative."groupKey" = grouped."groupKey"
     and representative.rank = 1
    order by representative."startsAt" asc nulls last, representative.title asc
  `);
}

function mapPublicCatalogRow(row: PublicCatalogRow): PublicSessionDto {
  const mapped = mapGroupedPublicSession(row) as PublicSessionDto;
  return {
    ...mapped,
    startsAt: toIsoString(mapped.startsAt),
    upcomingSlots: (mapped.upcomingSlots || []).map((slot) => ({
      ...slot,
      startsAt: toIsoString(slot.startsAt),
    })),
  };
}

function matchesCatalogQuery(session: PublicSessionDto, query: PublicCatalogQuery): boolean {
  const destination = query.destination;
  if (destination && destination !== 'all' && session.destination !== destination) return false;
  if (query.city && query.city !== 'all' && session.city !== query.city && session.destination !== query.city) return false;
  if (
    query.category &&
    query.category !== 'all' &&
    session.category !== query.category &&
    !session.tags.includes(query.category)
  ) return false;
  if (query.tag && query.tag !== 'all' && !session.tags.includes(query.tag)) return false;
  if (query.landing && query.landing !== 'all' && !session.landingSlugs.includes(query.landing)) return false;
  if (query.date && query.date !== 'all' && !matchesCatalogDate(session, query.date)) return false;

  const maxPrice = query.maxPrice ?? query.priceMax;
  if (maxPrice && (!session.priceFrom || session.priceFrom > maxPrice)) return false;
  if (!matchesDateRange(session.startsAt, query.from, query.to)) return false;

  const search = query.q?.trim().toLowerCase();
  if (!search) return true;
  return [session.title, session.city, session.destination, session.venue, session.category, ...session.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(search);
}

function buildCatalogFacets(sessions: PublicSessionDto[]): PublicCatalogDto['facets'] {
  return {
    cities: countCatalogValues(sessions.map((session) => session.destination || session.city))
      .filter(([name, events]) => name !== 'Не указан' && events >= 2)
      .map(([name, events]) => ({ name, events })),
    categories: countCatalogValues(sessions.map((session) => session.category))
      .map(([name, events]) => ({ name, events })),
    tags: countCatalogValues(sessions.flatMap((session) => session.tags))
      .filter(([name]) => name.length <= 32)
      .slice(0, 24)
      .map(([name, events]) => ({ name, events })),
    landings: countCatalogValues(sessions.flatMap((session) => session.landingSlugs))
      .map(([slug, events]) => {
        const rule = (LANDING_RULES as Array<{ slug: string; title: string }>).find((item) => item.slug === slug);
        return { slug, title: rule?.title || humanizeSlug(slug), events };
      }),
    priceSteps: buildCatalogPriceSteps(sessions),
  };
}

function sortCatalogSessions(sessions: PublicSessionDto[], sort: NonNullable<PublicCatalogQuery['sort']>): PublicSessionDto[] {
  const sorted = [...sessions];
  if (sort === 'price' || sort === 'price_asc') {
    return sorted.sort((left, right) => comparePrice(left, right) || compareSessionTime(left, right));
  }
  if (sort === 'price_desc') {
    return sorted.sort((left, right) => comparePrice(right, left) || compareSessionTime(left, right));
  }
  if (sort === 'popular') {
    return sorted.sort((left, right) => (right.sessionCount || 1) - (left.sessionCount || 1) || compareSessionTime(left, right));
  }
  return sorted.sort(compareSessionTime);
}

function comparePrice(left: PublicSessionDto, right: PublicSessionDto): number {
  const leftPrice = Number.isFinite(left.priceFrom) ? Number(left.priceFrom) : Number.POSITIVE_INFINITY;
  const rightPrice = Number.isFinite(right.priceFrom) ? Number(right.priceFrom) : Number.POSITIVE_INFINITY;
  return leftPrice - rightPrice;
}

function compareSessionTime(left: PublicSessionDto, right: PublicSessionDto): number {
  const leftTime = new Date(left.startsAt).getTime();
  const rightTime = new Date(right.startsAt).getTime();
  return leftTime - rightTime || left.title.localeCompare(right.title, 'ru');
}

function countCatalogValues(values: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ru'));
}

function buildCatalogPriceSteps(sessions: PublicSessionDto[]): number[] {
  const prices = sessions
    .map((session) => session.priceFrom)
    .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB)
    .sort((left, right) => left - right);
  const maxPrice = prices.at(-1);
  const candidates = [500, 1000, 1500, 2000, 3000, 5000].filter((price) => maxPrice != null && price <= maxPrice);
  return candidates.length ? candidates : [1000, 2000, 3000];
}

function matchesCatalogDate(session: PublicSessionDto, dateFilter: string): boolean {
  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return dateFilter === 'all';

  const today = startOfLocalDay(new Date());
  const eventDay = startOfLocalDay(startsAt);
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);

  if (dateFilter === 'today') return diffDays === 0;
  if (dateFilter === 'tomorrow') return diffDays === 1;
  if (dateFilter === 'weekend') return startsAt.getDay() === 0 || startsAt.getDay() === 6;
  if (dateFilter === 'evening') return session.timeBucket === 'evening' || session.timeBucket === 'night';
  return true;
}

function matchesDateRange(startsAt: string, from?: string, to?: string): boolean {
  const timestamp = new Date(startsAt).getTime();
  if (!Number.isFinite(timestamp)) return false;

  const fromTime = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  return (!Number.isFinite(fromTime) || timestamp >= fromTime) && (!Number.isFinite(toTime) || timestamp <= toTime);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(Number(value))));
}

function toIsoString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}
