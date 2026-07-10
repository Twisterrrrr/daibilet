import { Prisma, prisma } from '@daibilet/db';
import { LANDING_RULES } from './landing-rules.js';
import {
  publicDestinationForCity,
  type PublicDestination,
  type PublicDestinationSourceRow,
} from './public-catalog.mapper.js';
import { getPublicCatalogSessions } from './public-catalog.dto.js';
import { buildPublicDestinationsDto } from './public-city.dto.js';
import { buildPublicVenuesDto } from './public-venue.dto.js';
import type {
  PublicHomeDto,
  PublicHomePreviewDto,
  PublicLandingDto,
  PublicSessionDto,
  PublicStatsCounts,
  PublicStatsDto,
} from './types/public.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_HOME_CACHE_MS = 5 * 60 * 1000;
const PUBLIC_HOME_SESSION_LIMIT = 180;
const PUBLIC_HOME_PREVIEW_LIMIT = 96;
const PUBLIC_HOME_VENUE_LIMIT = 36;

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

interface PublicStatsGroupRow extends PublicDestinationSourceRow {
  groupKey: string;
  venueId: string | null;
}

let statsCache: CachedPayload<PublicStatsDto> | null = null;
let statsBuild: Promise<PublicStatsDto> | null = null;
let homeCache: CachedPayload<PublicHomeDto> | null = null;
let homeBuild: Promise<PublicHomeDto> | null = null;
let previewCache: CachedPayload<PublicHomePreviewDto> | null = null;
let previewBuild: Promise<PublicHomePreviewDto> | null = null;

export function clearPublicHomeDtoCache(): void {
  statsCache = null;
  statsBuild = null;
  homeCache = null;
  homeBuild = null;
  previewCache = null;
  previewBuild = null;
}

export async function buildPublicStatsDto(forceRefresh = false): Promise<PublicStatsDto> {
  if (!forceRefresh && statsCache && statsCache.expiresAt > Date.now()) return statsCache.payload;
  if (!forceRefresh && statsBuild) return statsBuild;
  if (forceRefresh) clearPublicHomeDtoCache();

  const build = Promise.all([
    loadPublicStatsGroupRows(),
    prisma.venue.count(),
  ]).then(([rows, venueCount]) => {
    const payload = {
      generatedAt: new Date().toISOString(),
      stats: buildPublicStatsCounts(rows, venueCount, LANDING_RULES.length),
    };
    statsCache = { expiresAt: Date.now() + PUBLIC_HOME_CACHE_MS, payload };
    return payload;
  });

  statsBuild = build;
  try {
    return await build;
  } finally {
    if (statsBuild === build) statsBuild = null;
  }
}

export async function buildPublicHomeDto(forceRefresh = false): Promise<PublicHomeDto> {
  if (!forceRefresh && homeCache && homeCache.expiresAt > Date.now()) return homeCache.payload;
  if (!forceRefresh && homeBuild) return homeBuild;
  if (forceRefresh) clearPublicHomeDtoCache();

  const build = Promise.all([
    buildPublicStatsDto(forceRefresh),
    buildPublicDestinationsDto(forceRefresh),
    getPublicCatalogSessions(forceRefresh),
    buildPublicVenuesDto(forceRefresh),
  ]).then(([stats, destinations, sessions, venues]) => {
    const payload: PublicHomeDto = {
      generatedAt: new Date().toISOString(),
      stats: stats.stats,
      destinations: destinations.destinations,
      landings: buildPublicHomeLandings(sessions),
      sessions: sessions.slice(0, PUBLIC_HOME_SESSION_LIMIT),
      venues: venues.venues.slice(0, PUBLIC_HOME_VENUE_LIMIT),
    };
    homeCache = { expiresAt: Date.now() + PUBLIC_HOME_CACHE_MS, payload };
    return payload;
  });

  homeBuild = build;
  try {
    return await build;
  } finally {
    if (homeBuild === build) homeBuild = null;
  }
}

export async function buildPublicHomePreviewDto(forceRefresh = false): Promise<PublicHomePreviewDto> {
  if (!forceRefresh && previewCache && previewCache.expiresAt > Date.now()) return previewCache.payload;
  if (!forceRefresh && previewBuild) return previewBuild;
  if (forceRefresh) clearPublicHomeDtoCache();

  const build = getPublicCatalogSessions(forceRefresh).then((sessions) => {
    const payload: PublicHomePreviewDto = {
      generatedAt: new Date().toISOString(),
      sessions: sessions.slice(0, PUBLIC_HOME_PREVIEW_LIMIT),
      landings: buildPublicHomeLandings(sessions),
    };
    previewCache = { expiresAt: Date.now() + PUBLIC_HOME_CACHE_MS, payload };
    return payload;
  });

  previewBuild = build;
  try {
    return await build;
  } finally {
    if (previewBuild === build) previewBuild = null;
  }
}

export function buildPublicStatsCounts(
  rows: PublicStatsGroupRow[],
  venueCount: number,
  landingCount: number,
): PublicStatsCounts {
  const buckets = new Map<string, {
    destination: PublicDestination;
    events: number;
    venueIds: Set<string>;
  }>();

  for (const row of rows) {
    const destination = publicDestinationForCity(row);
    if (!destination.name || destination.name === 'Не указан') continue;
    const key = `${destination.type}:${destination.name}`;
    const bucket = buckets.get(key) || {
      destination,
      events: 0,
      venueIds: new Set<string>(),
    };
    bucket.events += 1;
    if (row.venueId) bucket.venueIds.add(row.venueId);
    buckets.set(key, bucket);
  }

  const destinations = [...buckets.values()].filter((bucket) => bucket.events >= 2);
  return {
    events: rows.length,
    destinations: destinations.length,
    cities: destinations.length,
    venues: venueCount,
    landings: landingCount,
  };
}

async function loadPublicStatsGroupRows(): Promise<PublicStatsGroupRow[]> {
  return prisma.$queryRaw<PublicStatsGroupRow[]>(Prisma.sql`
    with event_identity as (
      select distinct on (identity."eventId")
        identity."eventId",
        identity."sourceId",
        identity."externalId"
      from (
        select
          link."eventId",
          link."sourceId",
          link."externalId",
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
        coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as "sourceLabel",
        source.code as "sourceCode",
        primary_offer."sourceCode" as "offerSourceCode",
        identity."externalId",
        event.title,
        event.kind,
        event."sourceStatus",
        event."priceFromRub",
        city.id as "cityId",
        city.title as city,
        city.slug as "citySlug",
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.title as venue,
        min(session."startsAt") filter (where session."startsAt" >= now()) as "startsAt",
        min(session."priceFromRub") filter (
          where session."startsAt" >= now()
            and session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "sessionPriceFromRub",
        min(primary_offer."priceRub") filter (
          where primary_offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "offerPriceRub",
        bool_or(
          primary_offer."widgetUrl" is not null
          or primary_offer."deeplinkUrl" is not null
          or (
            coalesce(source.code::text, primary_offer."sourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
            and identity."externalId" is not null
          )
        ) as "purchaseReady"
      from "Event" event
      left join "City" city on city.id = event."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = event."venueId"
      left join event_identity identity on identity."eventId" = event.id
      left join "Source" source on source.id = identity."sourceId"
      left join "EventSession" session on session."eventId" = event.id
      left join primary_offer on primary_offer."eventId" = event.id
      group by
        event.id,
        identity."externalId",
        source.code,
        source.name,
        primary_offer."sourceCode",
        city.id,
        city.title,
        city.slug,
        city."isDestination",
        region.id,
        region.slug,
        region.title,
        venue.id,
        venue.title
    ),
    normalized as (
      select
        *,
        (
          select min(price)
          from (values ("priceFromRub"), ("sessionPriceFromRub"), ("offerPriceRub")) as prices(price)
          where price is not null and price >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "priceFrom"
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
      where "priceFrom" >= ${MIN_DISPLAY_PRICE_RUB}
        and "purchaseReady" = true
        and (
          "startsAt" is not null
          or kind = 'OPEN_DATE'
          or "sourceStatus" = 'open_date'
          or "sourceCode" = 'TEPLOHOD'
        )
    ),
    ranked as (
      select
        *,
        row_number() over (
          partition by "groupKey"
          order by case when kind = 'OPEN_DATE' or "sourceStatus" = 'open_date' then 1 else 0 end desc,
            "startsAt" asc nulls last,
            title asc
        ) as rank
      from saleable
    )
    select
      "groupKey",
      "cityId",
      city,
      "citySlug",
      "cityIsDestination",
      "regionId",
      "regionSlug",
      "regionTitle",
      "venueId"
    from ranked
    where rank = 1
  `);
}

function buildPublicHomeLandings(sessions: PublicSessionDto[]): PublicLandingDto[] {
  return LANDING_RULES.map((rule) => {
    const matched = sessions.filter((session) => session.landingSlugs.includes(rule.slug));
    const prices = matched
      .map((session) => session.priceFrom)
      .filter((price): price is number => Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB);
    return {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips,
      events: matched.length,
      venues: new Set(matched.map((session) => session.venue).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
    };
  });
}
