import { Prisma, prisma } from '@daibilet/db';
import type {
  AdminDashboardDto,
  AdminDashboardLaunchMetrics,
  AdminDashboardMetrics,
} from '@daibilet/contracts/admin';
import { LANDING_RULES, matchingLandingSlugs } from './landing-rules.js';
import { buildPublicDestinationsDto } from './public-city.dto.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const ADMIN_DASHBOARD_CACHE_MS = 60 * 1000;

let dashboardCache: { expiresAt: number; payload: AdminDashboardDto } | null = null;
let dashboardBuild: Promise<AdminDashboardDto> | null = null;

export interface DashboardGroupRow {
  groupKey: string;
  sourceCode: string;
  title: string;
  city: string | null;
  venue: string | null;
  category: string | null;
  priceFromRub: number | null;
  nextStartsAt: Date | null;
  anyFuture: boolean;
  allFuture: boolean;
  anyOffers: boolean;
  allOffers: boolean;
  anyExplicitPurchase: boolean;
  allExplicitPurchase: boolean;
  anyPurchaseIdentity: boolean;
  allPurchasePotential: boolean;
  allPrice: boolean;
  allCategory: boolean;
  allSubcategory: boolean;
  allVenue: boolean;
  allDescription: boolean;
  anyImage: boolean;
  allImage: boolean;
  allStatusReady: boolean;
  tags: string[] | null;
  subcategories: string[] | null;
}

interface DashboardRuntimeConfig {
  ticketscloudWidgetConfigured: boolean;
  teplohodWidgetConfigured: boolean;
}

export function clearAdminDashboardDtoCache(): void {
  dashboardCache = null;
  dashboardBuild = null;
}

export async function buildAdminDashboardDto(
  forceRefresh = false,
  now = new Date(),
): Promise<AdminDashboardDto> {
  if (!forceRefresh && dashboardCache && dashboardCache.expiresAt > Date.now()) return dashboardCache.payload;
  if (!forceRefresh && dashboardBuild) return dashboardBuild;
  if (forceRefresh) clearAdminDashboardDtoCache();

  const build = buildAdminDashboardFresh(now);
  dashboardBuild = build;
  try {
    const payload = await build;
    dashboardCache = { expiresAt: Date.now() + ADMIN_DASHBOARD_CACHE_MS, payload };
    return payload;
  } finally {
    if (dashboardBuild === build) dashboardBuild = null;
  }
}

async function buildAdminDashboardFresh(now: Date): Promise<AdminDashboardDto> {
  const [groups, destinations, sourceEvents, sources, venues, cities, categories, tags, orders] = await Promise.all([
    loadDashboardGroups(),
    buildPublicDestinationsDto(),
    prisma.event.count(),
    prisma.source.count(),
    prisma.venue.count(),
    prisma.city.count(),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.externalOrder.count(),
  ]);
  const groupMetrics = mapDashboardGroups(groups, readDashboardRuntimeConfig());

  return {
    generatedAt: now.toISOString(),
    metrics: {
      events: groups.length,
      sourceEvents,
      readyEvents: groupMetrics.readyForSeo,
      reviewEvents: groups.length - groupMetrics.readyForSeo,
      blockedEvents: groupMetrics.blockedEvents,
      sources,
      venues,
      cities,
      categories,
      tags,
      landingRules: LANDING_RULES.length,
      destinations: destinations.destinations.length,
      orders,
      launch: groupMetrics.launch,
    },
  };
}

export function mapDashboardGroups(
  groups: DashboardGroupRow[],
  runtimeConfig: DashboardRuntimeConfig,
): { readyForSeo: number; blockedEvents: number; launch: AdminDashboardLaunchMetrics } {
  let readyForSales = 0;
  let readyForSeo = 0;
  let blockedEvents = 0;
  let priceBlocked = 0;
  let purchaseBlocked = 0;
  let noImage = 0;
  let landingMatched = 0;

  for (const group of groups) {
    const providerConfigured = group.sourceCode === 'TICKETSCLOUD'
      ? runtimeConfig.ticketscloudWidgetConfigured
      : group.sourceCode === 'TEPLOHOD'
        ? runtimeConfig.teplohodWidgetConfigured
        : false;
    const purchaseReady = (
      group.anyExplicitPurchase || (providerConfigured && group.anyPurchaseIdentity)
    );
    const allPurchaseReady = (
      group.allExplicitPurchase || (providerConfigured && group.allPurchasePotential)
    );
    const hasHighIssue = !group.allFuture || !allPurchaseReady || !group.allPrice || !group.allCategory || !group.allVenue;
    const hasMediumIssue = !group.allSubcategory || !group.allDescription || !group.allImage;
    const seoReady = !hasHighIssue && !hasMediumIssue && group.allStatusReady;
    const landings = matchingLandingSlugs({
      title: group.title,
      category: group.category,
      sourceCategory: group.category,
      tags: group.tags || [],
      subcategories: group.subcategories || [],
      venue: group.venue,
      city: group.city,
      destination: group.city,
      startsAt: group.nextStartsAt,
    });

    if (group.anyFuture && purchaseReady && group.priceFromRub != null) readyForSales += 1;
    if (seoReady) readyForSeo += 1;
    if (hasHighIssue) blockedEvents += 1;
    if (group.priceFromRub == null) priceBlocked += 1;
    if (!purchaseReady) purchaseBlocked += 1;
    if (!group.anyImage) noImage += 1;
    if (landings.length) landingMatched += 1;
  }

  return {
    readyForSeo,
    blockedEvents,
    launch: {
      groupedEvents: groups.length,
      readyForSales,
      readyForSeo,
      needsAttention: groups.length - readyForSeo,
      priceBlocked,
      purchaseBlocked,
      noImage,
      landingMatched,
    },
  };
}

async function loadDashboardGroups(): Promise<DashboardGroupRow[]> {
  return prisma.$queryRaw<DashboardGroupRow[]>(Prisma.sql`
    with source_event_candidates as (
      select link."sourceId", link."eventId", link."externalId", 0 as priority
      from "EventSourceLink" link
      union all
      select link."sourceId", link."eventId", link."externalId", 1 as priority
      from "ProviderLink" link
      where link."entityKind"::text = 'EVENT' and link."eventId" is not null
      union all
      select source.id as "sourceId", offer."eventId", null::text as "externalId", 2 as priority
      from "EventOffer" offer
      join "Source" source on source.code::text = offer."sourceCode"::text
    ), source_events as (
      select distinct on (candidate."sourceId", candidate."eventId")
        candidate."sourceId", candidate."eventId", candidate."externalId"
      from source_event_candidates candidate
      order by candidate."sourceId", candidate."eventId", candidate.priority
    ), session_summary as (
      select
        session."eventId",
        bool_or(session."startsAt" >= now() - interval '15 minutes') as "hasFuture",
        min(session."startsAt") filter (where session."startsAt" >= now() - interval '15 minutes') as "nextStartsAt",
        min(session."priceFromRub") filter (where session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB})::int as "priceFromRub"
      from "EventSession" session
      group by session."eventId"
    ), offer_summary as (
      select
        offer."eventId",
        offer."sourceCode"::text as "sourceCode",
        count(*) filter (where offer.active is not false)::int as offers,
        min(offer."priceRub") filter (where offer.active is not false and offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB})::int as "priceFromRub",
        bool_or(offer.active is not false and (offer."widgetUrl" is not null or offer."deeplinkUrl" is not null)) as "explicitPurchase"
      from "EventOffer" offer
      group by offer."eventId", offer."sourceCode"
    ), event_facts as (
      select
        event.id as "eventId",
        source.code::text as "sourceCode",
        concat_ws(
          '|',
          lower(regexp_replace(trim(coalesce(source.name, source.code::text, '')), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce(event.title, '')), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce(city.title, '')), '\\s+', ' ', 'g')),
          lower(regexp_replace(trim(coalesce(event."venueId", venue.title, '')), '\\s+', ' ', 'g'))
        ) as "groupKey",
        event.title,
        city.title as city,
        venue.title as venue,
        category.title as category,
        session_summary."nextStartsAt",
        coalesce(event.kind::text = 'OPEN_DATE' or event."sourceStatus" = 'open_date', false)
          or coalesce(session_summary."hasFuture", false) as "hasFuture",
        coalesce(offer_summary.offers, 0) > 0 as "hasOffers",
        coalesce(offer_summary."explicitPurchase", false) as "explicitPurchase",
        source_events."externalId" is not null as "purchaseIdentity",
        (
          select min(price)::int
          from (values (event."priceFromRub"), (session_summary."priceFromRub"), (offer_summary."priceFromRub")) as prices(price)
          where price >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "priceFromRub",
        event."categoryId" is not null as "hasCategory",
        exists (
          select 1 from "EventSubcategory" relation where relation."eventId" = event.id
        ) or event."primarySubcategoryId" is not null as "hasSubcategory",
        event."venueId" is not null as "hasVenue",
        length(trim(regexp_replace(
          coalesce(override.description, event.description, override."shortDescription", ''),
          '<[^>]+>', ' ', 'g'
        ))) >= 120 as "hasDescription",
        coalesce(override."imageUrl", event."imageUrl") is not null as "hasImage",
        coalesce(override."editorStatus", event.status)::text = 'READY' as "statusReady"
      from source_events
      join "Source" source on source.id = source_events."sourceId"
      join "Event" event on event.id = source_events."eventId"
      left join "City" city on city.id = event."primaryCityId"
      left join "Venue" venue on venue.id = event."venueId"
      left join "Category" category on category.id = event."categoryId"
      left join "EventOverride" override on override."eventId" = event.id
      left join session_summary on session_summary."eventId" = event.id
      left join offer_summary on offer_summary."eventId" = event.id and offer_summary."sourceCode" = source.code::text
    ), group_base as (
      select
        facts."groupKey",
        min(facts."sourceCode") as "sourceCode",
        min(facts.title) as title,
        min(facts.city) as city,
        min(facts.venue) as venue,
        min(facts.category) as category,
        min(facts."priceFromRub") as "priceFromRub",
        min(facts."nextStartsAt") as "nextStartsAt",
        bool_or(facts."hasFuture") as "anyFuture",
        bool_and(facts."hasFuture") as "allFuture",
        bool_or(facts."hasOffers") as "anyOffers",
        bool_and(facts."hasOffers") as "allOffers",
        bool_or(facts."explicitPurchase") as "anyExplicitPurchase",
        bool_and(facts."explicitPurchase") as "allExplicitPurchase",
        bool_or(facts."purchaseIdentity") as "anyPurchaseIdentity",
        bool_and(facts."explicitPurchase" or facts."purchaseIdentity") as "allPurchasePotential",
        bool_and(facts."priceFromRub" is not null) as "allPrice",
        bool_and(facts."hasCategory") as "allCategory",
        bool_and(facts."hasSubcategory") as "allSubcategory",
        bool_and(facts."hasVenue") as "allVenue",
        bool_and(facts."hasDescription") as "allDescription",
        bool_or(facts."hasImage") as "anyImage",
        bool_and(facts."hasImage") as "allImage",
        bool_and(facts."statusReady") as "allStatusReady"
      from event_facts facts
      group by facts."groupKey"
    ), group_tags as (
      select facts."groupKey", array_agg(distinct tag.title order by tag.title) as tags
      from event_facts facts
      join "EventTag" relation on relation."eventId" = facts."eventId"
      join "Tag" tag on tag.id = relation."tagId"
      group by facts."groupKey"
    ), group_subcategories as (
      select facts."groupKey", array_agg(distinct subcategory.title order by subcategory.title) as subcategories
      from event_facts facts
      join "EventSubcategory" relation on relation."eventId" = facts."eventId"
      join "Subcategory" subcategory on subcategory.id = relation."subcategoryId"
      group by facts."groupKey"
    )
    select base.*, tags.tags, subcategories.subcategories
    from group_base base
    left join group_tags tags on tags."groupKey" = base."groupKey"
    left join group_subcategories subcategories on subcategories."groupKey" = base."groupKey"
    order by base."nextStartsAt" asc nulls last, base.title asc
  `);
}

function readDashboardRuntimeConfig(): DashboardRuntimeConfig {
  return {
    ticketscloudWidgetConfigured: Boolean(process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN),
    teplohodWidgetConfigured: Boolean(process.env.TEP_WIDGET_ID || process.env.TEP_WIDGET_BASE_URL),
  };
}
