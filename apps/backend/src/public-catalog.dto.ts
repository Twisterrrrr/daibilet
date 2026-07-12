import { CATALOG_PAGE_SIZE_DEFAULT, CATALOG_PAGE_SIZE_MAX } from '@daibilet/contracts/catalog';
import { Prisma, prisma } from '../../../packages/db/src/client.ts';
import {
  ACTIVE_SESSION_SQL,
  isSaleableForPublicCatalog,
} from './catalog-availability.js';
import {
  dedupeCrossSourceCatalogSessions,
  mapGroupedPublicSession,
  pickCatalogSubcategories,
  regroupMappedPublicCatalogSessions,
  sessionHasCoverImage,
} from './dto.js';
import { findLandingRule } from './landing-rules.js';
import type { PublicCatalogMappingRow } from './public-catalog.mapper.js';
import type { PublicCatalogDto, PublicSessionDto } from './types/public.js';
import type { PublicCatalogQuery } from './types/schemas.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_CATALOG_CACHE_MS = 5 * 60 * 1000;

/** Keep in sync with catalogGroupTitleSqlExpression() in dto.js */
const CATALOG_GROUP_TITLE_SQL = `regexp_replace(
  regexp_replace(
    regexp_replace(
      trim(coalesce(nullif(trim("overrideTitle"), ''), title, '')),
      '^\\\\d{1,2}[./]\\\\d{1,2}(?:[./]\\\\d{2,4})?(?:\\\\s*(?:,\\\\s*|\\\\s+в\\\\s+))?\\\\d{1,2}:\\\\d{2}.*',
      '',
      'i'
    ),
    '\\\\s*\\\\([^)]+\\\\)\\\\s*$',
    '',
    'g'
  ),
  '\\\\s+', ' ', 'g'
)`;

type PublicCatalogRow = PublicCatalogMappingRow;

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
  const coverSessions = sessions.filter(sessionHasCoverImage);
  const facets = buildCatalogFacets(coverSessions);
  const filtered = coverSessions.filter((session) => matchesCatalogQuery(session, query));
  const sorted = sortCatalogSessions(filtered, query.sort || 'time');
  const limit = clampNumber(query.limit, 1, CATALOG_PAGE_SIZE_MAX, CATALOG_PAGE_SIZE_DEFAULT);
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

export async function getPublicCatalogSessions(forceRefresh = false): Promise<PublicSessionDto[]> {
  const now = Date.now();
  if (!forceRefresh && catalogCache && catalogCache.expiresAt > now) return catalogCache.sessions;
  if (!forceRefresh && catalogBuildPromise) return catalogBuildPromise;

  if (forceRefresh) clearPublicCatalogDtoCache();

  const buildPromise = Promise.all([loadPublicCatalogRows(), loadPinnedEventIds()]).then(([rows, pinnedEventIds]) => {
    const sessions = filterCatalogSessions(
      dedupeCrossSourceCatalogSessions(
        regroupMappedPublicCatalogSessions(
          rows.map((row) => mapGroupedPublicSession(row, pinnedEventIds)),
        ),
      ),
    );
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

async function loadPinnedEventIds(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ eventId: string }>>(Prisma.sql`
    select distinct "eventId"
    from "LandingMatch"
    where coalesce(reasons->>'manualStatus', '') = 'PINNED'
  `);
  return new Set(rows.map((row) => row.eventId));
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
    session_identity as (
      select distinct on (link."sessionId")
        link."sessionId",
        link."sourceId",
        link."externalId" as "providerSessionId",
        nullif(link."externalParentId", '') as "providerEventId",
        link."sourceUrl"
      from "ProviderLink" link
      where link."entityKind" = 'SESSION'
        and link."sessionId" is not null
      order by link."sessionId", link."updatedAt" desc, link.id desc
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
        event.description,
        event.kind,
        event."sourceStatus",
        event."ageLimit",
        event."imageUrl",
        event."priceFromRub",
        event."ticketsVacant",
        category.title as category,
        city.id as "cityId",
        city.title as city,
        city.slug as "citySlug",
        city."heroImageUrl" as "cityHeroImageUrl",
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.slug as "venueSlug",
        venue.title as venue,
        venue.address as "venueAddress",
        venue."heroImageUrl" as "venueHeroImageUrl",
        venue.kind as "venueKind",
        override.title as "overrideTitle",
        override.description as "overrideDescription",
        override."shortDescription" as "overrideShortDescription",
        override."imageUrl" as "overrideImageUrl",
        primary_offer."sourceCode" as "offerSourceCode",
        primary_offer.title as "offerTitle",
        primary_offer."priceRub" as "offerPriceRub",
        primary_offer."widgetUrl" as "offerWidgetUrl",
        primary_offer."deeplinkUrl" as "offerDeeplinkUrl",
        min(session."startsAt") filter (where ${Prisma.raw(ACTIVE_SESSION_SQL)}) as "startsAt",
        min(session."priceFromRub") filter (
          where ${Prisma.raw(ACTIVE_SESSION_SQL)}
            and session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "sessionPriceFromRub",
        max(session."priceFromRub") filter (
          where ${Prisma.raw(ACTIVE_SESSION_SQL)}
            and session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "sessionPriceToRub",
        (
          select max(offer."priceRub")
          from "EventOffer" offer
          where offer."eventId" = event.id
            and offer.active = true
            and offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "offerPriceMaxRub",
        count(distinct session.id) filter (where ${Prisma.raw(ACTIVE_SESSION_SQL)})::int as "slotCount",
        (
          select coalesce(array_agg(title order by priority, title), '{}')
          from (
            select distinct ordered_tag.title,
              case
                when ordered_tag.title in (
                  'Речные прогулки', 'Экскурсии', 'Водные экскурсии', 'Автобусные туры',
                  'Автобусные экскурсии', 'Смотровые площадки', 'Банкеты', 'Разводные мосты', 'Ночные'
                ) then 1
                when ordered_tag.title ~* '^(Теплоход|Площадка):' then 2
                when ordered_tag.title ~ '^\\d+\\s*(минут|мин\\.?|час|часа|часов)\\s*$' then 3
                else 4
              end as priority
            from "EventTag" ordered_event_tag
            join "Tag" ordered_tag on ordered_tag.id = ordered_event_tag."tagId"
            where ordered_event_tag."eventId" = event.id
          ) ordered_tags
        ) as tags,
        (
          select coalesce(array_agg(distinct subcategory_title), '{}')
          from (
            select subcategory.title as subcategory_title
            from "EventSubcategory" event_subcategory
            join "Subcategory" subcategory on subcategory.id = event_subcategory."subcategoryId"
            where event_subcategory."eventId" = event.id
            union
            select subcategory.title
            from "Subcategory" subcategory
            where subcategory.id = event."primarySubcategoryId"
          ) event_subcategories
        ) as subcategories
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
      where event.status not in ('HIDDEN', 'DRAFT')
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
        city."heroImageUrl",
        city."isDestination",
        region.id,
        region.slug,
        region.title,
        venue.id,
        venue.slug,
        venue.title,
        venue.address,
        venue."heroImageUrl",
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
          select max(price)
          from (
            values ("priceFromRub"), ("sessionPriceFromRub"), ("sessionPriceToRub"), ("offerPriceRub"), ("offerPriceMaxRub")
          ) as prices(price)
          where price is not null and price >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "priceTo",
        (
          (
            "offerWidgetUrl" is not null
            or "offerDeeplinkUrl" is not null
            or (
              coalesce("sourceCode"::text, "offerSourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
              and "externalId" is not null
            )
          )
          and (
            coalesce("slotCount", 0) > 0
            or kind = 'OPEN_DATE'
            or "sourceStatus" = 'open_date'
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
          lower(regexp_replace(trim(coalesce(
            nullif(trim(${Prisma.raw(CATALOG_GROUP_TITLE_SQL)}), ''),
            trim(coalesce(venue, ''))
          )), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce(venue, '')), '\\s+', ' ', 'g'))
        ) as "groupKey"
      from normalized
      where "priceFrom" >= ${MIN_DISPLAY_PRICE_RUB}
        and "purchaseReady" = true
        and lower(coalesce("sourceStatus", '')) not in ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden')
        and (
          "startsAt" is not null
          or kind = 'OPEN_DATE'
          or "sourceStatus" = 'open_date'
        )
    ),
    ranked as (
      select
        *,
        row_number() over (
          partition by "groupKey"
          order by case when lower(coalesce("sourceStatus", '')) in ('paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden') then 1 else 0 end,
            case when kind = 'OPEN_DATE' or "sourceStatus" = 'open_date' then 1 else 0 end desc,
            "startsAt" asc nulls last,
            title asc
        ) as rank
      from saleable
    ),
    grouped as (
      select
        "groupKey",
        array_agg(id order by "startsAt" asc nulls last)::text[] as "groupEventIds",
        count(*)::int as "groupedEventsCount",
        sum(coalesce("slotCount", 0))::int as "sessionCount",
        min("priceFrom")::int as "priceFrom",
        max("priceTo")::int as "priceTo",
        nullif(sum(coalesce("ticketsVacant", 0)), 0)::int as vacant,
        jsonb_agg(
          jsonb_build_object(
            'eventId', id,
            'startsAt', "startsAt",
            'externalId', "externalId",
            'sourceCode', "sourceCode",
            'sourceStatus', "sourceStatus",
            'offerSourceCode', "offerSourceCode",
            'offerWidgetUrl', "offerWidgetUrl",
            'offerDeeplinkUrl', "offerDeeplinkUrl",
            'vacant', "ticketsVacant"
          )
          order by case when lower(coalesce("sourceStatus", '')) in ('paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden') then 1 else 0 end,
            "startsAt" asc nulls last
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
      representative.description,
      representative.kind,
      representative."sourceStatus",
      representative."ageLimit",
      representative."imageUrl",
      representative.category,
      representative."cityId",
      representative.city,
      representative."citySlug",
      representative."cityHeroImageUrl",
      representative."cityIsDestination",
      representative."regionId",
      representative."regionSlug",
      representative."regionTitle",
      representative."venueId",
      representative."venueSlug",
      representative.venue,
      representative."venueAddress",
      representative."venueHeroImageUrl",
      representative."venueKind",
      representative."overrideTitle",
      representative."overrideDescription",
      representative."overrideShortDescription",
      representative."overrideImageUrl",
      representative."offerSourceCode",
      representative."offerTitle",
      representative."offerPriceRub",
      representative."offerWidgetUrl",
      representative."offerDeeplinkUrl",
      representative."startsAt",
      representative.tags,
      representative.subcategories,
      grouped."groupKey",
      grouped."groupEventIds",
      grouped."groupedEventsCount",
      grouped."sessionCount",
      grouped."priceFrom",
      grouped."priceTo",
      representative."ticketsVacant" as vacant,
      grouped."upcomingSlots"
    from grouped
    join ranked representative
      on representative."groupKey" = grouped."groupKey"
     and representative.rank = 1
    order by representative."startsAt" asc nulls last, representative.title asc
  `);
}

function matchesCatalogQuery(session: PublicSessionDto, query: PublicCatalogQuery): boolean {
  const destination = query.destination;
  if (destination && destination !== 'all' && session.destination !== destination) return false;
  if (query.city && query.city !== 'all' && session.city !== query.city && session.destination !== query.city) return false;
  if (
    query.category &&
    query.category !== 'all' &&
    session.category !== query.category &&
    !pickCatalogSubcategories(session).includes(query.category)
  ) return false;
  if (query.tag && query.tag !== 'all' && !session.tags.includes(query.tag)) return false;
  if (query.landing && query.landing !== 'all' && !session.landingSlugs.includes(query.landing)) return false;
  if (query.date && query.date !== 'all' && !matchesCatalogDate(session, query.date)) return false;

  const maxPrice = query.maxPrice ?? query.priceMax;
  if (!matchesCatalogPrice(session, query.minPrice, maxPrice)) return false;
  if (query.ageMax != null && query.ageMax >= 0 && !matchesCatalogAgeLimit(session, query.ageMax)) return false;
  if (!matchesDateRange(session.startsAt, query.from, query.to, session)) return false;

  const search = query.q?.trim().toLowerCase();
  if (!search) return true;
  return [session.title, session.city, session.destination, session.venue, session.category, ...(session.subcategories || []), ...session.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(search);
}

function buildCatalogFacets(sessions: PublicSessionDto[]): PublicCatalogDto['facets'] {
  return {
    cities: countCatalogValues(sessions.map((session) => session.destination || session.city))
      .filter(([name, events]) => name !== 'Не указан' && events >= 1)
      .map(([name, events]) => ({ name, events })),
    categories: countCatalogValues(sessions.map((session) => session.category))
      .map(([name, events]) => ({ name, events })),
    subcategories: countCatalogValues(sessions.flatMap((session) => pickCatalogSubcategories(session, 8)))
      .filter(([name]) => name.length <= 32)
      .slice(0, 24)
      .map(([name, events]) => ({ name, events })),
    landings: countCatalogValues(sessions.flatMap((session) => session.landingSlugs))
      .map(([slug, events]) => {
        const rule = findLandingRule(slug);
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
  const leftOpen = isOpenDateSession(left) && !left.startsAt;
  const rightOpen = isOpenDateSession(right) && !right.startsAt;
  const leftTime = leftOpen ? Number.MAX_SAFE_INTEGER - 1 : left.startsAt ? new Date(left.startsAt).getTime() : Number.POSITIVE_INFINITY;
  const rightTime = rightOpen ? Number.MAX_SAFE_INTEGER - 1 : right.startsAt ? new Date(right.startsAt).getTime() : Number.POSITIVE_INFINITY;
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
  if (dateFilter === 'all') return true;
  if (isOpenDateSession(session)) {
    return dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'weekend';
  }
  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return false;

  const today = startOfLocalDay(new Date());
  const eventDay = startOfLocalDay(startsAt);
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);

  if (dateFilter === 'today') return diffDays === 0;
  if (dateFilter === 'tomorrow') return diffDays === 1;
  if (dateFilter === 'weekend') return startsAt.getDay() === 0 || startsAt.getDay() === 6;
  if (dateFilter === 'evening') return session.timeBucket === 'evening' || session.timeBucket === 'night';
  return true;
}

function matchesCatalogPrice(
  session: PublicSessionDto,
  minPrice?: number,
  maxPrice?: number,
): boolean {
  const price = session.priceFrom;
  const wantsFree = minPrice === 0 && maxPrice === 0;
  if (wantsFree) return !Number.isFinite(price) || Number(price) <= 0;
  if (minPrice != null && minPrice > 0 && (!Number.isFinite(price) || Number(price) < minPrice)) return false;
  if (maxPrice != null && maxPrice > 0 && (!Number.isFinite(price) || Number(price) > maxPrice)) return false;
  return true;
}

function parseCatalogAgeLimit(value?: string | null): number | null {
  if (!value) return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const age = Number(match[0]);
  return Number.isFinite(age) ? age : null;
}

function matchesCatalogAgeLimit(session: PublicSessionDto, ageMax: number): boolean {
  const limit = parseCatalogAgeLimit(session.ageLimit);
  if (limit == null) return true;
  return limit <= ageMax;
}

function matchesDateRange(
  startsAt: string,
  from?: string,
  to?: string,
  session?: PublicSessionDto,
): boolean {
  if (session && isOpenDateSession(session)) return true;
  const timestamp = new Date(startsAt).getTime();
  if (!Number.isFinite(timestamp)) return !from && !to;

  const fromTime = from ? new Date(from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  return (!Number.isFinite(fromTime) || timestamp >= fromTime) && (!Number.isFinite(toTime) || timestamp <= toTime);
}

function isOpenDateSession(session: PublicSessionDto): boolean {
  return String(session.kind || '').toUpperCase() === 'OPEN_DATE' ||
    String(session.sourceStatus || '').toLowerCase() === 'open_date';
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

function filterCatalogSessions(sessions: PublicSessionDto[]): PublicSessionDto[] {
  return sessions.filter((session) =>
    isSaleableForPublicCatalog({
      kind: session.kind,
      sourceStatus: session.sourceStatus,
      startsAt: session.startsAt || session.upcomingSlots?.[0]?.startsAt || null,
      purchaseReady: session.purchaseReady,
      priceFrom: session.priceFrom,
    }),
  );
}
