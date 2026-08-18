import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizePublicVenueRecord,
  formatBusLocationDisplayName,
  formatPierLocationDisplayName,
  findVenueOverride,
  formatPublicVenueTitle,
} from './venue-normalize.js';
import {
  resolveCityTimeZone,
  resolveSessionTimeZone,
  diffLocalDays,
  isLocalWeekend,
  localHourFromInstant,
  DEFAULT_CITY_TIME_ZONE,
} from './city-timezone.js';
import { loadCityRoutingConfig } from './city-routing-config.js';
import { resolveProjectRoot } from './project-root.js';
import {
  resolveContextInstitutionForEvent,
  resolveContextInstitutionFromTitle,
  shouldResolveInstitutionFromTitle,
} from './event-venue-context.js';
import { formatPublicEventTitle } from './event-title-normalize.ts';
import { toPublicCatalogListItem, toPublicHomeCardSession } from './public-catalog-list-item.ts';
import { enrichBuyerOrdersWithEventLinks } from './buyer-order-event-links.js';
import {
  blogCityDisplayName,
  blogCitySlugAliases,
  canonicalBlogCitySlug,
  isBroadBlogCitySlug,
} from './blog-city-slug.js';
import {
  buildAdminEventGroupKey,
  invalidateAdminEventsSqlReadModelCache,
  queryAdminEventGroupsPage,
  queryAdminLaunchMetricsSql,
} from './admin-events-sql-read-model.js';
import {
  applyVenueEventFacetCounts,
  fetchLeanPublicVenueRows,
  fetchVenueEventFacetCounts,
  fetchVenueHeroImageFallbacks,
} from './public-venue-lean.ts';
import {
  isContentPlaceHubEligible,
  isContentPlaceKind,
} from './public-venue-hub-gate.js';
import {
  ACTIVE_SESSION_SQL,
  MIN_DISPLAY_PRICE_RUB,
  PUBLIC_SALES_BLOCKED_STATUS_SQL,
  hasDisplayPrice,
  hasUpcomingOrOpenSchedule,
  isOpenDateCatalogRow,
  isSaleableEventForPublic,
  isWideLifetimeSession,
} from './catalog-availability.ts';
import {
  SITE_TIME_ZONE,
  formatDate,
  formatTime,
  normalizeStartsAt,
  parseSessionStartsAt,
  timeBucket,
} from './public-datetime.ts';
import { dedupePublicOffers, preferNamedTicketOffers } from './public-offers.ts';

import {
  LANDING_RULES,
  LANDING_SLUG_ALIASES,
  explainLandingRuleMatch,
  matchesLandingRule,
  buildOffSeasonLandingSlugs,
  resolveLandingRuleBySlug,
  sessionMatchesLandingSlug,
} from './landing-rules.ts';
import { pickCatalogSubcategories } from './public-catalog.mapper.ts';
import { buildPublicLandings as buildPublicLandingsFromSessions } from './public-city-landings.ts';
import {
  LANDING_PAGE_SESSION_LIMIT,
  scopePublicCatalogSessions,
  selectLandingPageSessions,
} from './public-landing-page-sessions.ts';
import {
  canonicalSessionPierKey,
  dedupeCrossSourceCatalogSessions,
  isPublicSessionPurchaseBlocked,
  maxNullableNumber,
  minNullableNumber,
  normalizeGroupPart,
  regroupMappedPublicCatalogSessions,
  resolveCatalogDisplayTitle,
  sessionHasCoverImage,
  shouldPromoteGroupedRepresentative,
  sumNullableNumbers,
  uniqueSlots,
  uniqueValues,
  sessionGroupIds,
} from './public-catalog-grouping.ts';
import { mapGroupedPublicSession, collectSeparateCityHubNames } from './public-catalog.mapper.ts';
import {
  buildCityHubSeoTitle,
  buildPublicDestinationRowsFromSessions,
  countDistinctSessionVenues,
  destinationPrepositional,
  isFoldingRegionalTown,
  isSubjectCapitalCity,
  isVisibleOnCitiesCatalog,
  lookupDestinationCatalogSessions,
  matchStandaloneCityBySlug,
  publicDestinationFromSession,
} from './public-destination.ts';
import { dedupePublicVenueLinkedEvents } from './public-venue-linked-events.ts';

import {
  haversineMeters,
  buildPublicVenuePage,
  buildPublicVenuesCatalog,
  publicVenueHubRows,
  resolvePublicVenuesForSessions,
  publicPublishedVenuesByCityId,
  mergeCityPageVenues,
  publicVenues,
  publicVenuesForHome,
  publicVenuesForSessionsFromHub,
  publicVenueRowMatchesCityFilter,
  isPublicVenueHub,
  publicVenuePageTemplate,
  publicVenueSlug,
  resolvePublicVenueCoordinates,
  isPierVenueKind,
  clearPublicVenueReadCache,
  warmPublicVenueCatalogCache,
  loadPublicEventVenueStops,
  canonicalPierLocationKey,
  resolvePublicVenueCity,
  applyPublicVenueNormalization,
  normalizeVenueKindValue,
  INSTITUTION_VENUE_KINDS,
} from './public-venue-read.js';

export {
  haversineMeters,
  buildPublicVenuePage,
  buildPublicVenuesCatalog,
  publicVenueHubRows,
  resolvePublicVenuesForSessions,
  publicPublishedVenuesByCityId,
  mergeCityPageVenues,
  publicVenues,
  publicVenuesForHome,
  publicVenuesForSessionsFromHub,
  publicVenueRowMatchesCityFilter,
  isPublicVenueHub,
  publicVenuePageTemplate,
  publicVenueSlug,
  resolvePublicVenueCoordinates,
  isPierVenueKind,
  clearPublicVenueReadCache,
  warmPublicVenueCatalogCache,
  loadPublicEventVenueStops,
  canonicalPierLocationKey,
};


export { pickCatalogSubcategories };
export {
  dedupeCrossSourceCatalogSessions,
  mapGroupedPublicSession,
  regroupMappedPublicCatalogSessions,
  sessionHasCoverImage,
  buildCityHubSeoTitle,
  buildPublicDestinationRowsFromSessions,
  countDistinctSessionVenues,
  destinationPrepositional,
  isVisibleOnCitiesCatalog,
  lookupDestinationCatalogSessions,
  publicDestinationFromSession,
};

export {
  hasDisplayPrice,
  isSaleableEventForPublic,
  preferNamedTicketOffers,
  dedupePublicOffers,
  normalizeStartsAt,
  formatDate,
  formatTime,
  timeBucket,
  SITE_TIME_ZONE,
};

const PUBLIC_DESTINATION_MIN_EVENTS = 1;
const PUBLIC_CATALOG_CACHE_MS = 5 * 60 * 1000;
/** Stale-while-revalidate window: serve expired catalog instantly, rebuild in background. */
const PUBLIC_CATALOG_STALE_MS = Number(process.env.PUBLIC_CATALOG_STALE_MS || 30 * 60 * 1000);
/**
 * INC.504.5 seam: emergency dto.js SQL must not re-enter under load.
 * Alert P1 on log line containing `legacy inline SQL fallback`.
 */
const LEGACY_CATALOG_SQL_COOLDOWN_MS = Math.max(
  60_000,
  Number(process.env.DAIBILET_LEGACY_CATALOG_SQL_COOLDOWN_MS || 45 * 60 * 1000),
);
let lastLegacyCatalogSqlFallbackAt = 0;
const CATALOG_TAG_DISPLAY_LIMIT = 4;

function orderedEventTagsSql(eventIdSql = 'e.id') {
  return `(
    select coalesce(array_agg(title order by priority, title), '{}')
    from (
      select distinct tag.title,
        case
          when tag.title in (
            'Речные прогулки', 'Экскурсии', 'Водные экскурсии', 'Автобусные туры',
            'Автобусные экскурсии', 'Смотровые площадки', 'Банкеты', 'Разводные мосты', 'Ночные'
          ) then 1
          when tag.title ~* '^(Теплоход|Площадка):' then 2
          when tag.title ~ '^\\d+\\s*(минут|мин\\.?|час|часа|часов)\\s*$' then 3
          else 4
        end as priority
      from "EventTag" event_tag_ordered
      join "Tag" tag on tag.id = event_tag_ordered."tagId"
      where event_tag_ordered."eventId" = ${eventIdSql}
    ) ordered_tags
  )`;
}

function sliceCatalogTags(tags, limit = CATALOG_TAG_DISPLAY_LIMIT) {
  return (tags || []).slice(0, limit);
}
const CITY_CARD_IMAGE_ALIASES = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
  'rostov-na-donu': 'rostov-on-don',
  rostov: 'rostov-on-don',
};
const CITY_CARD_IMAGE_SLUGS = new Set([
  'saint-petersburg',
  'moscow',
  'kazan',
  'kaliningrad',
  'vladivostok',
  'vologda',
  'irkutsk',
  'perm',
  'samara',
  'sochi',
  'ekaterinburg',
  'nizhny-novgorod',
  'novosibirsk',
  'krasnodar',
  'suzdal',
  'veliky-novgorod',
  'voronezh',
  'yaroslavl',
  'krasnoyarsk',
  'omsk',
  'chelyabinsk',
  'rostov-on-don',
  'saratov',
  'tula',
  'tver',
  'tyumen',
  'ufa',
  'ulan-ude',
  'ryazan',
  'stavropol',
  'tomsk',
  'ulyanovsk',
  'izhevsk',
  'orel',
  'orenburg',
  'penza',
  'volgograd',
  'sortavala',
]);
const PROJECT_ROOT = resolveProjectRoot(import.meta.url);
const CITY_ROUTING = loadCityRoutingConfig(import.meta.url);
const STANDALONE_CITY_NAMES = new Set(CITY_ROUTING.standaloneCities || []);
const CITY_TO_REGION = new Map(Object.entries(CITY_ROUTING.cityToRegion || {}));
const FOREIGN_CITY_NAMES = new Set(CITY_ROUTING.foreignCities || []);

function isForeignPublicCity(name) {
  const clean = cleanDisplayName(name);
  return Boolean(clean && FOREIGN_CITY_NAMES.has(clean));
}

function isPublicRegionName(name) {
  const clean = cleanDisplayName(name);
  if (!clean || clean === 'Не указан') return false;
  if (STANDALONE_CITY_NAMES.has(clean)) return false;
  if (FOREIGN_CITY_NAMES.has(clean)) return false;
  // «Республика Татарстан» — префикс (\b с кириллицей в JS ненадёжен).
  // «Чувашская Республика» / «… область|край|округ» — суффикс.
  return /^республика(?:\s|$)/iu.test(clean) || /(?:область|край|республика|округ)$/iu.test(clean);
}

const PUBLIC_REGION_NAMES = new Set([
  ...(CITY_ROUTING.publicRegions || []),
  ...Object.values(CITY_ROUTING.cityToRegion || {}).filter((name) => isPublicRegionName(name)),
]);
let publicHomeCache = null;
let publicDestinationsCache = null;
let publicHomePreviewCache = null;
const PUBLIC_HOME_PREVIEW_LIMIT = 96;
let publicEventRowsCache = null;
let publicCatalogCache = null;
let publicStatsCache = null;
let publicEventRowsBuildPromise = null;
let publicCatalogBuildPromise = null;

const CATEGORY_SUBTITLE = new Map([
  ['Экскурсии', ['экскурсии', 'уточнять по тегам', 'review']],
  ['Музеи и арт', ['музеи и арт', 'музеи / выставки / мастер-классы', 'review']],
  ['Мероприятия', ['мероприятия', 'концерты / шоу / театр', 'auto']],
  ['Активный отдых', ['активный отдых', 'спорт / активности', 'auto']],
  ['Развлечения', ['развлечения', 'детям / зоопарки / шоу', 'review']],
]);

export function clearPublicDataCaches() {
  publicHomeCache = null;
  publicDestinationsCache = null;
  publicHomePreviewCache = null;
  publicEventRowsCache = null;
  // Soft-invalidate catalog: keep last sessions for SWR while rebuild runs.
  if (publicCatalogCache?.sessions) {
    publicCatalogCache = { ...publicCatalogCache, expiresAt: 0 };
  } else {
    publicCatalogCache = null;
  }
  publicStatsCache = null;
  publicEventRowsBuildPromise = null;
  clearPublicVenueReadCache();
}

/** Прогрев тяжёлого каталога и индекса городов (вызывается при старте API). */
export async function warmPublicCatalogCache(db) {
  await publicCatalogSessions(db);
  await warmPublicVenueCatalogCache(db);
}


export async function buildAdminDashboard(db) {
  const [stats, categoryCountResult, destinationCountResult, launchSql] = await Promise.all([
    db.stats(),
    db.query('select count(*)::int as total from "Category"'),
    db.query('select count(*)::int as total from "City" where coalesce("isDestination", false) = true'),
    // SQL group metrics — no full catalog materialization in Node RAM.
    queryAdminLaunchMetricsSql(db),
  ]);

  const launch = {
    ...launchSql,
    source: 'admin_event_groups_sql',
  };
  const destinations = Number(destinationCountResult.rows[0]?.total || 0);
  const readyEvents = Number(launch.readyForSeo || 0);

  // Compact contract only: generatedAt + metrics (no multi-MB row payloads).
  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      events: launch.groupedEvents,
      readyEvents,
      reviewEvents: Math.max(0, launch.groupedEvents - readyEvents),
      venues: stats.venues || 0,
      categories: Number(categoryCountResult.rows[0]?.total || 0),
      cities: stats.cities || 0,
      tags: stats.tags || 0,
      landingRules: LANDING_RULES.length,
      destinations,
      launch,
    },
  };
}

/** Kept for compatibility; SQL metrics (same source as Events list). */
async function buildAdminLaunchMetricsCompact(db) {
  return {
    ...(await queryAdminLaunchMetricsSql(db)),
    source: 'admin_event_groups_sql',
  };
}

function buildLaunchMetrics(events) {
  return {
    groupedEvents: events.length,
    readyForSales: events.filter(isSaleableEventForPublic).length,
    readyForSeo: events.filter((event) => event.readiness === 'ready' && event.canPublish !== false).length,
    needsAttention: events.filter(
      (event) => event.status === 'needs_review' || event.readiness === 'review' || event.readiness === 'blocked',
    ).length,
    priceBlocked: events.filter((event) => event.priceFrom == null).length, // display-price gap (<100/null), not public sale block
    purchaseBlocked: events.filter((event) => !event.purchaseReady).length,
    noImage: events.filter((event) => !event.hasImage).length,
    landingMatched: events.filter((event) => (event.landingHits || []).length > 0).length,
  };
}

export async function buildAdminCitiesList(db, searchParams = new URLSearchParams()) {
  const limit = clampNumber(searchParams.get('limit'), 1, 200, 80);
  const page = clampNumber(searchParams.get('page'), 1, 100000, 1);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  // Lightweight city/region rollup (no full publicCatalogSessions payload).
  const allRows = await destinationSummaryRowsFast(db);
  const filtered = query
    ? allRows.filter((row) =>
        [row.slug, row.sourceSlug, row.name, row.type].filter(Boolean).join(' ').toLowerCase().includes(query),
      )
    : allRows;
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const safePage = Math.min(Math.max(1, page), pages);
  const rows = filtered.slice((safePage - 1) * limit, safePage * limit);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows,
    metrics: {
      destinations: allRows.length,
      cities: allRows.filter((row) => row.type === 'city').length,
      regions: allRows.filter((row) => row.type === 'region').length,
      events: allRows.reduce((sum, row) => sum + (row.events || 0), 0),
      venues: allRows.reduce((sum, row) => sum + (row.venues || 0), 0),
    },
  };
}

function mapAdminCityRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    sourceTitle: row.sourceTitle || null,
    introTitle: row.introTitle || null,
    introText: row.introText || null,
    heroImageUrl: row.heroImageUrl || null,
    seoH1: row.seoH1 || null,
    seoTitle: row.seoTitle || null,
    seoDescription: row.seoDescription || null,
    canonicalPath: row.canonicalPath || null,
    isDestination: row.isDestination === true,
    regionId: row.regionId || null,
    editable: true,
  };
}

function normalizeCitySlug(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/ё/g, 'e')
      .replace(/[^a-z0-9а-я-]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || ''
  );
}

function normalizeCityPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw Object.assign(new Error('city_payload_invalid'), { statusCode: 400 });
  }

  const normalized = {};
  for (const key of [
    'title',
    'sourceTitle',
    'introTitle',
    'introText',
    'heroImageUrl',
    'seoH1',
    'seoTitle',
    'seoDescription',
    'canonicalPath',
  ]) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    normalized[key] = normalizeNullableString(payload[key]);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'slug')) {
    const slug = normalizeCitySlug(payload.slug);
    if (!slug) throw Object.assign(new Error('slug_required'), { statusCode: 400 });
    normalized.slug = slug;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isDestination')) {
    normalized.isDestination = payload.isDestination == null ? null : Boolean(payload.isDestination);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'name') && !Object.prototype.hasOwnProperty.call(payload, 'title')) {
    normalized.title = normalizeNullableString(payload.name);
  }

  return normalized;
}

export async function buildAdminCityDetail(db, cityIdOrSlug) {
  const key = String(cityIdOrSlug || '').trim();
  if (!key) return null;
  const slugHint = key.startsWith('city_') ? key.slice(5) : key;
  const { rows } = await db.query(
    `
      select *
      from "City"
      where id = $1 or slug = $1 or slug = $2
      order by case when id = $1 then 0 when slug = $1 then 1 else 2 end
      limit 1
    `,
    [key, slugHint],
  );
  return mapAdminCityRow(rows[0]);
}

export async function updateAdminCity(db, cityIdOrSlug, payload = {}) {
  const current = await buildAdminCityDetail(db, cityIdOrSlug);
  if (!current) {
    throw Object.assign(new Error('city_not_found'), { statusCode: 404 });
  }

  const normalized = normalizeCityPayload(payload);
  const next = {
    ...current,
    ...Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined)),
  };

  const title = String(next.title || '').trim();
  if (!title) throw Object.assign(new Error('title_required'), { statusCode: 400 });

  const slug = normalizeCitySlug(next.slug || current.slug);
  if (!slug) throw Object.assign(new Error('slug_required'), { statusCode: 400 });

  if (slug !== current.slug) {
    const { rows: conflicts } = await db.query(
      `select id from "City" where slug = $1 and id <> $2 limit 1`,
      [slug, current.id],
    );
    if (conflicts[0]) {
      throw Object.assign(new Error('slug_not_unique'), { statusCode: 409 });
    }
  }

  const canonicalPath =
    next.canonicalPath ||
    current.canonicalPath ||
    `/cities/${slug}`;

  try {
    const { rows } = await db.query(
      `
        update "City"
        set
          slug = $2,
          title = $3,
          "sourceTitle" = $4,
          "introTitle" = $5,
          "introText" = $6,
          "heroImageUrl" = $7,
          "seoH1" = $8,
          "seoTitle" = $9,
          "seoDescription" = $10,
          "canonicalPath" = $11,
          "isDestination" = $12
        where id = $1
        returning id
      `,
      [
        current.id,
        slug,
        title,
        next.sourceTitle ?? null,
        next.introTitle ?? null,
        next.introText ?? null,
        next.heroImageUrl ?? null,
        next.seoH1 ?? null,
        next.seoTitle ?? null,
        next.seoDescription ?? null,
        canonicalPath,
        next.isDestination === true,
      ],
    );
    if (!rows[0]) throw Object.assign(new Error('city_not_found'), { statusCode: 404 });
  } catch (error) {
    if (error?.code === '23505') {
      throw Object.assign(new Error('slug_not_unique'), { statusCode: 409 });
    }
    throw error;
  }

  return buildAdminCityDetail(db, current.id);
}

let adminSourcesCache = { expiresAt: 0, staleUntil: 0, payload: null };
let adminSourcesBuildPromise = null;
const ADMIN_SOURCES_TTL_MS = Number(process.env.ADMIN_SOURCES_TTL_MS || 2 * 60_000);
const ADMIN_SOURCES_STALE_MS = Number(process.env.ADMIN_SOURCES_STALE_MS || 10 * 60_000);

export function invalidateAdminSourcesCache() {
  if (adminSourcesCache.payload) {
    adminSourcesCache = { ...adminSourcesCache, expiresAt: 0 };
  } else {
    adminSourcesCache = { expiresAt: 0, staleUntil: 0, payload: null };
  }
}

function scheduleAdminSourcesRebuild(db, reason = 'refresh') {
  if (adminSourcesBuildPromise) return adminSourcesBuildPromise;
  adminSourcesBuildPromise = (async () => {
    const startedAt = Date.now();
    try {
      const payload = await loadAdminSourcesUncached(db);
      const now = Date.now();
      adminSourcesCache = {
        expiresAt: now + Math.max(15_000, ADMIN_SOURCES_TTL_MS),
        staleUntil: now + Math.max(30_000, ADMIN_SOURCES_STALE_MS),
        payload,
      };
      console.log(`Admin sources cache rebuilt (${reason}) in ${now - startedAt}ms`);
      return payload;
    } finally {
      adminSourcesBuildPromise = null;
    }
  })().catch((error) => {
    adminSourcesBuildPromise = null;
    console.warn(`Admin sources cache rebuild failed (${reason}): ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  });
  return adminSourcesBuildPromise;
}

export async function buildAdminSources(db) {
  const now = Date.now();
  const cached = adminSourcesCache;
  if (cached.payload && now < cached.expiresAt) {
    return cached.payload;
  }
  if (cached.payload && now < cached.staleUntil) {
    void scheduleAdminSourcesRebuild(db, 'swr');
    return cached.payload;
  }
  return scheduleAdminSourcesRebuild(db, cached.payload ? 'hard-expire' : 'cold');
}

async function loadAdminSourcesUncached(db) {
  const result = await db.query(`
    with grouped_events as (
      select
        grouped."sourceId",
        count(*)::int as "groupedEvents",
        count(distinct nullif(grouped."venueKey", ''))::int as "groupedVenues",
        count(distinct nullif(grouped."cityKey", ''))::int as "groupedCities"
      from (
        select
          source.id as "sourceId",
          lower(regexp_replace(coalesce(event.title, ''), '\\s+', ' ', 'g')) as "titleKey",
          coalesce(event."primaryCityId", '') as "cityKey",
          coalesce(event."venueId", venue.title, '') as "venueKey"
        from "Source" source
        join "EventSourceLink" link on link."sourceId" = source.id
        join "Event" event on event.id = link."eventId"
        left join "Venue" venue on venue.id = event."venueId"
        group by
          source.id,
          lower(regexp_replace(coalesce(event.title, ''), '\\s+', ' ', 'g')),
          coalesce(event."primaryCityId", ''),
          coalesce(event."venueId", venue.title, '')
      ) grouped
      group by grouped."sourceId"
    )
    select
      source.id,
      source.code::text as code,
      source.name,
      source.enabled,
      count(distinct link."eventId")::int as "rawEvents",
      coalesce(grouped_events."groupedEvents", 0)::int as "groupedEvents",
      coalesce(grouped_events."groupedVenues", 0)::int as "groupedVenues",
      coalesce(grouped_events."groupedCities", 0)::int as "groupedCities",
      count(distinct event."venueId") filter (where event."venueId" is not null)::int as venues,
      count(distinct event."primaryCityId") filter (where event."primaryCityId" is not null)::int as cities,
      count(distinct session.id)::int as sessions,
      count(distinct offer.id)::int as offers,
      min(offer."priceRub") filter (where offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB})::int as "priceFrom",
      max(offer."widgetUrl") filter (where offer."widgetUrl" is not null) as "sampleWidgetUrl",
      max(offer."deeplinkUrl") filter (where offer."deeplinkUrl" is not null) as "sampleDeeplinkUrl",
      latest.status::text as "lastSyncStatus",
      latest.mode as "lastSyncMode",
      latest."startedAt" as "lastSyncStartedAt",
      latest."finishedAt" as "lastSyncFinishedAt",
      latest.error as "lastSyncError",
      last_success."startedAt" as "lastSuccessStartedAt",
      last_success."finishedAt" as "lastSuccessFinishedAt",
      coalesce(sync_health."consecutiveErrors", 0)::int as "consecutiveErrors",
      coalesce(sync_health."runningRuns", 0)::int as "runningRuns"
    from "Source" source
    left join "EventSourceLink" link on link."sourceId" = source.id
    left join "Event" event on event.id = link."eventId"
    left join "EventSession" session on session."eventId" = event.id
    left join "EventOffer" offer on offer."eventId" = event.id and offer."sourceCode"::text = source.code::text and offer.active is not false
    left join grouped_events on grouped_events."sourceId" = source.id
    left join lateral (
      select status, mode, "startedAt", "finishedAt", error
      from "SourceSyncRun"
      where "sourceId" = source.id
        and coalesce(mode, '') !~* 'orders|order|polling'
      order by "startedAt" desc
      limit 1
    ) latest on true
    left join lateral (
      select "startedAt", "finishedAt"
      from "SourceSyncRun"
      where "sourceId" = source.id and status::text = 'SUCCESS' and coalesce(mode, '') !~* 'orders|order|polling'
      order by "startedAt" desc
      limit 1
    ) last_success on true
    left join lateral (
      select
        count(*) filter (where status::text = 'FAILED')::int as "consecutiveErrors",
        count(*) filter (where status::text = 'RUNNING')::int as "runningRuns"
      from "SourceSyncRun"
      where "sourceId" = source.id
        and coalesce(mode, '') !~* 'orders|order|polling'
        and "startedAt" > coalesce(last_success."startedAt", timestamp '1970-01-01')
    ) sync_health on true
    group by
      source.id,
      grouped_events."groupedEvents",
      grouped_events."groupedVenues",
      grouped_events."groupedCities",
      latest.status,
      latest.mode,
      latest."startedAt",
      latest."finishedAt",
      latest.error,
      last_success."startedAt",
      last_success."finishedAt",
      sync_health."consecutiveErrors",
      sync_health."runningRuns"
    order by source.code asc
  `);

  const sources = result.rows.map((row) => {
    const sourceCode = String(row.code || '').toUpperCase();
    const purchaseReady = Boolean(
      row.sampleWidgetUrl ||
        row.sampleDeeplinkUrl ||
        sourceCode === 'TEPLOHOD' ||
        (sourceCode === 'TICKETSCLOUD' && (process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN || process.env.TICKETSCLOUD_API_TOKEN)),
    );
    const groupedEventsCount = row.groupedEvents || row.rawEvents || 0;
    const status = !row.enabled ? 'paused' : groupedEventsCount > 0 && purchaseReady ? 'live' : groupedEventsCount > 0 ? 'incomplete' : 'error';
    const lastSuccessAt = row.lastSuccessFinishedAt || row.lastSuccessStartedAt || null;
    const openIssues = sourceHealthIssues({
      sourceCode,
      enabled: row.enabled,
      status,
      purchaseReady,
      groupedEvents: groupedEventsCount,
      lastSyncStatus: row.lastSyncStatus,
      lastSyncError: row.lastSyncError,
      lastSuccessAt,
      consecutiveErrors: row.consecutiveErrors || 0,
    });
    const healthStatus = sourceHealthStatus(status, openIssues);
    const staleHours = lastSuccessAt ? Math.max(0, Math.round((Date.now() - new Date(lastSuccessAt).getTime()) / 36_000) / 100) : null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      enabled: row.enabled,
      status,
      healthStatus,
      purchaseReady,
      events: groupedEventsCount,
      rawEvents: row.rawEvents || 0,
      venues: row.groupedVenues || row.venues || 0,
      cities: row.groupedCities || row.cities || 0,
      sessions: row.sessions || 0,
      offers: row.offers || 0,
      priceFrom: row.priceFrom || null,
      sampleWidgetUrl: row.sampleWidgetUrl || null,
      sampleDeeplinkUrl: row.sampleDeeplinkUrl || null,
      lastSuccessAt,
      isStale: openIssues.some((issue) => issue.code === 'STALE_SYNC_24H' || issue.code === 'NO_SUCCESSFUL_SYNC'),
      staleHours,
      consecutiveErrors: row.consecutiveErrors || 0,
      runningRuns: row.runningRuns || 0,
      openIssues,
      lastSync: row.lastSyncStartedAt
        ? {
            status: row.lastSyncStatus,
            mode: row.lastSyncMode,
            startedAt: row.lastSyncStartedAt,
            finishedAt: row.lastSyncFinishedAt,
            error: row.lastSyncError,
          }
        : null,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sources,
    metrics: {
      sources: sources.length,
      live: sources.filter((source) => source.status === 'live').length,
      healthy: sources.filter((source) => source.healthStatus === 'ok').length,
      stale: sources.filter((source) => source.isStale).length,
      openIssues: sources.reduce((sum, source) => sum + source.openIssues.length, 0),
      events: sources.reduce((sum, source) => sum + source.events, 0),
      sessions: sources.reduce((sum, source) => sum + source.sessions, 0),
    },
  };
}


function sourceHealthIssues(source) {
  const issues = [];
  const lastSuccessAt = source.lastSuccessAt ? new Date(source.lastSuccessAt) : null;
  const lastSuccessTime = lastSuccessAt && Number.isFinite(lastSuccessAt.getTime()) ? lastSuccessAt.getTime() : null;
  const hoursSinceSuccess = lastSuccessTime ? (Date.now() - lastSuccessTime) / 3_600_000 : null;

  const add = (code, label, severity = 'medium') => issues.push({ code, label, severity });

  if (!source.enabled) add('SOURCE_DISABLED', 'Источник выключен', 'medium');
  if (!lastSuccessTime) add('NO_SUCCESSFUL_SYNC', 'Нет успешного sync', 'high');
  else if (hoursSinceSuccess > 24) add('STALE_SYNC_24H', 'Sync старше 24 часов', 'high');
  if (String(source.lastSyncStatus || '').toUpperCase() === 'FAILED') add('LAST_SYNC_FAILED', source.lastSyncError ? `Последний sync упал: ${source.lastSyncError}` : 'Последний sync упал', 'high');
  if ((source.consecutiveErrors || 0) > 0) add('CONSECUTIVE_ERRORS', `${source.consecutiveErrors} ошибок sync подряд`, source.consecutiveErrors > 2 ? 'high' : 'medium');
  if (!source.groupedEvents) add('NO_GROUPED_EVENTS', 'Нет карточек каталога', 'high');
  if (source.groupedEvents > 0 && !source.purchaseReady) add('PURCHASE_NOT_READY', 'Покупка не готова', 'high');
  if (source.sourceCode === 'TEPLOHOD' && !process.env.TEP_API_URL) {
    add('TEP_API_NOT_CONFIGURED', 'Не задан TEP_API_URL (импорт с сервера с белым IP, токен не нужен)', 'high');
  }

  return issues;
}

function sourceHealthStatus(status, issues) {
  if (status === 'paused') return 'paused';
  if (issues.some((issue) => issue.severity === 'high')) return 'error';
  if (issues.length) return 'warning';
  return 'ok';
}

async function queryAdminOrdersLean(db, { includeArchived }) {
  const result = await db.query(
    `
      select
        ext_order.id,
        ext_order."externalOrderId",
        ext_order."publicCode",
        ext_order.status,
        ext_order."buyerSnapshot",
        ext_order."purchasedAt",
        ext_order."archivedAt",
        ext_order."updatedAt",
        source.code::text as "sourceCode",
        source.name as "sourceName",
        coalesce(ticket_stats."ticketCount", 0)::int as "ticketCount",
        coalesce(ticket_stats."unlinkedTickets", 0)::int as "unlinkedTickets",
        coalesce(ticket_stats."eventTitles", '{}'::text[]) as "eventTitles",
        ticket_stats."firstStartsAt",
        '[]'::jsonb as tickets
      from "ExternalOrder" ext_order
      join "Source" source on source.id = ext_order."sourceId"
      left join lateral (
        select
          count(*)::int as "ticketCount",
          count(*) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
          coalesce(array_remove(array_agg(distinct event.title), null), '{}') as "eventTitles",
          min(session."startsAt") as "firstStartsAt"
        from "ExternalTicket" ticket
        left join "Event" event on event.id = ticket."eventId"
        left join "EventSession" session on session.id = ticket."sessionId"
        where ticket."externalOrderId" = ext_order.id
      ) ticket_stats on true
      where ($1::boolean and ext_order."archivedAt" is not null)
         or (not $1::boolean and ext_order."archivedAt" is null)
      order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
    `,
    [includeArchived],
  );
  return result.rows.map(mapAdminOrderRow);
}

function matchesAdminOrderListFilters(order, { view, provider, status, q }) {
  if (view === 'attention' && !order.needsAttention) return false;
  if (view === 'missing_artifact' && order.artifactStatus !== 'missing') return false;
  if (view === 'failed_integration' && !isProblemOrderStatus(order.status)) return false;
  if (view === 'unlinked' && !(order.unlinkedTickets > 0)) return false;
  if (view === 'pending_refunds' && !isRefundStatus(order.status)) return false;
  if (view === 'archivable' && !order.canArchive) return false;
  if (provider !== 'ALL' && order.sourceCode !== provider) return false;
  if (status !== 'all' && String(order.status || '').toLowerCase() !== status) return false;
  if (!q) return true;
  const haystack = [
    order.externalOrderId,
    order.publicCode,
    order.status,
    order.sourceName,
    order.sourceCode,
    order.buyer.name,
    order.buyer.phone,
    order.buyer.email,
    order.buyer.notes,
    ...(order.eventTitles || []),
    order.eventTitle,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export async function buildAdminOrdersList(db, searchParams = new URLSearchParams()) {
  const q = String(searchParams.get('q') || '').trim().toLowerCase();
  const view = String(searchParams.get('view') || 'all');
  const provider = String(searchParams.get('provider') || 'all').toUpperCase();
  const status = String(searchParams.get('status') || 'all').toLowerCase();
  const limit = clampNumber(searchParams.get('limit'), 1, 100, 50);
  const page = clampNumber(searchParams.get('page'), 1, 100000, 1);
  const includeArchived = view === 'archive';

  await archiveStaleCancelledOrders(db).catch(() => undefined);

  const [allRows, archiveCountResult, activeCountResult] = await Promise.all([
    queryAdminOrdersLean(db, { includeArchived }),
    db.query(`select count(*)::int as total from "ExternalOrder" where "archivedAt" is not null`),
    db.query(`select count(*)::int as total from "ExternalOrder" where "archivedAt" is null`),
  ]);

  const rows = allRows.filter((order) => matchesAdminOrderListFilters(order, { view, provider, status, q }));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const windowRows = rows.slice((safePage - 1) * limit, safePage * limit);

  const archiveCount = Number(archiveCountResult.rows[0]?.total || 0);
  const activeCount = Number(activeCountResult.rows[0]?.total || 0);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows: windowRows,
    sources: Array.from(new Set(allRows.map((order) => order.sourceCode).filter(Boolean))).sort(),
    statuses: Array.from(new Set(allRows.map((order) => order.status).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    quickFilters: [
      { id: 'all', count: includeArchived ? activeCount : allRows.length },
      { id: 'attention', count: allRows.filter((order) => order.needsAttention).length },
      { id: 'pending_refunds', count: allRows.filter((order) => isRefundStatus(order.status)).length },
      { id: 'missing_artifact', count: allRows.filter((order) => order.artifactStatus === 'missing').length },
      { id: 'failed_integration', count: allRows.filter((order) => isProblemOrderStatus(order.status)).length },
      { id: 'unlinked', count: allRows.filter((order) => order.unlinkedTickets > 0).length },
      { id: 'archivable', count: allRows.filter((order) => order.canArchive).length },
      { id: 'archive', count: archiveCount },
    ],
    metrics: {
      imported: includeArchived ? archiveCount : activeCount,
      confirmed: allRows.filter((order) => isConfirmedOrderStatus(order.status)).length,
      processing: allRows.filter((order) => isProcessingOrderStatus(order.status)).length,
      canceled: allRows.filter((order) => isCanceledOrderStatus(order.status)).length,
      archived: archiveCount,
      tickets: allRows.reduce((sum, order) => sum + (order.ticketCount || 0), 0),
      missingArtifacts: allRows.filter((order) => order.artifactStatus === 'missing').length,
      failedIntegration: allRows.filter((order) => isProblemOrderStatus(order.status)).length,
      needsAttention: allRows.filter((order) => order.needsAttention).length,
    },
  };
}

export async function archiveAdminOrder(db, orderKey) {
  const order = await findExternalOrderRow(db, orderKey);
  if (!order) {
    const error = new Error('order_not_found');
    error.statusCode = 404;
    throw error;
  }
  if (order.archivedAt) return buildAdminOrderDetail(db, order.id);
  if (!isArchivableOrderStatus(order.status)) {
    const error = new Error('order_not_archivable');
    error.statusCode = 400;
    throw error;
  }
  await db.query('update "ExternalOrder" set "archivedAt" = now(), "updatedAt" = now() where id = $1', [order.id]);
  return buildAdminOrderDetail(db, order.id);
}

export async function unarchiveAdminOrder(db, orderKey) {
  const order = await findExternalOrderRow(db, orderKey);
  if (!order) {
    const error = new Error('order_not_found');
    error.statusCode = 404;
    throw error;
  }
  await db.query('update "ExternalOrder" set "archivedAt" = null, "updatedAt" = now() where id = $1', [order.id]);
  return buildAdminOrderDetail(db, order.id);
}

const STALE_CANCELLED_ARCHIVE_DAYS = 30;

export async function archiveAdminOrdersBulk(db, body = {}) {
  const statuses = Array.isArray(body.statuses) && body.statuses.length
    ? body.statuses.map((item) => String(item || '').toLowerCase()).filter(Boolean)
    : ['cancelled', 'canceled', 'expired', 'deleted', 'rejected', 'refunded'];
  const olderThanDays = clampNumber(body.olderThanDays, 0, 3650, 0);
  const result = await db.query(
    `
      update "ExternalOrder"
      set "archivedAt" = now(), "updatedAt" = now()
      where "archivedAt" is null
        and lower(status) = any($1::text[])
        and (
          $2::int <= 0
          or coalesce("purchasedAt", "updatedAt") <= now() - make_interval(days => $2)
        )
      returning id
    `,
    [statuses, olderThanDays],
  );
  return {
    archived: result.rows.length,
    olderThanDays: olderThanDays || null,
    ids: result.rows.map((row) => row.id),
  };
}

/** Archive cancelled/deleted/expired orders older than N days (default 30). */
export async function archiveStaleCancelledOrders(db, options = {}) {
  const olderThanDays = clampNumber(options.olderThanDays, 1, 3650, STALE_CANCELLED_ARCHIVE_DAYS);
  return archiveAdminOrdersBulk(db, {
    olderThanDays,
    statuses: options.statuses || ['cancelled', 'canceled', 'expired', 'deleted', 'rejected', 'refunded'],
  });
}

export async function deleteAdminOrder(db, orderKey) {
  const order = await findExternalOrderRow(db, orderKey);
  if (!order) {
    const error = new Error('order_not_found');
    error.statusCode = 404;
    throw error;
  }
  await db.query('update "CheckoutOrder" set "externalOrderId" = null where "externalOrderId" = $1', [order.id]).catch(() => undefined);
  await db.query('delete from "ExternalTicket" where "externalOrderId" = $1', [order.id]);
  await db.query('delete from "ExternalOrder" where id = $1', [order.id]);
  return { ok: true, deletedId: order.id };
}

async function findExternalOrderRow(db, orderKey) {
  const key = String(orderKey || '').trim();
  if (!key) return null;
  const result = await db.query(
    `
      select id, status, "archivedAt"
      from "ExternalOrder"
      where id = $1 or "externalOrderId" = $1 or "publicCode" = $1
      limit 1
    `,
    [key],
  );
  return result.rows[0] || null;
}

export async function buildPublicBuyerOrders(db, searchParams = new URLSearchParams()) {
  const lookup = String(searchParams.get('lookup') || searchParams.get('q') || '').trim();
  const minLookupLength = 4;
  if (lookup.length < minLookupLength) {
    return {
      generatedAt: new Date().toISOString(),
      lookupRequired: true,
      minLookupLength,
      total: 0,
      rows: [],
      metrics: { orders: 0, tickets: 0, active: 0 },
    };
  }

  const lookupPattern = `%${escapeLikePattern(lookup)}%`;
  const digitPattern = digitsOnly(lookup).length >= 6 ? `%${digitsOnly(lookup)}%` : '';
  const result = await db.query(`
    select
      ext_order.id,
      ext_order."externalOrderId",
      ext_order."publicCode",
      ext_order.status,
      ext_order."buyerSnapshot",
      ext_order."purchasedAt",
      ext_order."updatedAt",
      source.code::text as "sourceCode",
      source.name as "sourceName",
      count(ticket.id)::int as "ticketCount",
      count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', ticket.id,
            'externalTicketId', ticket."externalTicketId",
            'status', ticket.status,
            'origin', ticket.origin,
            'eventId', ticket."eventId",
            'sessionId', ticket."sessionId",
            'eventTitle', event.title,
            'eventSlug', event.slug,
            'startsAt', session."startsAt"
          )
        ) filter (where ticket.id is not null),
        '[]'::jsonb
      ) as tickets
    from "ExternalOrder" ext_order
    join "Source" source on source.id = ext_order."sourceId"
    left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
    left join "Event" event on event.id = ticket."eventId"
    left join "EventSession" session on session.id = ticket."sessionId"
    where
      ext_order."externalOrderId" ilike $1 escape '\\'
      or ext_order."publicCode" ilike $1 escape '\\'
      or coalesce(ext_order."buyerSnapshot"::text, '') ilike $1 escape '\\'
      or ($2 <> '' and regexp_replace(coalesce(ext_order."buyerSnapshot"::text, ''), '\\D', '', 'g') like $2)
      or exists (
        select 1
        from "ExternalTicket" lookup_ticket
        where lookup_ticket."externalOrderId" = ext_order.id
          and lookup_ticket."externalTicketId" ilike $1 escape '\\'
      )
    group by ext_order.id, source.id
    order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
    limit 100
  `, [lookupPattern, digitPattern]);

  const matched = result.rows
    .map(mapAdminOrderRow)
    .filter((order) => matchesPublicOrderLookup(order, lookup))
    .slice(0, 20)
    .map(mapPublicBuyerOrder);
  const rows = await enrichBuyerOrdersWithEventLinks(db, matched);

  return {
    generatedAt: new Date().toISOString(),
    lookupRequired: false,
    minLookupLength,
    total: rows.length,
    rows,
    metrics: {
      orders: rows.length,
      tickets: rows.reduce((sum, order) => sum + order.ticketCount, 0),
      active: rows.filter((order) => !order.isFinal).length,
    },
  };
}

const ACCOUNT_ORDER_EMAIL_FILTER = `
  (
    lower(trim(coalesce(ext_order."buyerEmailNormalized", ''))) = $1
    or lower(trim(coalesce(ext_order."buyerSnapshot"->>'email', ''))) = $1
    or lower(trim(coalesce(ext_order."buyerSnapshot"->>'customerEmail', ''))) = $1
    or lower(trim(coalesce(ext_order."buyerSnapshot"->'buyer'->>'email', ''))) = $1
    or lower(trim(coalesce(ext_order."buyerSnapshot"->'customer'->>'email', ''))) = $1
  )
  and ext_order."archivedAt" is null
`;

const ACCOUNT_ORDER_SELECT = `
  select
    ext_order.id,
    ext_order."externalOrderId",
    ext_order."publicCode",
    ext_order.status,
    ext_order."buyerSnapshot",
    ext_order."purchasedAt",
    ext_order."updatedAt",
    source.code::text as "sourceCode",
    source.name as "sourceName",
    count(ticket.id)::int as "ticketCount",
    count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ticket.id,
          'externalTicketId', ticket."externalTicketId",
          'status', ticket.status,
          'origin', ticket.origin,
          'eventId', ticket."eventId",
          'sessionId', ticket."sessionId",
          'eventTitle', event.title,
          'eventSlug', event.slug,
          'startsAt', session."startsAt"
        )
      ) filter (where ticket.id is not null),
      '[]'::jsonb
    ) as tickets
  from "ExternalOrder" ext_order
  join "Source" source on source.id = ext_order."sourceId"
  left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
  left join "Event" event on event.id = ticket."eventId"
  left join "EventSession" session on session.id = ticket."sessionId"
`;

function mapAccountBuyerOrder(order) {
  const base = mapPublicBuyerOrder(order);
  return {
    ...base,
    buyer: {
      name: order.buyer.name || null,
      email: order.buyer.email || null,
      phone: order.buyer.phone || null,
    },
  };
}

function orderMatchesAccountEmail(order, email) {
  return normalizeLookup(order.buyer.email) === normalizeLookup(email);
}

export async function buildAccountPurchases(db, userEmail, searchParams = new URLSearchParams()) {
  const email = normalizeLookup(userEmail);
  const limit = clampNumber(searchParams.get('limit'), 1, 50, 10);
  const page = clampNumber(searchParams.get('page'), 1, 1000, 1);
  const offset = (page - 1) * limit;

  if (!email || !email.includes('@')) {
    return {
      generatedAt: new Date().toISOString(),
      page,
      pages: 1,
      limit,
      total: 0,
      rows: [],
      metrics: { orders: 0, tickets: 0, active: 0 },
    };
  }

  const countResult = await db.query(
    `
      select count(*)::int as total
      from "ExternalOrder" ext_order
      where ${ACCOUNT_ORDER_EMAIL_FILTER}
    `,
    [email],
  );
  const total = Number(countResult.rows[0]?.total || 0);
  const pages = Math.max(1, Math.ceil(total / limit));

  const result = await db.query(
    `
      ${ACCOUNT_ORDER_SELECT}
      where ${ACCOUNT_ORDER_EMAIL_FILTER}
      group by ext_order.id, source.id
      order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
      limit $2 offset $3
    `,
    [email, limit, offset],
  );

  const mapped = result.rows.map(mapAdminOrderRow).filter((order) => orderMatchesAccountEmail(order, email)).map(mapAccountBuyerOrder);
  const rows = await enrichBuyerOrdersWithEventLinks(db, mapped);

  return {
    generatedAt: new Date().toISOString(),
    page,
    pages,
    limit,
    total,
    rows,
    metrics: {
      orders: total,
      tickets: rows.reduce((sum, order) => sum + order.ticketCount, 0),
      active: rows.filter((order) => !order.isFinal).length,
    },
  };
}

export async function buildAccountOrderDetail(db, userEmail, orderId) {
  const email = normalizeLookup(userEmail);
  const order = await buildAdminOrderDetail(db, orderId);
  if (!order) return null;
  if (!orderMatchesAccountEmail(order, email)) return null;
  const [enriched] = await enrichBuyerOrdersWithEventLinks(db, [mapAccountBuyerOrder(order)]);
  return enriched;
}

export async function buildAdminBuyersList(db, searchParams = new URLSearchParams()) {
  const q = String(searchParams.get('q') || '').trim().toLowerCase();
  const view = String(searchParams.get('view') || 'active').toLowerCase();
  const includeArchived = view === 'archive';
  const limit = clampNumber(searchParams.get('limit'), 1, 300, 80);
  const page = clampNumber(searchParams.get('page'), 1, 100000, 1);

  // Keep buyers list tidy: auto-archive cancelled/deleted orders older than 30 days.
  await archiveStaleCancelledOrders(db).catch(() => undefined);

  const groups = new Map();
  for (const order of await queryAdminOrdersLean(db, { includeArchived })) {
    const buyerKey = adminBuyerKey(order);
    const current =
      groups.get(buyerKey) ||
      {
        id: buyerKey,
        name: order.buyer.name || null,
        email: order.buyer.email || null,
        phone: order.buyer.phone || null,
        notes: order.buyer.notes || null,
        lookup: order.buyer.email || order.buyer.phone || order.publicCode || order.externalOrderId,
        orders: 0,
        tickets: 0,
        activeOrders: 0,
        canceledOrders: 0,
        needsAttention: 0,
        amountRub: 0,
        lastOrderAt: null,
        providers: [],
        eventTitles: [],
        orderNumbers: [],
        lastOrderNumber: null,
        lastOrderStatus: null,
        lastOrderStatusLabel: null,
        lastOrderTone: null,
      };

    current.name ||= order.buyer.name || null;
    current.email ||= order.buyer.email || null;
    current.phone ||= order.buyer.phone || null;
    current.notes ||= order.buyer.notes || null;
    current.orders += 1;
    current.tickets += order.ticketCount || 0;
    current.activeOrders += isCanceledOrderStatus(order.status) ? 0 : 1;
    current.canceledOrders += isCanceledOrderStatus(order.status) ? 1 : 0;
    current.needsAttention += order.needsAttention ? 1 : 0;
    current.amountRub += order.amountRub || 0;
    current.providers = uniqueValues(current.providers.concat(order.sourceLabel || order.sourceCode).filter(Boolean));
    current.eventTitles = uniqueValues(current.eventTitles.concat(order.eventTitles || order.eventTitle || []).filter(Boolean)).slice(0, 8);
    current.orderNumbers = uniqueValues(current.orderNumbers.concat(order.publicCode || order.externalOrderId).filter(Boolean)).slice(0, 8);

    const orderDate = order.purchasedAt || order.updatedAt || null;
    if (orderDate && (!current.lastOrderAt || new Date(orderDate) > new Date(current.lastOrderAt))) {
      current.lastOrderAt = orderDate;
      current.lastOrderNumber = order.publicCode || order.externalOrderId;
      current.lastOrderStatus = order.status;
      current.lastOrderStatusLabel = order.displayStatus;
      current.lastOrderTone = order.statusTone;
    }

    groups.set(buyerKey, current);
  }

  const allRows = Array.from(groups.values()).map((row) => ({
    ...row,
    amountRub: row.amountRub || null,
    displayName: row.name || row.email || row.phone || `Покупатель ${row.lastOrderNumber || ''}`.trim(),
    hasContact: Boolean(row.email || row.phone),
    statusTone: includeArchived
      ? 'archived'
      : row.needsAttention
        ? 'error'
        : row.activeOrders > 0
          ? 'live'
          : 'archived',
    statusLabel: includeArchived
      ? 'в архиве'
      : row.needsAttention
        ? 'требует внимания'
        : row.activeOrders > 0
          ? 'есть активные заказы'
          : 'только отменённые',
  }));

  const filtered = allRows
    .filter((buyer) => {
      if (!q) return true;
      return [
        buyer.displayName,
        buyer.name,
        buyer.email,
        buyer.phone,
        buyer.notes,
        buyer.lookup,
        buyer.lastOrderNumber,
        ...(buyer.providers || []),
        ...(buyer.eventTitles || []),
        ...(buyer.orderNumbers || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return bTime - aTime || String(a.displayName).localeCompare(String(b.displayName), 'ru');
    });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * limit, safePage * limit);

  const archivedBuyersCountResult = await db.query(`
    select count(distinct coalesce(
      nullif(lower(trim(coalesce("buyerEmailNormalized", "buyerSnapshot"->'buyer'->>'email', "buyerSnapshot"->>'email', ''))), ''),
      nullif(regexp_replace(coalesce("buyerPhoneNormalized", "buyerSnapshot"->'buyer'->>'phone', ''), '\\D', '', 'g'), ''),
      id
    ))::int as total
    from "ExternalOrder"
    where "archivedAt" is not null
  `).catch(() => ({ rows: [{ total: 0 }] }));

  return {
    generatedAt: new Date().toISOString(),
    view: includeArchived ? 'archive' : 'active',
    page: safePage,
    pages,
    limit,
    total,
    rows,
    metrics: {
      buyers: allRows.length,
      withContacts: allRows.filter((buyer) => buyer.hasContact).length,
      orders: allRows.reduce((sum, buyer) => sum + buyer.orders, 0),
      tickets: allRows.reduce((sum, buyer) => sum + buyer.tickets, 0),
      needsAttention: allRows.filter((buyer) => buyer.needsAttention > 0).length,
      archivedBuyers: Number(archivedBuyersCountResult.rows[0]?.total || 0),
      archiveAfterDays: STALE_CANCELLED_ARCHIVE_DAYS,
    },
  };
}

export async function buildAdminOrderEventCandidates(db, searchParams = new URLSearchParams()) {
  const query = String(searchParams.get('q') || '').trim();
  const limit = clampNumber(searchParams.get('limit'), 1, 30, 12);
  const queryPattern = `%${escapeLikePattern(query)}%`;

  const result = await db.query(
    `
      with event_base as (
        select
          e.id,
          e.slug,
          e.title,
          e."primaryCityId",
          e."venueId",
          e."priceFromRub",
          city.title as city,
          venue.title as venue,
          source.id as "sourceId",
          source.code::text as "sourceCode",
          source.name as "sourceName",
          category.title as category,
          min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "upcomingStartsAt",
          min(session."startsAt") as "firstStartsAt",
          count(distinct session.id)::int as "sessionCount",
          min(session."priceFromRub") filter (where session."priceFromRub" >= $3)::int as "sessionPriceFrom",
          min(offer."priceRub") filter (where offer."priceRub" >= $3 and offer.active = true)::int as "offerPriceFrom"
        from "Event" e
        left join "City" city on city.id = e."primaryCityId"
        left join "Venue" venue on venue.id = e."venueId"
        left join "Category" category on category.id = e."categoryId"
        left join "EventSourceLink" source_link on source_link."eventId" = e.id
        left join "Source" source on source.id = source_link."sourceId"
        left join "EventSession" session on session."eventId" = e.id
        left join "EventOffer" offer on offer."eventId" = e.id
        where
          $1 = ''
          or e.title ilike $2 escape '\\'
          or coalesce(city.title, '') ilike $2 escape '\\'
          or coalesce(venue.title, '') ilike $2 escape '\\'
          or coalesce(category.title, '') ilike $2 escape '\\'
          or coalesce(source_link."externalId", '') ilike $2 escape '\\'
        group by e.id, city.title, venue.title, source.id, category.title
      ),
      ranked as (
        select
          *,
          array_agg(id) over (
            partition by
              coalesce("sourceId", ''),
              lower(regexp_replace(coalesce(title, ''), '\\s+', ' ', 'g')),
              coalesce("primaryCityId", ''),
              coalesce("venueId", venue, '')
          ) as "groupEventIds",
          sum("sessionCount") over (
            partition by
              coalesce("sourceId", ''),
              lower(regexp_replace(coalesce(title, ''), '\\s+', ' ', 'g')),
              coalesce("primaryCityId", ''),
              coalesce("venueId", venue, '')
          )::int as "groupSessionCount",
          row_number() over (
            partition by
              coalesce("sourceId", ''),
              lower(regexp_replace(coalesce(title, ''), '\\s+', ' ', 'g')),
              coalesce("primaryCityId", ''),
              coalesce("venueId", venue, '')
            order by "upcomingStartsAt" asc nulls last, "firstStartsAt" desc nulls last, id asc
          ) as rn
        from event_base
      )
      select *
      from ranked
      where rn = 1
      order by "upcomingStartsAt" asc nulls last, "firstStartsAt" desc nulls last, title asc
      limit $4
    `,
    [query, queryPattern, MIN_DISPLAY_PRICE_RUB, limit],
  );

  const candidateRows = result.rows;
  const allEventIds = Array.from(new Set(candidateRows.flatMap((row) => normalizeStringArray(row.groupEventIds || [row.id]))));
  const sessionsResult = allEventIds.length
    ? await db.query(
        `
          select
            id,
            "eventId",
            "startsAt",
            "endsAt",
            "sourceStatus",
            "priceFromRub",
            "ticketsVacant"
          from "EventSession"
          where "eventId" = any($1)
          order by
            case when "startsAt" is null then 2 when "startsAt" >= now() then 0 else 1 end asc,
            "startsAt" asc nulls last
          limit 240
        `,
        [allEventIds],
      )
    : { rows: [] };

  const sessionsByEventId = new Map();
  for (const session of sessionsResult.rows) {
    const bucket = sessionsByEventId.get(session.eventId) || [];
    bucket.push({
      id: session.id,
      eventId: session.eventId,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      sourceStatus: session.sourceStatus,
      priceFrom: session.priceFromRub,
      vacant: session.ticketsVacant,
    });
    sessionsByEventId.set(session.eventId, bucket);
  }

  return {
    generatedAt: new Date().toISOString(),
    query,
    rows: candidateRows.map((row) => {
      const groupEventIds = normalizeStringArray(row.groupEventIds || [row.id]);
      const sessions = groupEventIds.flatMap((eventId) => sessionsByEventId.get(eventId) || []).slice(0, 8);
      return {
        id: row.id,
        slug: publicEventSlug(row.slug),
        title: row.title,
        city: row.city,
        venue: formatPublicVenueTitle(row.venue),
        category: row.category,
        sourceCode: row.sourceCode,
        sourceName: row.sourceName,
        startsAt: row.upcomingStartsAt || row.firstStartsAt || null,
        priceFrom: displayPriceFrom(row.priceFromRub, row.sessionPriceFrom, row.offerPriceFrom),
        sessionCount: row.groupSessionCount || row.sessionCount || sessions.length,
        groupEventIds,
        sessions,
      };
    }),
  };
}

export async function upsertAdminOrderTicket(db, orderId, payload = {}) {
  const orderKey = String(orderId || '').trim();
  const externalTicketId = firstString(payload.externalTicketId, payload.number, payload.ticketNumber);
  const status = firstString(payload.status, payload.ticketStatus) || 'issued';
  const eventId = firstString(payload.eventId);
  const sessionId = firstString(payload.sessionId);
  const ticketId = firstString(payload.id, payload.ticketId);

  if (!orderKey) {
    const error = new Error('order_id_required');
    error.statusCode = 400;
    throw error;
  }
  if (!externalTicketId || externalTicketId.length < 2) {
    const error = new Error('ticket_number_required');
    error.statusCode = 400;
    throw error;
  }

  const orderResult = await db.query('select id from "ExternalOrder" where id = $1 or "externalOrderId" = $1 or "publicCode" = $1 limit 1', [orderKey]);
  const order = orderResult.rows[0];
  if (!order) {
    const error = new Error('order_not_found');
    error.statusCode = 404;
    throw error;
  }

  let existingTicket = null;
  if (ticketId) {
    const existingById = await db.query('select id from "ExternalTicket" where id = $1 and "externalOrderId" = $2 limit 1', [ticketId, order.id]);
    existingTicket = existingById.rows[0] || null;
  }
  if (!existingTicket) {
    const existingByNumber = await db.query('select id from "ExternalTicket" where "externalOrderId" = $1 and "externalTicketId" = $2 limit 1', [order.id, externalTicketId]);
    existingTicket = existingByNumber.rows[0] || null;
  }

  if (existingTicket) {
    await db.query(
      `
        update "ExternalTicket"
        set
          "externalTicketId" = $2,
          status = $3,
          "eventId" = $4,
          "sessionId" = $5,
          origin = 'manual'
        where id = $1
      `,
      [existingTicket.id, externalTicketId, status, eventId, sessionId],
    );
  } else {
    await db.query(
      `
        insert into "ExternalTicket" (id, "externalOrderId", "externalTicketId", status, "eventId", "sessionId", origin)
        values ($1, $2, $3, $4, $5, $6, 'manual')
      `,
      [`extticket_manual_${randomUUID()}`, order.id, externalTicketId, status, eventId, sessionId],
    );
  }

  await db.query('update "ExternalOrder" set "updatedAt" = now() where id = $1', [order.id]);
  return { ok: true, order: await buildAdminOrderDetail(db, order.id) };
}

export async function buildAdminOrderDetail(db, orderId) {
  const orderKey = String(orderId || '').trim();
  if (!orderKey) return null;

  const result = await db.query(
    `
      select
        ext_order.id,
        ext_order."externalOrderId",
        ext_order."publicCode",
        ext_order.status,
        ext_order."buyerSnapshot",
        ext_order."purchasedAt",
        ext_order."archivedAt",
        ext_order."updatedAt",
        source.code::text as "sourceCode",
        source.name as "sourceName",
        count(ticket.id)::int as "ticketCount",
        count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', ticket.id,
              'externalTicketId', ticket."externalTicketId",
              'status', ticket.status,
              'origin', ticket.origin,
              'eventId', ticket."eventId",
              'sessionId', ticket."sessionId",
              'eventTitle', event.title,
              'eventSlug', event.slug,
              'startsAt', session."startsAt"
            )
          ) filter (where ticket.id is not null),
          '[]'::jsonb
        ) as tickets
      from "ExternalOrder" ext_order
      join "Source" source on source.id = ext_order."sourceId"
      left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
      left join "Event" event on event.id = ticket."eventId"
      left join "EventSession" session on session.id = ticket."sessionId"
      where ext_order.id = $1 or ext_order."externalOrderId" = $1 or ext_order."publicCode" = $1
      group by ext_order.id, source.id
      limit 1
    `,
    [orderKey],
  );

  return result.rows[0] ? mapAdminOrderRow(result.rows[0]) : null;
}

function mapAdminOrderRow(row) {
  const buyer = normalizeBuyerSnapshot(row.buyerSnapshot);
  const tickets = Array.isArray(row.tickets)
    ? row.tickets.map((ticket) => mapAdminOrderTicket(ticket, row.status, row.buyerSnapshot))
    : [];
  const ticketCount = Number(row.ticketCount || tickets.length || 0);
  const unlinkedTickets = Number(row.unlinkedTickets || 0);
  const problemStatus = isProblemOrderStatus(row.status);
  const shouldExpectTicket = shouldExpectOrderTicket(row.status);
  const hasUnlinkedTickets =
    shouldExpectTicket &&
    (unlinkedTickets > 0 || tickets.some((ticket) => !ticket.eventId || !ticket.eventTitle));
  // TC set/admission products often have empty tickets[] but paid sets_values - not a mirror gap.
  const setProducts = listSetProductsFromSnapshot(row.buyerSnapshot);
  const hasSetFulfillment = setProducts.length > 0;
  const missingArtifact = shouldExpectTicket && ticketCount === 0 && !hasSetFulfillment;
  const sourceCode = String(row.sourceCode || '').toUpperCase();
  const eventTitlesFromRow = Array.isArray(row.eventTitles) ? row.eventTitles.filter(Boolean) : [];
  const eventTitles = Array.from(
    new Set(eventTitlesFromRow.length ? eventTitlesFromRow : tickets.map((ticket) => ticket.eventTitle).filter(Boolean)),
  );
  const snapshotEventTitle = firstString(row.buyerSnapshot?.sourceEventTitle, row.buyerSnapshot?.eventTitle);
  const eventTitle = eventTitles[0] || snapshotEventTitle || null;
  const sessionDates = tickets.map((ticket) => ticket.startsAt).filter(Boolean).sort();
  const eventDateLabel = row.firstStartsAt || sessionDates[0] || null;
  const displayTickets =
    tickets.length > 0
      ? tickets
      : setProducts.map((set, index) =>
          mapAdminOrderTicket(
            {
              id: `set:${set.id || index + 1}`,
              externalTicketId: firstString(set.name, set.id, `Набор ${index + 1}`),
              status: row.status || 'done',
              origin: 'set',
              eventId: null,
              sessionId: null,
              eventTitle: snapshotEventTitle || firstString(set.name) || null,
              eventSlug: null,
              startsAt: null,
            },
            row.status,
            row.buyerSnapshot,
          ),
        );
  const displayTicketCount = ticketCount > 0 ? ticketCount : displayTickets.length;

  return {
    id: row.id,
    externalOrderId: row.externalOrderId,
    publicCode: resolveBuyerFacingOrderNumber({
      buyerSnapshot: row.buyerSnapshot,
      buyer,
      publicCode: row.publicCode || publicOrderCode(row.sourceCode || row.sourceName, row.externalOrderId || row.id),
      externalOrderId: row.externalOrderId,
    }),
    buyerSnapshot: row.buyerSnapshot || null,
    status: row.status || 'unknown',
    displayStatus: orderStatusLabel(row.status),
    statusTone: orderStatusTone(row.status),
    sourceCode,
    sourceName: row.sourceName || sourceCode,
    sourceLabel: sourceLabel(sourceCode),
    buyer,
    purchasedAt: row.purchasedAt || row.updatedAt || null,
    archivedAt: row.archivedAt || null,
    isArchived: Boolean(row.archivedAt),
    canArchive: !row.archivedAt && isArchivableOrderStatus(row.status),
    updatedAt: row.updatedAt || null,
    ticketCount: displayTicketCount,
    unlinkedTickets,
    eventTitle,
    eventTitles: eventTitles.length ? eventTitles : eventTitle ? [eventTitle] : [],
    eventDateLabel,
    tickets: displayTickets,
    amountRub: extractOrderAmountRub(row.buyerSnapshot),
    artifactStatus: missingArtifact ? 'missing' : displayTicketCount > 0 || hasSetFulfillment ? 'tickets' : 'not_required',
    refundRequestsCount: 0,
    hasPendingRefundRequests: isRefundStatus(row.status),
    needsAttention: problemStatus || missingArtifact || hasUnlinkedTickets,
    problems: [
      ...(problemStatus ? ['Проверить статус у источника'] : []),
      ...(missingArtifact ? ['Нет билетов в зеркале'] : []),
      ...(hasUnlinkedTickets ? ['Есть билеты без связи с событием'] : []),
    ],
  };
}

/** TicketsCloud set/admission lines live in values.sets_values when seats tickets[] is empty. */
function listSetProductsFromSnapshot(snapshot) {
  const payload = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const values =
    (payload.values && typeof payload.values === 'object' && payload.values) ||
    (payload.sourcePayload?.values && typeof payload.sourcePayload.values === 'object' && payload.sourcePayload.values) ||
    {};
  const sets = values.sets_values;
  if (!sets || typeof sets !== 'object' || Array.isArray(sets)) return [];
  return Object.values(sets).filter((item) => item && typeof item === 'object');
}

function mapAdminOrderTicket(ticket, orderStatus = null, buyerSnapshot = null) {
  const effectiveStatus = resolveTicketStatusForDisplay(ticket.status, orderStatus);
  return {
    id: ticket.id,
    externalTicketId: resolveTicketDisplayNumber(ticket, buyerSnapshot),
    status: ticket.status || 'unknown',
    displayStatus: orderStatusLabel(effectiveStatus),
    origin: ticket.origin || 'source',
    eventId: ticket.eventId || null,
    sessionId: ticket.sessionId || null,
    eventTitle: ticket.eventTitle || null,
    eventSlug: ticket.eventSlug || null,
    startsAt: ticket.startsAt || null,
  };
}

/** Ticketscloud often keeps paid seat tickets as "reserved"; for done orders show as issued. */
function resolveTicketStatusForDisplay(ticketStatus, orderStatus) {
  const ticket = String(ticketStatus || '').toLowerCase();
  if (
    isConfirmedOrderStatus(orderStatus) &&
    ['reserved', 'hold', 'pending', 'open', 'new', 'created', 'processing'].some((token) => ticket.includes(token))
  ) {
    return 'issued';
  }
  return ticketStatus;
}

function resolveTicketDisplayNumber(ticket, buyerSnapshot) {
  const payloadTickets =
    (buyerSnapshot && (buyerSnapshot.sourcePayload?.tickets || buyerSnapshot.tickets)) || [];
  const match = Array.isArray(payloadTickets)
    ? payloadTickets.find((item) => String(item?.id || '') === String(ticket.externalTicketId || ''))
    : null;
  if (match) {
    if (match.serial != null && match.number != null) return `${match.serial}-${match.number}`;
    if (match.number != null) return String(match.number);
    if (match.barcode) return String(match.barcode);
  }
  return ticket.externalTicketId || ticket.id;
}

function matchesPublicOrderLookup(order, lookup) {
  const normalized = normalizeLookup(lookup);
  const digits = digitsOnly(lookup);
  const buyerEmail = normalizeLookup(order.buyer.email);
  const buyerPhone = digitsOnly(order.buyer.phone);

  if (normalized.length >= 4 && normalizeLookup(order.externalOrderId).includes(normalized)) return true;
  if (normalized.length >= 4 && normalizeLookup(order.publicCode).includes(normalized)) return true;
  if (normalized.length >= 4 && order.tickets.some((ticket) => normalizeLookup(ticket.externalTicketId).includes(normalized))) return true;
  if (buyerEmail && normalized.includes('@') && buyerEmail === normalized) return true;
  if (digits.length >= 6 && buyerPhone && buyerPhone.includes(digits)) return true;
  return false;
}

function adminBuyerKey(order) {
  const email = normalizeLookup(order.buyer.email);
  if (email) return `email:${email}`;
  const phone = digitsOnly(order.buyer.phone);
  if (phone.length >= 6) return `phone:${phone}`;
  const name = normalizeLookup(order.buyer.name);
  if (name) return `name:${name}`;
  return `order:${order.publicCode || order.externalOrderId || order.id}`;
}

function mapPublicBuyerOrder(order) {
  const primaryTicket = order.tickets.find((ticket) => ticket.eventTitle || ticket.eventId) || order.tickets[0] || null;
  const eventUrl = primaryTicket?.eventSlug
    ? `/events/${publicEventSlug(primaryTicket.eventSlug)}`
    : primaryTicket?.eventId
      ? `/events/${encodeURIComponent(primaryTicket.eventId)}`
      : null;
  const isFinal = isCanceledOrderStatus(order.status) || isConfirmedOrderStatus(order.status);
  return {
    id: order.id,
    number: resolveBuyerFacingOrderNumber(order),
    sourceOrderId: order.externalOrderId,
    status: order.status,
    displayStatus: order.displayStatus,
    statusTone: order.statusTone,
    isFinal,
    providerName: order.sourceLabel,
    buyer: {
      name: order.buyer.name || null,
      email: maskEmail(order.buyer.email),
      phone: maskPhone(order.buyer.phone),
    },
    eventId: primaryTicket?.eventId || null,
    eventTitle: order.eventTitle,
    eventUrl,
    purchasedAt: order.purchasedAt,
    updatedAt: order.updatedAt,
    amountRub: order.amountRub,
    ticketCount: order.ticketCount,
    artifactStatus: order.artifactStatus,
    message: publicOrderMessage(order),
    tickets: order.tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.externalTicketId,
      status: ticket.status || 'unknown',
      displayStatus: ticket.displayStatus || orderStatusLabel(resolveTicketStatusForDisplay(ticket.status, order.status)),
      eventId: ticket.eventId || null,
      eventTitle: ticket.eventTitle,
      eventUrl: ticket.eventSlug ? `/events/${publicEventSlug(ticket.eventSlug)}` : ticket.eventId ? `/events/${encodeURIComponent(ticket.eventId)}` : null,
      startsAt: ticket.startsAt,
    })),
  };
}

/** For external purchases show provider order number; hashed publicCode only as fallback. */
function resolveBuyerFacingOrderNumber(order) {
  const snap = order.buyerSnapshot && typeof order.buyerSnapshot === 'object' ? order.buyerSnapshot : {};
  const notes = firstString(order.buyer?.notes, snap.buyer?.notes);
  const fromNotes = notes && /^#?\d{4,}$/.test(String(notes).trim()) ? String(notes).trim().replace(/^#/, '') : null;
  return firstString(
    snap.number != null ? String(snap.number) : null,
    snap.code,
    fromNotes,
    order.publicCode,
    order.externalOrderId,
  );
}

function publicOrderCode(source, externalOrderId) {
  const hex = createHash('sha256').update(`${source || 'source'}:${externalOrderId || ''}`).digest('hex').slice(0, 12);
  const number = (Number.parseInt(hex, 16) % 9000000) + 1000000;
  return String(number).padStart(7, '0');
}

function publicOrderMessage(order) {
  if (isConfirmedOrderStatus(order.status)) return 'Заказ подтвержден в билетной системе.';
  if (isCanceledOrderStatus(order.status)) return 'Заказ завершен или отменен в билетной системе.';
  if (order.artifactStatus === 'missing') return 'Билеты еще не попали в зеркало. Статус можно уточнить по номеру заказа.';
  if (isProcessingOrderStatus(order.status)) return 'Заказ обрабатывается в билетной системе.';
  return 'Статус получен из билетной системы.';
}

function normalizeBuyerSnapshot(snapshot) {
  const payload = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const customer = payload.customer && typeof payload.customer === 'object' ? payload.customer : {};
  const buyer = payload.buyer && typeof payload.buyer === 'object' ? payload.buyer : {};
  const sourcePayload = payload.sourcePayload && typeof payload.sourcePayload === 'object' ? payload.sourcePayload : {};
  const settingsCustomer =
    (payload.settings && typeof payload.settings.customer === 'object' && payload.settings.customer) ||
    (sourcePayload.settings && typeof sourcePayload.settings.customer === 'object' && sourcePayload.settings.customer) ||
    {};
  const rawPhone = firstString(
    payload.phone,
    payload.customerPhone,
    buyer.phone,
    customer.phone,
    settingsCustomer.phone,
    settingsCustomer.phone_number,
  );
  return {
    name: firstString(
      payload.name,
      payload.fullName,
      payload.customerName,
      buyer.name,
      customer.name,
      customer.fullName,
      settingsCustomer.name,
      settingsCustomer.full_name,
    ),
    email: firstString(
      payload.email,
      payload.customerEmail,
      buyer.email,
      customer.email,
      settingsCustomer.email,
    ),
    phone: looksLikeDateTime(rawPhone) ? null : rawPhone,
    notes: firstString(payload.notes, payload.comment, buyer.notes, payload.code, payload.number, payload.source, payload.rawStatus),
  };
}

function looksLikeDateTime(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/.test(text);
}

function normalizeLookup(value) {
  return String(value || '').trim().toLowerCase();
}

function escapeLikePattern(value) {
  return String(value || '').replace(/[\\%_]/g, (match) => `\\${match}`);
}

function digitsOnly(value) {
  return String(value || '').replace(/\D+/g, '');
}

function maskEmail(value) {
  const email = String(value || '').trim();
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  if (!name || !domain) return null;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function maskPhone(value) {
  const digits = digitsOnly(value);
  if (digits.length < 6) return null;
  return `+${digits.slice(0, 1)} ${'*'.repeat(Math.max(3, digits.length - 5))} ${digits.slice(-4)}`;
}

function extractOrderAmountRub(snapshot) {
  const payload = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const values = payload.values && typeof payload.values === 'object' ? payload.values : {};
  const raw = firstNumber(payload.amountRub, payload.amount, payload.full, payload.total, values.full, values.amount, values.total);
  if (raw == null) return null;
  return Math.round(raw > 100000 ? raw / 100 : raw);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeStringArray(values) {
  return (Array.isArray(values) ? values : [values]).map((value) => String(value || '').trim()).filter(Boolean);
}

function firstNumber(...values) {
  for (const value of values) {
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function sourceLabel(sourceCode) {
  if (sourceCode === 'TEPLOHOD') return 'Teplohod.info';
  if (sourceCode === 'TICKETSCLOUD') return 'Ticketscloud';
  return sourceCode || 'Источник';
}

function isConfirmedOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['done', 'paid', 'confirmed', 'completed', 'success', 'executed', 'sold'].some((token) => value.includes(token));
}

function isProcessingOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['open', 'new', 'created', 'pending', 'processing', 'reserved', 'hold'].some((token) => value.includes(token));
}

function isCanceledOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['cancel', 'return', 'refund', 'reject', 'expired', 'deleted'].some((token) => value.includes(token));
}

function isArchivableOrderStatus(status) {
  return isCanceledOrderStatus(status) || isRefundStatus(status) || String(status || '').toLowerCase().includes('deleted');
}

function isRefundStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['refund', 'return'].some((token) => value.includes(token));
}

function isProblemOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['fail', 'error', 'reject'].some((token) => value.includes(token));
}

function shouldExpectOrderTicket(status) {
  const value = String(status || '').toLowerCase();
  if (!value || isCanceledOrderStatus(value) || isRefundStatus(value)) return false;
  return (
    isConfirmedOrderStatus(value) ||
    ['issued', 'ticketed', 'generated', 'delivered', 'voucher'].some((token) => value.includes(token))
  );
}

function orderStatusTone(status) {
  if (isConfirmedOrderStatus(status)) return 'live';
  if (isCanceledOrderStatus(status)) return 'archived';
  if (isProblemOrderStatus(status)) return 'error';
  if (isProcessingOrderStatus(status)) return 'ready';
  return 'incomplete';
}

function orderStatusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (isRefundStatus(value)) return 'возвращен';
  if (isConfirmedOrderStatus(value)) return 'подтвержден';
  if (isCanceledOrderStatus(value)) return 'отменен';
  if (['issued', 'ticketed', 'generated', 'delivered'].some((token) => value.includes(token))) return 'выпущен';
  if (['used', 'visited', 'redeemed', 'checked'].some((token) => value.includes(token))) return 'использован';
  if (isProcessingOrderStatus(value)) return 'в обработке';
  return status || 'неизвестно';
}

let adminLandingsBaseCache = { catalogBuiltAt: -1, fingerprint: '', allRows: null, matchedEventIdsSize: 0 };

function landingSavedFingerprint(rows) {
  return rows
    .map((row) =>
      [
        row.slug,
        row.status,
        row.title,
        row.subtitle,
        row.description,
        row.pinnedEvents,
        row.excludedEvents,
        row.reviewEventsManual,
        row.isIndexable,
        row.seoH1,
        row.seoTitle,
        row.seoDescription,
        row.canonicalUrl,
      ].join(':'),
    )
    .join('|');
}

export function invalidateAdminLandingsBaseCache() {
  adminLandingsBaseCache = { catalogBuiltAt: -1, fingerprint: '', allRows: null, matchedEventIdsSize: 0 };
}

let adminGroupedEventsCache = { expiresAt: 0, staleUntil: 0, items: null, launch: null, sourceCount: 0, builtAt: 0 };
let adminGroupedEventsBuildPromise = null;
const ADMIN_GROUPED_EVENTS_TTL_MS = Number(process.env.ADMIN_GROUPED_EVENTS_TTL_MS || 5 * 60_000);
const ADMIN_GROUPED_EVENTS_STALE_MS = Number(process.env.ADMIN_GROUPED_EVENTS_STALE_MS || 30 * 60_000);

function scheduleAdminGroupedEventsRebuild(db, reason = 'refresh') {
  if (adminGroupedEventsBuildPromise) return adminGroupedEventsBuildPromise;

  adminGroupedEventsBuildPromise = (async () => {
    const startedAt = Date.now();
    try {
      const sourceEvents = await eventRows(db, null, { lean: true });
      const items = groupAdminEventRows(sourceEvents);
      const now = Date.now();
      adminGroupedEventsCache = {
        expiresAt: now + Math.max(30_000, ADMIN_GROUPED_EVENTS_TTL_MS),
        staleUntil: now + Math.max(60_000, ADMIN_GROUPED_EVENTS_STALE_MS),
        items,
        launch: buildLaunchMetrics(items),
        sourceCount: sourceEvents.length,
        builtAt: now,
      };
      console.log(
        `Admin grouped events cache rebuilt (${reason}): ${sourceEvents.length} raw → ${items.length} groups in ${now - startedAt}ms`,
      );
      return adminGroupedEventsCache;
    } finally {
      adminGroupedEventsBuildPromise = null;
    }
  })().catch((error) => {
    adminGroupedEventsBuildPromise = null;
    console.warn(
      `Admin grouped events cache rebuild failed (${reason}): ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  });

  return adminGroupedEventsBuildPromise;
}

async function getCachedAdminGroupedEvents(db) {
  const now = Date.now();
  const cached = adminGroupedEventsCache;

  // Fresh hit — switching Events/Dashboard/Landings stays in-memory.
  if (cached.items && now < cached.expiresAt) {
    return cached;
  }

  // Stale-while-revalidate: serve previous catalog immediately, refresh in background.
  if (cached.items && now < cached.staleUntil) {
    void scheduleAdminGroupedEventsRebuild(db, 'swr');
    return cached;
  }

  return scheduleAdminGroupedEventsRebuild(db, cached.items ? 'hard-expire' : 'cold');
}

/** Soft-invalidate: keep last payload for instant SWR responses while rebuild runs. */
export function invalidateAdminGroupedEventsCache(db = null, reason = 'invalidate') {
  if (adminGroupedEventsCache.items) {
    adminGroupedEventsCache = {
      ...adminGroupedEventsCache,
      expiresAt: 0,
    };
  } else {
    adminGroupedEventsCache = { expiresAt: 0, staleUntil: 0, items: null, launch: null, sourceCount: 0, builtAt: 0 };
  }
  invalidateAdminEventsSqlReadModelCache();
  if (db) {
    void scheduleAdminGroupedEventsRebuild(db, reason);
  }
  invalidateAdminLandingsBaseCache();
  invalidateAdminSourcesCache();
}

export async function warmAdminGroupedEventsCache(db, reason = 'warmup') {
  const now = Date.now();
  if (adminGroupedEventsCache.items && now < adminGroupedEventsCache.expiresAt) {
    return adminGroupedEventsCache;
  }
  return scheduleAdminGroupedEventsRebuild(db, reason);
}

export async function buildAdminEventsList(db, searchParams) {
  const startedAt = Date.now();
  // SQL pages groups in DB; hydrate only sibling rows for the current page.
  const sqlPage = await queryAdminEventGroupsPage(db, searchParams);
  const sourceEvents = sqlPage.eventIds.length
    ? await eventRowsByIds(db, sqlPage.eventIds, { maxIds: 2500 })
    : [];
  const groupedPage = groupAdminEventRows(sourceEvents);
  // Preserve SQL page order (startsAt, title).
  const order = new Map(sqlPage.pageGroups.map((group, index) => [group.groupKey, index]));
  const rows = groupedPage.sort((a, b) => {
    const ai = order.has(a.groupKey) ? order.get(a.groupKey) : Number.MAX_SAFE_INTEGER;
    const bi = order.has(b.groupKey) ? order.get(b.groupKey) : Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });

  const launch = sqlPage.launch;
  const quickFilters = ['all', 'needs_attention', 'ready_publish', 'purchase_blocked', 'no_image', 'landing_match'].map(
    (id) => ({
      id,
      count:
        id === 'all'
          ? launch.groupedEvents
          : id === 'needs_attention'
            ? launch.needsAttention
            : id === 'ready_publish'
              ? launch.readyForSeo
              : id === 'purchase_blocked'
                ? launch.purchaseBlocked
                : id === 'no_image'
                  ? launch.noImage
                  : id === 'landing_match'
                    ? launch.landingMatched
                    : 0,
    }),
  );

  console.log(
    `Admin events SQL read-model: loaded ${sourceEvents.length} raw rows → ${rows.length} groups ` +
      `(page ${sqlPage.page}/${sqlPage.pages}, totalGroups=${sqlPage.total}) in ${Date.now() - startedAt}ms`,
  );

  return {
    generatedAt: new Date().toISOString(),
    page: sqlPage.page,
    pages: sqlPage.pages,
    limit: sqlPage.limit,
    total: sqlPage.total,
    rows,
    categories: Array.from(sqlPage.categories || []).sort((a, b) => String(a).localeCompare(String(b), 'ru')),
    sources: Array.from(sqlPage.sources || []).sort(),
    quickFilters,
    metrics: {
      events: launch.groupedEvents,
      readyEvents: launch.readyForSeo,
      reviewEvents: Math.max(0, launch.groupedEvents - launch.readyForSeo),
      landingRules: LANDING_RULES.length,
      sourceEvents: sqlPage.sourceCount,
      groupedEvents: launch.groupedEvents,
      rowsLoaded: sourceEvents.length,
      readModel: 'sql_group_page',
      launch: {
        ...launch,
        source: 'admin_event_groups_sql',
      },
    },
  };
}

export async function buildAdminLandingsList(db, searchParams = new URLSearchParams()) {
  const limit = clampNumber(searchParams.get("limit"), 1, 200, 80);
  const page = clampNumber(searchParams.get("page"), 1, 100000, 1);
  const query = String(searchParams.get("q") || "").trim().toLowerCase();
  const statusFilter = String(searchParams.get("status") || "all").trim().toLowerCase();
  const [cached, savedResult] = await Promise.all([
    getCachedAdminGroupedEvents(db),
    db.query(
      `
        select
          landing.id,
          landing.slug,
          landing.title,
          landing.subtitle,
          landing.description,
          landing.status,
          landing."heroTitle",
          landing."heroSubtitle",
          landing."seoH1",
          landing."seoTitle",
          landing."seoDescription",
          landing."canonicalUrl",
          landing."isIndexable",
          coalesce(count(match."eventId") filter (where match.reasons->>'manualStatus' = 'PINNED'), 0)::int as "pinnedEvents",
          coalesce(count(match."eventId") filter (where match.reasons->>'manualStatus' = 'EXCLUDED'), 0)::int as "excludedEvents",
          coalesce(count(match."eventId") filter (where match.reasons->>'manualStatus' = 'REVIEW'), 0)::int as "reviewEventsManual"
        from "Landing" landing
        left join "LandingMatch" match on match."landingId" = landing.id
        where landing.slug = any($1)
        group by landing.id
      `,
      [LANDING_RULES.map((rule) => rule.slug)],
    ),
  ]);

  const fingerprint = landingSavedFingerprint(savedResult.rows);
  let allRows = adminLandingsBaseCache.allRows;
  let matchedEventIdsSize = adminLandingsBaseCache.matchedEventIdsSize || 0;
  if (
    !allRows ||
    adminLandingsBaseCache.catalogBuiltAt !== cached.builtAt ||
    adminLandingsBaseCache.fingerprint !== fingerprint
  ) {
    const events = cached.items;
    const savedBySlug = new Map(savedResult.rows.map((row) => [row.slug, row]));
    const matchedEventIds = new Set();
    allRows = LANDING_RULES.map((rule) => {
      const saved = savedBySlug.get(rule.slug);
      const matched = events.filter((event) => matchesLandingRule(event, rule));
      matched.forEach((event) => matchedEventIds.add(event.id));
      const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
      const readyEvents = matched.filter((event) => event.readiness === 'ready').length;
      const blockedEvents = matched.filter((event) => event.readiness === 'blocked').length;
      const venues = new Set(matched.map((event) => event.venue).filter(Boolean));
      const cities = new Set(matched.map((event) => event.city).filter(Boolean));

      return {
        id: saved?.id || null,
        slug: rule.slug,
        title: saved?.title || rule.title,
        subtitle: saved?.subtitle || rule.subtitle,
        description: saved?.description || null,
        chips: rule.chips || [],
        status: saved ? String(saved.status || '').toLowerCase() : matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
        events: matched.length,
        readyEvents,
        reviewEvents: Math.max(0, matched.length - readyEvents),
        blockedEvents,
        pinnedEvents: saved?.pinnedEvents || 0,
        excludedEvents: saved?.excludedEvents || 0,
        reviewEventsManual: saved?.reviewEventsManual || 0,
        venues: venues.size,
        cities: cities.size,
        city: rule.city || null,
        venue: rule.venue || null,
        keywords: rule.keywords || [],
        keywordScope: rule.keywordScope || 'full',
        requiredAnyKeywords: rule.requiredAnyKeywords || [],
        requiredKeywordGroups: rule.requiredKeywordGroups || [],
        requiredTags: rule.tags || [],
        excludedTags: rule.excludeTags || [],
        excludedKeywords: rule.excludeKeywords || [],
        priceFrom: prices.length ? Math.min(...prices) : null,
        seo: {
          h1: saved?.seoH1 || null,
          title: saved?.seoTitle || null,
          description: saved?.seoDescription || null,
          canonicalUrl: saved?.canonicalUrl || null,
          isIndexable: saved?.isIndexable ?? false,
        },
        sampleEvents: matched.slice(0, 6).map((event) => ({
          id: event.id,
          slug: event.slug,
          title: event.title,
          city: event.city,
          venue: event.venue,
          startsAt: event.startsAt,
          priceFrom: event.priceFrom,
          readiness: event.readiness,
        })),
      };
    });
    matchedEventIdsSize = matchedEventIds.size;
    adminLandingsBaseCache = {
      catalogBuiltAt: cached.builtAt || 0,
      fingerprint,
      allRows,
      matchedEventIdsSize,
    };
  }

  const filtered = allRows.filter((row) => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    if (!query) return true;
    return [row.slug, row.title, row.subtitle, row.city, row.venue, ...(row.chips || []), ...(row.keywords || []), ...(row.requiredTags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const safePage = Math.min(Math.max(1, page), pages);
  const rows = filtered.slice((safePage - 1) * limit, safePage * limit);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows,
    metrics: {
      ready: allRows.filter((row) => row.status === 'ready').length,
      seed: allRows.filter((row) => row.status === 'seed').length,
      empty: allRows.filter((row) => row.status === 'empty').length,
      matchedEvents: matchedEventIdsSize,
      landingRules: LANDING_RULES.length,
      sourceEvents: cached.sourceCount,
    },
  };
}

export async function buildAdminLandingDetail(db, landingSlug, searchParams = new URLSearchParams()) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;

  const eventsLimit = clampNumber(searchParams.get('limit'), 1, 200, 80);
  const eventsPage = clampNumber(searchParams.get('page'), 1, 100000, 1);
  const eventsQuery = String(searchParams.get('q') || '').trim().toLowerCase();
  const excludedLimit = clampNumber(searchParams.get('excludedLimit'), 1, 200, 40);
  const excludedPage = clampNumber(searchParams.get('excludedPage'), 1, 100000, 1);

  // Perf note: still builds full grouped catalog then filters (same blocker as admin events list).
  const [cached, landingResult] = await Promise.all([
    getCachedAdminGroupedEvents(db),
    db.query(
      `
        select
          landing.*,
          seo.title as "metaTitle",
          seo.description as "metaDescription",
          seo.h1 as "metaH1",
          seo."canonicalUrl" as "metaCanonicalUrl",
          seo.robots as "metaRobots",
          seo."ogTitle" as "metaOgTitle",
          seo."ogDescription" as "metaOgDescription",
          seo."ogImageUrl" as "metaOgImageUrl"
        from "Landing" landing
        left join "SeoMeta" seo on seo."entityType" = 'LANDING' and seo."entityId" = landing.id
        where landing.slug = $1
        limit 1
      `,
      [landingSlug],
    ),
  ]);
  const landing = landingResult.rows[0] || null;
  const manualRows = landing
    ? (await db.query('select "eventId", score, reasons from "LandingMatch" where "landingId" = $1', [landing.id])).rows
    : [];
  const manualByEventId = new Map(manualRows.map((row) => [row.eventId, row]));
  const groupedEvents = cached.items;
  const groupIdsFor = (event) => (event.groupEventIds?.length ? event.groupEventIds : [event.id]);
  const autoMatchedGroups = groupedEvents.filter((event) => matchesLandingRule(event, rule));
  const autoIds = new Set(autoMatchedGroups.flatMap((event) => groupIdsFor(event)));
  const pinnedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'PINNED').map((row) => row.eventId));
  const excludedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'EXCLUDED').map((row) => row.eventId));
  const reviewIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'REVIEW').map((row) => row.eventId));
  const manualRowFor = (event) => groupIdsFor(event).map((id) => manualByEventId.get(id)).find(Boolean) || null;
  const isAutoGroup = (event) => groupIdsFor(event).some((id) => autoIds.has(id));
  const isPinnedGroup = (event) => groupIdsFor(event).some((id) => pinnedIds.has(id));
  const isExcludedGroup = (event) => groupIdsFor(event).some((id) => excludedIds.has(id));
  const isReviewGroup = (event) => groupIdsFor(event).some((id) => reviewIds.has(id));
  const matched = groupedEvents.filter((event) => (isAutoGroup(event) || isPinnedGroup(event)) && !isExcludedGroup(event));
  const excluded = groupedEvents.filter(isExcludedGroup);
  const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const blockRows = landing
    ? (await db.query(
        `
          select
            id, type, variant, title, subtitle, eyebrow, body, "richTextJson",
            payload, "assetUrl", "mobileAssetUrl", "isEnabled", "sortOrder"
          from "LandingContentBlock"
          where "landingId" = $1
          order by "sortOrder" asc, id asc
        `,
        [landing.id],
      )).rows
    : [];
  const blocks = blockRows.length ? blockRows.map(mapLandingBlock) : buildDefaultLandingBlocks(rule, matched);

  const filteredMatched = eventsQuery
    ? matched.filter((event) =>
        [event.title, event.city, event.venue, event.category, event.sourceCategory, ...(event.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(eventsQuery),
      )
    : matched;
  const eventsTotal = filteredMatched.length;
  const eventsPages = Math.max(1, Math.ceil(eventsTotal / Math.max(1, eventsLimit)));
  const safeEventsPage = Math.min(Math.max(1, eventsPage), eventsPages);
  const eventRowsPage = filteredMatched.slice((safeEventsPage - 1) * eventsLimit, safeEventsPage * eventsLimit);

  const excludedTotal = excluded.length;
  const excludedPages = Math.max(1, Math.ceil(excludedTotal / Math.max(1, excludedLimit)));
  const safeExcludedPage = Math.min(Math.max(1, excludedPage), excludedPages);
  const excludedRowsPage = excluded.slice((safeExcludedPage - 1) * excludedLimit, safeExcludedPage * excludedLimit);

  return {
    generatedAt: new Date().toISOString(),
    slug: rule.slug,
    rule: {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips || [],
      city: rule.city || null,
      venue: rule.venue || null,
      keywords: rule.keywords || [],
      keywordScope: rule.keywordScope || 'full',
      requiredAnyKeywords: rule.requiredAnyKeywords || [],
      requiredKeywordGroups: rule.requiredKeywordGroups || [],
      requiredTags: rule.tags || [],
      excludedTags: rule.excludeTags || [],
      excludedKeywords: rule.excludeKeywords || [],
    },
    landing: mapLandingRecord(landing, rule),
    blocks,
    seo: mapLandingSeo(landing, rule),
    metrics: {
      autoEvents: autoMatchedGroups.length,
      effectiveEvents: matched.length,
      pinnedEvents: groupedEvents.filter(isPinnedGroup).length,
      excludedEvents: excluded.length,
      reviewEvents: groupedEvents.filter(isReviewGroup).length,
      venues: new Set(matched.map((event) => event.venue).filter(Boolean)).size,
      cities: new Set(matched.map((event) => event.city).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
    page: safeEventsPage,
    pages: eventsPages,
    limit: eventsLimit,
    total: eventsTotal,
    events: eventRowsPage.map((event) => mapLandingAdminEvent(event, manualRowFor(event), isAutoGroup(event), rule)),
    excludedPage: safeExcludedPage,
    excludedPages,
    excludedLimit,
    excludedTotal,
    excludedEvents: excludedRowsPage.map((event) => mapLandingAdminEvent(event, manualRowFor(event), isAutoGroup(event), rule)),
  };
}

export async function buildAdminLandingEventCandidates(db, landingSlug, searchParams = new URLSearchParams()) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;

  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const limit = clampNumber(searchParams.get('limit'), 1, 50, 12);
  const [cached, landingResult] = await Promise.all([
    getCachedAdminGroupedEvents(db),
    db.query('select id from "Landing" where slug = $1 limit 1', [landingSlug]),
  ]);
  const landing = landingResult.rows[0] || null;
  const manualRows = landing
    ? (await db.query('select "eventId", score, reasons from "LandingMatch" where "landingId" = $1', [landing.id])).rows
    : [];
  const manualByEventId = new Map(manualRows.map((row) => [row.eventId, row]));
  const groupedEvents = cached.items;
  const autoIds = new Set(
    groupedEvents
      .filter((event) => matchesLandingRule(event, rule))
      .flatMap((event) => (event.groupEventIds?.length ? event.groupEventIds : [event.id])),
  );
  const filtered = groupedEvents.filter((event) => {
    if (!query) return false;
    return landingEventSearchText(event).includes(query);
  });

  return {
    generatedAt: new Date().toISOString(),
    slug: rule.slug,
    query,
    total: filtered.length,
    rows: filtered.slice(0, limit).map((event) => {
      const groupIds = event.groupEventIds?.length ? event.groupEventIds : [event.id];
      const manualRow = groupIds.map((id) => manualByEventId.get(id)).find(Boolean) || null;
      const isAutoMatch = groupIds.some((id) => autoIds.has(id));
      return mapLandingAdminEvent(event, manualRow, isAutoMatch, rule);
    }),
  };
}

export async function updateAdminLanding(db, landingSlug, payload) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;

  const title = normalizeNullableString(payload?.title) || rule.title;
  const subtitle = normalizeNullableString(payload?.subtitle) || rule.subtitle || null;
  const description = normalizeNullableString(payload?.description);
  const seoH1 = normalizeNullableString(payload?.seoH1);
  const seoTitle = normalizeNullableString(payload?.seoTitle);
  const seoDescription = normalizeNullableString(payload?.seoDescription);
  const canonicalUrl = normalizeNullableString(payload?.canonicalUrl);
  const isIndexable = payload?.isIndexable == null ? false : Boolean(payload.isIndexable);
  const status = normalizePublishStatus(payload?.status, 'REVIEW');

  const landingType = landingTypeForRule(rule);
  const landingResult = await db.query(
    `
      insert into "Landing" (
        id, type, slug, title, subtitle, description, status, rules,
        "heroTitle", "heroSubtitle", "seoH1", "seoTitle", "seoDescription",
        "canonicalUrl", "isIndexable", "isActive", "publishedAt", "updatedAt"
      )
      values ($1, $15::"LandingType", $2, $3, $4, $5, $6::"PublishStatus", $7::jsonb, $8, $9, $10, $11, $12, $13, $14, true, case when $6 = 'PUBLISHED' then now() else null end, now())
      on conflict (slug) do update set
        title = excluded.title,
        subtitle = excluded.subtitle,
        description = excluded.description,
        status = excluded.status,
        rules = excluded.rules,
        "heroTitle" = excluded."heroTitle",
        "heroSubtitle" = excluded."heroSubtitle",
        "seoH1" = excluded."seoH1",
        "seoTitle" = excluded."seoTitle",
        "seoDescription" = excluded."seoDescription",
        "canonicalUrl" = excluded."canonicalUrl",
        "isIndexable" = excluded."isIndexable",
        "isActive" = true,
        "publishedAt" = case when excluded.status = 'PUBLISHED' then coalesce("Landing"."publishedAt", now()) else "Landing"."publishedAt" end,
        "updatedAt" = now()
      returning id
    `,
    [
      randomUUID(),
      rule.slug,
      title,
      subtitle,
      description,
      status,
      JSON.stringify(rule),
      normalizeNullableString(payload?.heroTitle) || title,
      normalizeNullableString(payload?.heroSubtitle) || subtitle,
      seoH1,
      seoTitle,
      seoDescription,
      canonicalUrl,
      isIndexable,
      landingType,
    ],
  );
  const landingId = landingResult.rows[0]?.id;
  await upsertSeoMeta(db, 'LANDING', landingId, {
    title: seoTitle,
    description: seoDescription,
    h1: seoH1,
    canonicalUrl,
    robots: isIndexable ? 'index,follow' : 'noindex,follow',
    ogTitle: seoTitle,
    ogDescription: seoDescription,
  });

  invalidateAdminLandingsBaseCache();
  return buildAdminLandingDetail(db, landingSlug);
}

export async function updateAdminLandingMatch(db, landingSlug, eventId, payload) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;
  const landingId = await ensureLandingRecord(db, rule);
  const status = normalizeManualMatchStatus(payload?.status);
  const note = normalizeNullableString(payload?.note);
  const score = status === 'PINNED' ? 1000 : status === 'EXCLUDED' ? -1000 : 0;
  const eventIds = uniqueValues([eventId, ...normalizeStringArray(payload?.eventIds || payload?.groupEventIds)]).slice(0, 100);
  for (const targetEventId of eventIds) {
    await db.query(
      `
        insert into "LandingMatch" ("landingId", "eventId", score, reasons)
        values ($1, $2, $3, $4::jsonb)
        on conflict ("landingId", "eventId") do update set
          score = excluded.score,
          reasons = excluded.reasons
      `,
      [
        landingId,
        targetEventId,
        score,
        JSON.stringify({
          manualStatus: status,
          note,
          source: 'admin',
          updatedAt: new Date().toISOString(),
        }),
      ],
    );
  }
  invalidateAdminLandingsBaseCache();
  return buildAdminLandingDetail(db, landingSlug);
}

export async function buildAdminTaxonomy(db) {
  const [categoriesResult, subcategoriesResult, tagsResult] = await Promise.all([
    db.query('select id, slug, title, position from "Category" order by position asc, title asc'),
    db.query('select id, "categoryId", slug, title, position from "Subcategory" order by position asc, title asc'),
    db.query('select id, slug, title from "Tag" order by title asc'),
  ]);

  return {
    categories: categoriesResult.rows,
    subcategories: subcategoriesResult.rows,
    tags: tagsResult.rows,
  };
}

export async function buildAdminVenuesList(db, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 200, 80);
  const page = clampNumber(searchParams.get('page'), 1, 100000, 1);
  const query = String(searchParams.get('q') || '').trim();
  const familyFilter = String(searchParams.get('family') || '').trim().toLowerCase();
  const rows = await fetchLeanPublicVenueRows(2000, { leanText: true, q: query || undefined });
  const facets = await fetchVenueEventFacetCounts(rows.map((row) => row.id));
  const enriched = applyVenueEventFacetCounts(rows, facets).map((row) => {
    const mapped = {
      ...row,
      name: formatPublicVenueTitle(row.name || row.title),
    };
    mapped.city = resolvePublicVenueCity(mapped);
    return applyPublicVenueNormalization(mapped);
  });
  const filtered = enriched.filter((venue) => {
    if (!familyFilter) return true;
    const kind = normalizeVenueKindValue(venue.kind || venue.proposedKind);
    const isInstitution = INSTITUTION_VENUE_KINDS.has(kind);
    if (familyFilter === 'institution') return isInstitution;
    if (familyFilter === 'location') return !isInstitution;
    return true;
  });

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows: filtered.slice((safePage - 1) * limit, safePage * limit),
    metrics: {
      venues: enriched.length,
      candidates: enriched.filter((venue) => venue.pageStatus === 'candidate').length,
      published: enriched.filter((venue) => venue.pageStatus === 'published').length,
      withEvents: enriched.filter((venue) => venue.events > 0).length,
    },
  };
}

export async function buildAdminVenueDetail(db, venueId) {
  const [venueResult, eventsResult] = await Promise.all([
    db.query(
      `
        select
          venue.id,
          venue.slug,
          venue.title,
          venue.description,
          venue."shortDescription",
          venue."heroImageUrl",
          venue."seoH1",
          venue."seoTitle",
          venue."seoDescription",
          venue."canonicalPath",
          venue."isIndexable",
          venue.address,
          venue.latitude,
          venue.longitude,
          venue."metroStation",
          venue."wayToFind",
          venue."parkingInfo",
          venue."hookFact",
          venue.kind,
          venue."pageStatus",
          city.title as city
        from "Venue" venue
        left join "City" city on city.id = venue."cityId"
        where venue.id = $1
      `,
      [venueId],
    ),
    db.query(
      `
        select
          event.id,
          event.title,
          event.status,
          event."priceFromRub",
          session."startsAt"
        from "Event" event
        left join "EventSession" session on session."eventId" = event.id
        where event."venueId" = $1
        order by session."startsAt" asc nulls last
        limit 24
      `,
      [venueId],
    ),
  ]);

  const venue = venueResult.rows[0];
  if (!venue) return null;

  return {
    ...venue,
    events: eventsResult.rows.map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      priceFrom: event.priceFromRub,
      startsAt: event.startsAt,
    })),
  };
}

export async function updateAdminVenue(db, venueId, payload) {
  const normalized = normalizeVenuePayload(payload);
  const current = await buildAdminVenueDetail(db, venueId);
  if (!current) return null;
  const next = { ...current, ...normalized };
  const result = await db.query(
    `
      update "Venue"
      set
        title = $2,
        description = $3,
        "shortDescription" = $4,
        "heroImageUrl" = $5,
        "seoH1" = $6,
        "seoTitle" = $7,
        "seoDescription" = $8,
        "canonicalPath" = $9,
        "isIndexable" = $10,
        kind = $11::"VenueKind",
        "pageStatus" = $12::"VenuePageStatus",
        "metroStation" = $13,
        "wayToFind" = $14,
        "parkingInfo" = $15,
        "hookFact" = $16,
        "updatedAt" = now()
      where id = $1
      returning id
    `,
    [
      venueId,
      next.title,
      next.description,
      next.shortDescription,
      next.heroImageUrl,
      next.seoH1,
      next.seoTitle,
      next.seoDescription,
      next.canonicalPath,
      Boolean(next.isIndexable),
      next.kind || 'OTHER',
      next.pageStatus || 'NONE',
      next.metroStation ?? null,
      next.wayToFind ?? null,
      next.parkingInfo ?? null,
      next.hookFact ?? null,
    ],
  );

  if (!result.rows[0]) return null;
  return buildAdminVenueDetail(db, venueId);
}

export async function updateAdminEventTaxonomy(db, eventId, payload) {
  const categoryId = normalizeNullableString(payload?.categoryId);
  const primarySubcategoryId = normalizeNullableString(payload?.primarySubcategoryId);
  const subcategoryIds = Array.isArray(payload?.subcategoryIds) ? payload.subcategoryIds.map(normalizeNullableString).filter(Boolean) : [];
  const tagIds = Array.isArray(payload?.tagIds) ? payload.tagIds.map(normalizeNullableString).filter(Boolean) : [];
  const allSubcategoryIds = Array.from(new Set([primarySubcategoryId, ...subcategoryIds].filter(Boolean)));

  await db.query(
    `
      update "Event"
      set "categoryId" = $2,
          "primarySubcategoryId" = $3,
          "updatedAt" = now()
      where id = $1
    `,
    [eventId, categoryId, primarySubcategoryId],
  );
  await db.query('delete from "EventSubcategory" where "eventId" = $1', [eventId]);
  for (const subcategoryId of allSubcategoryIds) {
    await db.query(
      `
        insert into "EventSubcategory" ("eventId", "subcategoryId", "isPrimary")
        values ($1, $2, $3)
        on conflict ("eventId", "subcategoryId") do update set "isPrimary" = excluded."isPrimary"
      `,
      [eventId, subcategoryId, subcategoryId === primarySubcategoryId],
    );
  }

  await db.query('delete from "EventTag" where "eventId" = $1', [eventId]);
  for (const tagId of Array.from(new Set(tagIds))) {
    await db.query(
      `
        insert into "EventTag" ("eventId", "tagId")
        values ($1, $2)
        on conflict ("eventId", "tagId") do nothing
      `,
      [eventId, tagId],
    );
  }

  const event = (await eventRowsByIds(db, [eventId]))[0] || null;
  invalidateAdminGroupedEventsCache(db, 'event taxonomy');
  return { eventId, event };
}

/**
 * Заменяет STOP-пункты EventVenueRouteItem. Event.venueId (точка старта) не трогаем.
 * payload.links: [{ venueId|slug, role?: 'STOP', sortOrder?, label? }]
 */
export async function updateAdminEventVenueLinks(db, eventId, payload) {
  const exists = await db.query(`select id from "Event" where id = $1 limit 1`, [eventId]);
  if (!exists.rows[0]) return null;

  const rawLinks = Array.isArray(payload?.links) ? payload.links : [];
  const prepared = [];
  const seenVenueIds = new Set();

  for (let index = 0; index < rawLinks.length; index += 1) {
    const item = rawLinks[index] && typeof rawLinks[index] === 'object' ? rawLinks[index] : {};
    const role = String(item.role || 'STOP').trim().toUpperCase() || 'STOP';
    if (role !== 'STOP') continue;
    const locator = normalizeNullableString(item.venueId || item.slug);
    if (!locator) continue;
    const venueResult = await db.query(
      `select id from "Venue" where id = $1 or slug = $1 limit 1`,
      [locator],
    );
    const venueId = venueResult.rows[0]?.id;
    if (!venueId || seenVenueIds.has(venueId)) continue;
    seenVenueIds.add(venueId);
    const sortOrder = Number.isFinite(Number(item.sortOrder)) ? Math.trunc(Number(item.sortOrder)) : index;
    prepared.push({
      venueId,
      role: 'STOP',
      sortOrder,
      label: normalizeNullableString(item.label),
    });
  }

  prepared.sort((a, b) => a.sortOrder - b.sortOrder || a.venueId.localeCompare(b.venueId));

  await db.query(
    `delete from "event_venue_route_items" where "eventId" = $1 and role = 'STOP'::"RouteItemRole"`,
    [eventId],
  );

  for (let index = 0; index < prepared.length; index += 1) {
    const link = prepared[index];
    await db.query(
      `
        insert into "event_venue_route_items" (
          id, "eventId", "venueId", role, "sortOrder", label, "createdAt", "updatedAt"
        ) values (
          $1, $2, $3, 'STOP'::"RouteItemRole", $4, $5, now(), now()
        )
      `,
      [
        `evri_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
        eventId,
        link.venueId,
        Number.isFinite(link.sortOrder) ? link.sortOrder : index,
        link.label,
      ],
    );
  }

  const venueLinks = await loadAdminEventVenueLinks(db, eventId);
  return { eventId, venueLinks };
}

/** Geo suggest thresholds (aligned with scripts/lib/venue-route-geo.js + public nearby 300m). */
const SUGGEST_STOP_RADIUS_M = Number(process.env.SUGGEST_STOP_RADIUS_M || 150);
const SUGGEST_NEARBY_RADIUS_M = Number(process.env.SUGGEST_NEARBY_RADIUS_M || 300);
const SUGGEST_SOFT_RADIUS_M = Number(process.env.SUGGEST_SOFT_RADIUS_M || 500);
const SUGGEST_BBOX_DEG = Number(process.env.SUGGEST_BBOX_DEG || 0.008);
const SUGGEST_MAX_CANDIDATES = Number(process.env.MAX_CANDIDATES_PER_EVENT || 20);
const SUGGEST_KIND_ALLOWLIST = new Set([
  'MONUMENT',
  'PARK',
  'ATTRACTION',
  'MUSEUM_ART_SPACE',
  'OUTDOOR_LOCATION',
  'MEETING_POINT',
  'PIER',
  'VENUE',
]);
const SUGGEST_KIND_SCORE = {
  MONUMENT: 5,
  PARK: 5,
  ATTRACTION: 5,
  OUTDOOR_LOCATION: 4,
  MUSEUM_ART_SPACE: 3,
  PIER: 3,
  MEETING_POINT: 2,
  VENUE: 2,
};

function suggestConfidenceForDistance(distanceMeters) {
  const d = Number(distanceMeters);
  if (!Number.isFinite(d) || d < 0) return null;
  if (d <= SUGGEST_STOP_RADIUS_M) return 'high';
  if (d <= SUGGEST_NEARBY_RADIUS_M) return 'medium';
  if (d <= SUGGEST_SOFT_RADIUS_M) return 'low';
  return null;
}

function suggestRankScore({ distanceMeters, sameCity, kind }) {
  const kindScore = SUGGEST_KIND_SCORE[String(kind || '').toUpperCase()] || 0;
  return (sameCity ? 10 : 0) + kindScore - Number(distanceMeters) / 1000;
}

/**
 * Geo-кандидаты STOP от start venue события. Не пишет БД, не трогает Event.venueId.
 * options.radiusM - cap поиска (default 300, max soft 500).
 */
export async function suggestAdminEventVenueLinks(db, eventId, options = {}) {
  const radiusCap = Math.min(
    SUGGEST_SOFT_RADIUS_M,
    Math.max(1, Number(options.radiusM) || SUGGEST_NEARBY_RADIUS_M),
  );

  const eventResult = await db.query(
    `
      select
        e.id,
        e."venueId",
        e."primaryCityId",
        start_venue.latitude as "startLat",
        start_venue.longitude as "startLng",
        start_venue."cityId" as "startCityId"
      from "Event" e
      left join "Venue" start_venue on start_venue.id = e."venueId"
      where e.id = $1
      limit 1
    `,
    [eventId],
  );
  const event = eventResult.rows[0];
  if (!event) return null;

  const startLat = Number(event.startLat);
  const startLng = Number(event.startLng);
  if (!isValidVenueCoordinatePair(startLat, startLng)) {
    return {
      eventId,
      startVenueId: event.venueId || null,
      suggestions: [],
      reason: 'start_venue_missing_coords',
      thresholds: {
        high: SUGGEST_STOP_RADIUS_M,
        medium: SUGGEST_NEARBY_RADIUS_M,
        soft: SUGGEST_SOFT_RADIUS_M,
        radiusM: radiusCap,
      },
    };
  }

  const existingResult = await db.query(
    `
      select "venueId"
      from "event_venue_route_items"
      where "eventId" = $1 and role = 'STOP'::"RouteItemRole"
    `,
    [eventId],
  );
  const existingStops = new Set(existingResult.rows.map((row) => row.venueId));

  const cityId = event.primaryCityId || event.startCityId;
  const kinds = [...SUGGEST_KIND_ALLOWLIST];
  const venueResult = await db.query(
    `
      select
        v.id,
        v.slug,
        v.title,
        v.kind::text as kind,
        v."cityId",
        v."pageStatus"::text as "pageStatus",
        v.latitude,
        v.longitude
      from "Venue" v
      where v.latitude is not null
        and v.longitude is not null
        and v.kind::text = any($1::text[])
        and v.kind <> 'ONLINE'::"VenueKind"
        and v."pageStatus" in ('PUBLISHED'::"VenuePageStatus", 'CANDIDATE'::"VenuePageStatus")
        and abs(v.latitude - $2) <= $3
        and abs(v.longitude - $4) <= $3
        ${cityId ? 'and v."cityId" = $5' : ''}
    `,
    cityId
      ? [kinds, startLat, SUGGEST_BBOX_DEG, startLng, cityId]
      : [kinds, startLat, SUGGEST_BBOX_DEG, startLng],
  );

  const suggestions = [];
  for (const row of venueResult.rows) {
    if (row.id === event.venueId) continue;
    if (existingStops.has(row.id)) continue;
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!isValidVenueCoordinatePair(latitude, longitude)) continue;

    const distanceMeters = haversineMeters(startLat, startLng, latitude, longitude);
    if (distanceMeters > radiusCap) continue;
    const confidence = suggestConfidenceForDistance(distanceMeters);
    if (!confidence) continue;

    const sameCity = Boolean(cityId && row.cityId === cityId);
    suggestions.push({
      venueId: row.id,
      slug: row.slug,
      title: row.title,
      kind: row.kind,
      pageStatus: row.pageStatus,
      distanceMeters: Math.round(distanceMeters * 10) / 10,
      confidence,
      sameCity,
      role: 'STOP',
      action: confidence === 'high' && sameCity ? 'auto-apply-ok' : 'suggest-only',
      rank: suggestRankScore({ distanceMeters, sameCity, kind: row.kind }),
    });
  }

  suggestions.sort((a, b) => b.rank - a.rank || a.distanceMeters - b.distanceMeters);

  return {
    eventId,
    startVenueId: event.venueId || null,
    suggestions: suggestions.slice(0, SUGGEST_MAX_CANDIDATES).map(({ rank, ...rest }) => rest),
    thresholds: {
      high: SUGGEST_STOP_RADIUS_M,
      medium: SUGGEST_NEARBY_RADIUS_M,
      soft: SUGGEST_SOFT_RADIUS_M,
      radiusM: radiusCap,
      bboxDeg: SUGGEST_BBOX_DEG,
    },
  };
}

/**
 * Merge-insert STOP links. Never wipe existing STOP. Never touches Event.venueId.
 * payload: { mode?: 'merge', links: [{ venueId|slug, role?: 'STOP', sortOrder?, label? }] }
 */
export async function applyAdminEventVenueLinks(db, eventId, payload) {
  const exists = await db.query(
    `select id, "venueId" from "Event" where id = $1 limit 1`,
    [eventId],
  );
  const event = exists.rows[0];
  if (!event) return null;

  const mode = String(payload?.mode || 'merge').trim().toLowerCase();
  if (mode !== 'merge') {
    return { error: 'unsupported_mode', message: 'Only mode=merge is allowed (no replace-all wipe).' };
  }

  const rawLinks = Array.isArray(payload?.links) ? payload.links : [];
  const prepared = [];
  const seenVenueIds = new Set();

  for (let index = 0; index < rawLinks.length; index += 1) {
    const item = rawLinks[index] && typeof rawLinks[index] === 'object' ? rawLinks[index] : {};
    const role = String(item.role || 'STOP').trim().toUpperCase() || 'STOP';
    if (role !== 'STOP') continue;
    const locator = normalizeNullableString(item.venueId || item.slug);
    if (!locator) continue;
    const venueResult = await db.query(
      `select id from "Venue" where id = $1 or slug = $1 limit 1`,
      [locator],
    );
    const venueId = venueResult.rows[0]?.id;
    if (!venueId || seenVenueIds.has(venueId)) continue;
    if (venueId === event.venueId) continue;
    seenVenueIds.add(venueId);
    const sortOrder = Number.isFinite(Number(item.sortOrder))
      ? Math.trunc(Number(item.sortOrder))
      : 100 + index;
    prepared.push({
      venueId,
      sortOrder,
      label: normalizeNullableString(item.label),
    });
  }

  const applied = [];
  for (const link of prepared) {
    const result = await db.query(
      `
        insert into "event_venue_route_items" (
          id, "eventId", "venueId", role, "sortOrder", label, "createdAt", "updatedAt"
        ) values (
          $1, $2, $3, 'STOP'::"RouteItemRole", $4, $5, now(), now()
        )
        on conflict ("eventId", "venueId", role) do nothing
        returning id, "eventId", "venueId", role, "sortOrder", label
      `,
      [
        `evri_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
        eventId,
        link.venueId,
        link.sortOrder,
        link.label,
      ],
    );
    if (result.rows[0]) {
      applied.push({
        id: result.rows[0].id,
        venueId: result.rows[0].venueId,
        role: result.rows[0].role,
        sortOrder: result.rows[0].sortOrder,
        label: result.rows[0].label,
      });
    }
  }

  invalidateAdminGroupedEventsCache(db, 'event venue links merge');
  const venueLinks = await loadAdminEventVenueLinks(db, eventId);
  return { eventId, mode: 'merge', applied, venueLinks };
}

async function loadAdminEventVenueLinks(db, eventId) {
  const result = await db.query(
    `
      select
        link.id,
        link."eventId",
        link."venueId",
        link.role,
        link."sortOrder",
        link.label,
        venue.slug,
        venue.title,
        venue.kind,
        venue."pageStatus"
      from "event_venue_route_items" link
      join "Venue" venue on venue.id = link."venueId"
      where link."eventId" = $1
      order by link."sortOrder", venue.title
    `,
    [eventId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    venueId: row.venueId,
    role: row.role,
    sortOrder: row.sortOrder,
    label: row.label,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    pageStatus: row.pageStatus,
  }));
}

function mergeReadinessIssues(left = [], right = []) {
  const byCode = new Map();
  for (const issue of [...(left || []), ...(right || [])]) {
    if (!issue?.code || byCode.has(issue.code)) continue;
    byCode.set(issue.code, issue);
  }
  return Array.from(byCode.values());
}

/**
 * After sibling grouping: a future slot in the group clears NO_FUTURE_SESSIONS,
 * so a past-only sibling cannot paint the whole card as blocked. Other high issues stay.
 */
export function finalizeGroupedAdminReadiness(group, groupHasFutureSession) {
  const sourceIssues =
    Array.isArray(group.readinessIssues) && group.readinessIssues.length
      ? group.readinessIssues
      : (group.readinessCodes || [])
          .map((code) => {
            const meta = READINESS_ISSUE_META[code];
            return meta ? { code, label: meta.label, severity: meta.severity } : null;
          })
          .filter(Boolean);

  const issues = groupHasFutureSession
    ? sourceIssues.filter((issue) => issue.code !== 'NO_FUTURE_SESSIONS')
    : sourceIssues.slice();

  const reasons = issues.map((issue) => issue.label);
  const severity = readinessSeverity(issues);
  const readiness = issues.length ? (severity === 'high' ? 'blocked' : 'review') : 'ready';
  const status = issues.length ? 'needs_review' : 'ready';

  return {
    ...group,
    readinessIssues: issues,
    readinessCodes: issues.map((issue) => issue.code),
    reasons,
    severity,
    readiness,
    status,
  };
}

function groupAdminEventRows(events) {
  const groups = new Map();

  for (const event of events) {
    const key = adminEventGroupKey(event);
    const eventHasFuture = hasFutureSession(event);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        ...event,
        groupKey: key,
        groupEventIds: [event.id],
        groupedEventsCount: 1,
        slotCount: event.slotCount || (event.startsAt ? 1 : 0),
        landingHits: [...(event.landingHits || [])],
        tags: [...(event.tags || [])],
        reasons: [...(event.reasons || [])],
        readinessCodes: [...(event.readinessCodes || [])],
        readinessIssues: [...(event.readinessIssues || [])],
        _groupHasFutureSession: eventHasFuture,
      });
      continue;
    }

    current.groupEventIds.push(event.id);
    current.groupedEventsCount += 1;
    current.slotCount += event.slotCount || (event.startsAt ? 1 : 0);
    current.landingHits = uniqueValues(current.landingHits.concat(event.landingHits || []));
    current.tags = uniqueValues(current.tags.concat(event.tags || []));
    current.reasons = uniqueValues(current.reasons.concat(event.reasons || []));
    current.readinessCodes = uniqueValues((current.readinessCodes || []).concat(event.readinessCodes || []));
    current.readinessIssues = mergeReadinessIssues(current.readinessIssues, event.readinessIssues);
    current.publishBlockers = uniqueValues((current.publishBlockers || []).concat(event.publishBlockers || []));
    current.publishWarnings = uniqueValues((current.publishWarnings || []).concat(event.publishWarnings || []));
    current.canPublish = Boolean(current.canPublish && event.canPublish);
    current.hasImage = Boolean(current.hasImage || event.hasImage);
    const hadPurchaseReady = Boolean(current.purchaseReady);
    current.purchaseReady = Boolean(current.purchaseReady || event.purchaseReady);
    current.purchaseProvider = current.purchaseProvider || event.purchaseProvider || null;
    if (!current.purchaseUrlSource || (current.purchaseUrlSource !== 'offer' && event.purchaseUrlSource === 'offer')) {
      current.purchaseUrlSource = event.purchaseUrlSource || current.purchaseUrlSource || null;
    }
    current.vacant = sumNullableNumbers([current.vacant, event.vacant]);
    current.priceFrom = minNullableNumber([current.priceFrom, event.priceFrom]);
    current.offerPriceRub = minNullableNumber([current.offerPriceRub, event.offerPriceRub]);
    current._groupHasFutureSession = Boolean(current._groupHasFutureSession || eventHasFuture);

    if (event.startsAt && (!current.startsAt || new Date(event.startsAt) < new Date(current.startsAt))) {
      current.startsAt = event.startsAt;
      current.id = event.id;
      current.slug = event.slug;
      current.sourceSlug = event.sourceSlug;
      current.externalId = event.externalId;
      current.offerSourceCode = event.offerSourceCode;
      current.offerTitle = event.offerTitle;
      current.offerWidgetUrl = event.offerWidgetUrl;
      current.offerDeeplinkUrl = event.offerDeeplinkUrl;
    }

    current.severity = maxSeverity(current.severity, event.severity);
    current.readiness = worstReadiness(current.readiness, event.readiness);
    current.status = current.status === 'needs_review' || event.status === 'needs_review' ? 'needs_review' : 'ready';
    if ((!hadPurchaseReady && event.purchaseReady) || (!String(current.offerStatus || '').toLowerCase().includes('widget') && String(event.offerStatus || '').toLowerCase().includes('widget'))) {
      current.offerStatus = event.offerStatus;
      current.offerSourceCode = event.offerSourceCode || current.offerSourceCode;
      current.offerTitle = event.offerTitle || current.offerTitle;
      current.offerWidgetUrl = event.offerWidgetUrl || current.offerWidgetUrl;
      current.offerDeeplinkUrl = event.offerDeeplinkUrl || current.offerDeeplinkUrl;
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const { _groupHasFutureSession, ...rest } = group;
      return finalizeGroupedAdminReadiness(rest, Boolean(_groupHasFutureSession));
    })
    .sort((a, b) => {
      const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime || String(a.title).localeCompare(String(b.title), 'ru');
    });
}

function groupPublicEventRows(events) {
  const groups = new Map();

  for (const event of events) {
    const key = publicEventGroupKey(event);
    const eventTimeZone = resolveCityTimeZone(event.city, event.destination);
    const slot = event.startsAt
      ? {
          eventId: event.id,
          startsAt: event.startsAt,
          dateLabel: formatDate(event.startsAt, eventTimeZone),
          timeLabel: formatTime(event.startsAt, eventTimeZone),
          purchaseUrl: purchaseInfo(event).url || buildProviderWidgetUrl(event),
          sourceStatus: event.sourceStatus || null,
          vacant: event.vacant ?? null,
        }
      : null;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        ...event,
        groupKey: key,
        groupEventIds: [event.id],
        groupedEventsCount: 1,
        sessionCount: event.slotCount || (slot ? 1 : 0),
        upcomingSlots: slot ? [slot] : [],
        tags: [...(event.tags || [])],
      });
      continue;
    }

    current.groupEventIds.push(event.id);
    current.groupedEventsCount += 1;
    current.sessionCount += event.slotCount || (slot ? 1 : 0);
    current.tags = uniqueValues(current.tags.concat(event.tags || []));
    current.priceFrom = minNullableNumber([current.priceFrom, event.priceFrom]);
    current.offerPriceRub = minNullableNumber([current.offerPriceRub, event.offerPriceRub]);
    current.vacant = sumNullableNumbers([current.vacant, event.vacant]);
    if (slot) current.upcomingSlots.push(slot);

    if (event.imageUrl && !current.imageUrl) current.imageUrl = event.imageUrl;
    if (event.override?.imageUrl && !current.override?.imageUrl) current.override = { ...(current.override || {}), imageUrl: event.override.imageUrl };

    if (event.startsAt && shouldPromoteGroupedRepresentative(current, event)) {
      current.startsAt = event.startsAt;
      current.id = event.id;
      current.slug = event.slug;
      current.sourceSlug = event.sourceSlug;
      current.externalId = event.externalId;
      current.sourceStatus = event.sourceStatus;
      current.offerSourceCode = event.offerSourceCode;
      current.offerTitle = event.offerTitle;
      current.offerWidgetUrl = event.offerWidgetUrl;
      current.offerDeeplinkUrl = event.offerDeeplinkUrl;
    }
  }

  return Array.from(groups.values())
    .map((event) => ({
      ...event,
      upcomingSlots: uniqueSlots(event.upcomingSlots).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    }))
    .sort((a, b) => {
      const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime || String(a.title).localeCompare(String(b.title), 'ru');
    });
}

function adminEventGroupKey(event) {
  return buildAdminEventGroupKey({
    sourceName: event.source,
    title: event.title,
    city: event.city,
    venue: event.venue,
  });
}

function publicEventGroupKey(event) {
  const city = resolvePublicSessionCity(event);
  const venue = formatPublicVenueTitle(event.venue) || event.venue;
  const rawTitle = event.overrideTitle || event.title;
  const normalizedTitle = normalizeCatalogGroupTitle(rawTitle);
  let titleForKey = normalizedTitle;
  if (!titleForKey || isDateLikeCatalogTitle(rawTitle)) {
    const venueTitle = formatPublicVenueTitle(event.venue) || String(event.venue || '').trim();
    titleForKey = venueTitle || rawTitle;
  }
  return [
    normalizeGroupPart(event.sourceLabel || event.source || event.sourceCode || event.sourceName),
    normalizeGroupPart(titleForKey),
    normalizeGroupPart(city),
    normalizeGroupPart(venue),
  ].join('|');
}


function primaryOfferMap(offers) {
  const map = new Map();
  const sorted = [...offers].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const aPrice = Number.isFinite(a.priceRub) ? a.priceRub : Number.POSITIVE_INFINITY;
    const bPrice = Number.isFinite(b.priceRub) ? b.priceRub : Number.POSITIVE_INFINITY;
    return aPrice - bPrice;
  });

  for (const offer of sorted) {
    if (!map.has(offer.eventId)) map.set(offer.eventId, offer);
  }

  return map;
}

function isDateLikeCatalogTitle(title) {
  const text = String(title || '').trim();
  if (!text) return true;
  if (/^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?/u.test(text)) return true;
  if (/^\d{1,2}:\d{2}/u.test(text)) return true;
  return false;
}

/** Убирает дату/время/город из заголовка TC-событий для группировки карточек каталога. */
function normalizeCatalogGroupTitle(rawTitle) {
  let text = String(rawTitle || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  text = text
    .replace(
      /^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?(?:\s*(?:,\s*|\s+в\s+))?\d{1,2}:\d{2}(?:\s*(?:\([^)]{2,40}\))?)?(?:\s*[-–—]\s*)?/iu,
      '',
    )
    .trim();
  text = text.replace(/\s*\([^)]{2,40}\)\s*$/u, '').trim();
  text = text.replace(/^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?(?:\s*,\s*)?/u, '').trim();

  return text;
}

const CATALOG_GROUP_TITLE_SOURCE_SQL = `coalesce(nullif(trim("overrideTitle"), ''), title)`;

function catalogGroupTitleSqlExpression(column = CATALOG_GROUP_TITLE_SOURCE_SQL) {
  return `regexp_replace(
    regexp_replace(
      regexp_replace(
        trim(coalesce(${column}, '')),
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
}

function displayPriceFrom(...values) {
  return minNullableNumber(values);
}

function maxSeverity(left, right) {
  const rank = { low: 0, medium: 1, high: 2 };
  return (rank[right] || 0) > (rank[left] || 0) ? right : left;
}

function worstReadiness(left, right) {
  const rank = { ready: 0, review: 1, blocked: 2 };
  return (rank[right] || 0) > (rank[left] || 0) ? right : left;
}

async function resolveAdminEventGroupIds(db, eventId) {
  const eventResult = await db.query(
    `
      select
        e.title,
        e."venueId",
        e."primaryCityId",
        source_link."sourceId"
      from "Event" e
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      where e.id = $1
      limit 1
    `,
    [eventId],
  );
  const event = eventResult.rows[0];
  if (!event) return [];

  const groupResult = await db.query(
    `
      select distinct e.id
      from "Event" e
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      where lower(trim(e.title)) = lower(trim($1))
        and e."venueId" is not distinct from $2
        and e."primaryCityId" is not distinct from $3
        and source_link."sourceId" is not distinct from $4
      order by e.id
    `,
    [event.title, event.venueId, event.primaryCityId, event.sourceId],
  );

  return groupResult.rows.map((row) => row.id);
}

export async function buildAdminEventDetail(db, eventId) {
  const eventIds = await resolveAdminEventGroupIds(db, eventId);
  if (!eventIds.length) {
    return {
      eventId,
      eventIds: [],
      event: null,
      override: null,
      summary: {
        slots: 0,
        offers: 0,
        vacant: null,
        priceFrom: null,
        soldTickets: 0,
        orders: 0,
      },
      sessions: [],
      offers: [],
      sales: {
        soldTickets: 0,
        orders: 0,
        ticketStatuses: [],
      },
      venueLinks: [],
    };
  }

  const primaryEventId = eventIds.includes(eventId) ? eventId : eventIds[0];

  const [sessionsResult, offersResult, salesResult, orderStatusResult, contentResult, venueLinks] = await Promise.all([
    db.query(
      `
        select
          id,
          "eventId",
          "startsAt",
          "endsAt",
          "sourceStatus",
          "priceFromRub",
          "ticketsVacant",
          "externalId"
        from "EventSession"
        where "eventId" = any($1)
        order by "startsAt" asc nulls last
      `,
      [eventIds],
    ),
    db.query(
      `
        select
          id,
          "eventId",
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl",
          active
        from "EventOffer"
        where "eventId" = any($1)
        order by active desc, "priceRub" asc nulls last
      `,
      [eventIds],
    ),
    db.query(
      `
        select
          count(ticket.id)::int as "soldTickets",
          count(distinct ext_order.id)::int as orders
        from "ExternalTicket" ticket
        left join "ExternalOrder" ext_order on ext_order.id = ticket."externalOrderId"
        where ticket."eventId" = any($1)
      `,
      [eventIds],
    ),
    db.query(
      `
        select
          coalesce(ticket.status, 'unknown') as status,
          count(ticket.id)::int as tickets
        from "ExternalTicket" ticket
        where ticket."eventId" = any($1)
        group by ticket.status
        order by tickets desc, status asc
      `,
      [eventIds],
    ),
    db.query(
      `
        select
          e.id,
          e.title,
          e.description,
          e."imageUrl",
          e."seoH1",
          e."seoTitle",
          e."seoDescription",
          e."canonicalPath",
          e."isIndexable",
          override.title as "overrideTitle",
          override.description as "overrideDescription",
          override."shortDescription" as "overrideShortDescription",
          override."imageUrl" as "overrideImageUrl",
          override."seoH1" as "overrideSeoH1",
          override."seoTitle" as "overrideSeoTitle",
          override."seoDescription" as "overrideSeoDescription",
          override."canonicalPath" as "overrideCanonicalPath",
          override."isIndexable" as "overrideIsIndexable",
          override."editorStatus" as "overrideEditorStatus",
          override."mergeGroupKey" as "overrideMergeGroupKey"
        from "Event" e
        left join "EventOverride" override on override."eventId" = e.id
        where e.id = $1
        limit 1
      `,
      [primaryEventId],
    ),
    loadAdminEventVenueLinks(db, primaryEventId),
  ]);

  const sessions = sessionsResult.rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    startsAt: normalizeStartsAt(row.startsAt),
    endsAt: row.endsAt,
    sourceStatus: row.sourceStatus,
    priceFrom: row.priceFromRub,
    vacant: row.ticketsVacant,
    externalId: row.externalId,
  }));
  const offers = offersResult.rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    sourceCode: row.sourceCode,
    title: row.title,
    priceRub: row.priceRub,
    widgetUrl: row.widgetUrl,
    deeplinkUrl: row.deeplinkUrl,
    active: row.active,
  }));
  const soldTickets = salesResult.rows[0]?.soldTickets || 0;
  const orders = salesResult.rows[0]?.orders || 0;
  const vacantValues = sessions.map((session) => session.vacant).filter((value) => Number.isFinite(value));
  const priceValues = sessions
    .map((session) => session.priceFrom)
    .concat(offers.map((offer) => offer.priceRub))
    .filter((value) => Number.isFinite(value) && value >= MIN_DISPLAY_PRICE_RUB);
  const contentRow = contentResult.rows[0] || null;
  const event = contentRow
    ? {
        id: contentRow.id,
        title: contentRow.title,
        description: contentRow.description,
        imageUrl: contentRow.imageUrl,
        seoH1: contentRow.seoH1,
        seoTitle: contentRow.seoTitle,
        seoDescription: contentRow.seoDescription,
        canonicalPath: contentRow.canonicalPath,
        isIndexable: contentRow.isIndexable,
      }
    : null;
  const override = contentRow
    ? {
        title: contentRow.overrideTitle,
        description: contentRow.overrideDescription,
        shortDescription: contentRow.overrideShortDescription,
        imageUrl: contentRow.overrideImageUrl,
        seoH1: contentRow.overrideSeoH1,
        seoTitle: contentRow.overrideSeoTitle,
        seoDescription: contentRow.overrideSeoDescription,
        canonicalPath: contentRow.overrideCanonicalPath,
        isIndexable: contentRow.overrideIsIndexable,
        editorStatus: contentRow.overrideEditorStatus,
        mergeGroupKey: contentRow.overrideMergeGroupKey,
      }
    : null;

  return {
    eventId,
    eventIds,
    event,
    override,
    summary: {
      slots: sessions.length,
      offers: offers.length,
      vacant: vacantValues.length ? vacantValues.reduce((sum, value) => sum + value, 0) : null,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      soldTickets,
      orders,
    },
    sessions,
    offers,
    sales: {
      soldTickets,
      orders,
      ticketStatuses: orderStatusResult.rows,
    },
    venueLinks,
  };
}

export async function updateAdminEventOverride(db, eventId, payload) {
  const normalized = normalizeOverridePayload(payload);
  const currentResult = await db.query(
    `
      select
        title,
        description,
        "shortDescription",
        "imageUrl",
        "seoH1",
        "seoTitle",
        "seoDescription",
        "canonicalPath",
        "isIndexable",
        "editorStatus",
        "mergeGroupKey"
      from "EventOverride"
      where "eventId" = $1
    `,
    [eventId],
  );
  const current = currentResult.rows[0] || {};
  const next = {
    title: current.title ?? null,
    description: current.description ?? null,
    shortDescription: current.shortDescription ?? null,
    imageUrl: current.imageUrl ?? null,
    seoH1: current.seoH1 ?? null,
    seoTitle: current.seoTitle ?? null,
    seoDescription: current.seoDescription ?? null,
    canonicalPath: current.canonicalPath ?? null,
    isIndexable: current.isIndexable ?? null,
    editorStatus: current.editorStatus ?? null,
    mergeGroupKey: current.mergeGroupKey ?? null,
    ...normalized,
  };

  const result = await db.query(
    `
      insert into "EventOverride" (
        id,
        "eventId",
        title,
        description,
        "shortDescription",
        "imageUrl",
        "seoH1",
        "seoTitle",
        "seoDescription",
        "canonicalPath",
        "isIndexable",
        "editorStatus",
        "mergeGroupKey",
        "updatedAt"
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
      on conflict ("eventId") do update set
        title = excluded.title,
        description = excluded.description,
        "shortDescription" = excluded."shortDescription",
        "imageUrl" = excluded."imageUrl",
        "seoH1" = excluded."seoH1",
        "seoTitle" = excluded."seoTitle",
        "seoDescription" = excluded."seoDescription",
        "canonicalPath" = excluded."canonicalPath",
        "isIndexable" = excluded."isIndexable",
        "editorStatus" = excluded."editorStatus",
        "mergeGroupKey" = excluded."mergeGroupKey",
        "updatedAt" = now()
      returning
        title,
        description,
        "shortDescription",
        "imageUrl",
        "seoH1",
        "seoTitle",
        "seoDescription",
        "canonicalPath",
        "isIndexable",
        "editorStatus",
        "mergeGroupKey"
    `,
    [
      randomUUID(),
      eventId,
      next.title,
      next.description,
      next.shortDescription,
      next.imageUrl,
      next.seoH1,
      next.seoTitle,
      next.seoDescription,
      next.canonicalPath,
      next.isIndexable,
      next.editorStatus,
      next.mergeGroupKey,
    ],
  );

  invalidateAdminGroupedEventsCache(db, 'event override');

  return {
    eventId,
    override: mapOverrideRow(result.rows[0]),
  };
}

export async function buildPublicHome(db) {
  const now = Date.now();
  if (publicHomeCache && publicHomeCache.expiresAt > now) {
    return publicHomeCache.payload;
  }

  const t0 = Date.now();
  // Catalog first (destinations/landings/venues derive from it) - avoid parallel hub SQL.
  const [stats, catalogSessions] = await Promise.all([db.stats(), publicCatalogSessions(db)]);
  // Soft hub or top-N from sessions - never await full publicVenueHubRows cold rebuild (~5s).
  const venues = await publicVenuesForHome(db, catalogSessions, 36);
  const destinations = buildPublicDestinationRowsFromSessions(catalogSessions);
  // Compact card DTO only - full session blobs made /api/public/home ~1.2MB.
  const sessions = catalogSessions
    .filter(sessionHasCoverImage)
    .slice(0, 180)
    .map((session) => toPublicHomeCardSession(session));
  // Prefer catalog landingSlugs - rematch of 3k sessions was ~1.5s CPU on MSK.
  const landings = buildPublicLandings(catalogSessions, { preferCachedSlugs: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    stats: {
      events: catalogSessions.length || sessions.length || stats.events || 0,
      destinations: destinations.length,
      venues: stats.venues || 0,
      landings: landings.length,
    },
    destinations,
    landings,
    sessions,
    venues,
  };

  publicHomeCache = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    payload,
  };

  console.log(
    `buildPublicHome: ${catalogSessions.length} sessions, ${venues.length} venues in ${Date.now() - t0}ms`,
  );

  return payload;
}

export async function buildPublicDestinations(db) {
  const now = Date.now();
  if (publicDestinationsCache && publicDestinationsCache.expiresAt > now) {
    return publicDestinationsCache.payload;
  }

  if (publicHomeCache && publicHomeCache.expiresAt > now) {
    const payload = {
      generatedAt: publicHomeCache.payload.generatedAt,
      destinations: publicHomeCache.payload.destinations,
    };
    publicDestinationsCache = {
      expiresAt: publicHomeCache.expiresAt,
      payload,
    };
    return payload;
  }

  const destinations = await destinationRows(db);
  const payload = {
    generatedAt: new Date().toISOString(),
    destinations,
  };

  publicDestinationsCache = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    payload,
  };

  return payload;
}

export async function buildPublicHomePreview(db) {
  const now = Date.now();
  if (publicHomePreviewCache && publicHomePreviewCache.expiresAt > now) {
    return publicHomePreviewCache.payload;
  }

  if (publicHomeCache && publicHomeCache.expiresAt > now) {
    const home = publicHomeCache.payload;
    const payload = {
      generatedAt: home.generatedAt,
      sessions: home.sessions.slice(0, PUBLIC_HOME_PREVIEW_LIMIT),
      landings: home.landings,
    };
    publicHomePreviewCache = {
      expiresAt: publicHomeCache.expiresAt,
      payload,
    };
    return payload;
  }

  const catalogSessions = await publicCatalogSessions(db);
  const payload = {
    generatedAt: new Date().toISOString(),
    sessions: catalogSessions
      .filter(sessionHasCoverImage)
      .slice(0, PUBLIC_HOME_PREVIEW_LIMIT)
      .map((session) => toPublicHomeCardSession(session)),
    landings: buildPublicLandings(catalogSessions),
  };

  publicHomePreviewCache = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    payload,
  };

  return payload;
}

export async function buildPublicStats(db) {
  const now = Date.now();
  if (publicStatsCache && publicStatsCache.expiresAt > now) {
    return publicStatsCache.payload;
  }

  const [sessions, destinations, stats] = await Promise.all([
    publicCatalogSessions(db),
    destinationSummaryRowsFast(db),
    db.stats(),
  ]);

  const saleableGroups = new Set();
  for (const session of sessions) {
    if (session.purchaseReady === false) continue;
    saleableGroups.add(session.groupKey || session.id);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    stats: {
      events: saleableGroups.size,
      destinations: destinations.length,
      venues: stats.venues || 0,
      landings: LANDING_RULES.length,
    },
  };

  publicStatsCache = { expiresAt: now + PUBLIC_CATALOG_CACHE_MS, payload };
  return payload;
}

export async function buildPublicSearch(db, searchParams) {
  const q = String(searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) {
    return { generatedAt: new Date().toISOString(), query: q, items: [] };
  }

  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const [sessions, destinations] = await Promise.all([publicCatalogSessions(db), destinationRows(db)]);

  let scopedSessions = sessions;
  if (cityFilter && cityFilter !== 'all') {
    scopedSessions = sessions.filter((session) => {
      const cityName = String(session.city || '').toLowerCase();
      const destination = String(session.destination || '').toLowerCase();
      const citySlug = String(session.citySlug || session.sourceCitySlug || '').toLowerCase();
      return cityName === cityFilter || destination === cityFilter || cityName.includes(cityFilter) || citySlug === cityFilter;
    });
  }

  const items = [];
  const seen = new Set();
  const pushItem = (item, key) => {
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const session of scopedSessions) {
    if (items.length >= 8) break;
    const haystack = [
      session.title,
      session.city,
      session.destination,
      session.venue,
      session.category,
      ...(session.tags || []),
      ...(session.subcategories || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) continue;
    pushItem(
      {
        type: 'event',
        label: session.title,
        sublabel: [session.city, session.venue].filter(Boolean).join(' · '),
        href: `/events/${session.slug}`,
        imageUrl: session.imageUrl || null,
      },
      `event:${session.groupKey || session.id}`,
    );
  }

  if (items.length < 8) {
    for (const dest of destinations) {
      if (items.length >= 8) break;
      const name = String(dest.name || '').toLowerCase();
      const slug = String(dest.slug || '').toLowerCase();
      if (!name.includes(q) && !slug.includes(q)) continue;
      if (dest.type !== 'city' || !dest.slug) continue;
      pushItem(
        {
          type: 'city',
          label: dest.name,
          sublabel: `${dest.events} событий`,
          href: `/cities/${dest.slug}`,
          imageUrl: resolveCityCardImageFromSlug(dest.slug),
        },
        `city:${dest.slug}`,
      );
    }
  }

  if (items.length < 8) {
    const landings = buildPublicLandings(sessions).filter(
      (landing) => landing.events > 0 && !buildOffSeasonLandingSlugs().has(landing.slug),
    );
    for (const landing of landings) {
      if (items.length >= 8) break;
      const label = `${landing.title} ${landing.subtitle}`.toLowerCase();
      if (!label.includes(q) && !landing.slug.includes(q)) continue;
      pushItem(
        {
          type: 'landing',
          label: landing.title,
          sublabel: landing.subtitle,
          href: publicLandingHref(landing.slug),
          imageUrl: landing.imageUrl || null,
        },
        `landing:${landing.slug}`,
      );
    }
  }

  return { generatedAt: new Date().toISOString(), query: q, items: items.slice(0, 8) };
}

const PROMO_LANDING_ORDER = [
  'spb-yards',
  'bridges-night',
  'moscow-city-day',
  'moscow-dinner-boat',
  'river-party',
  'concerts-genre',
  'family-kids',
  'new-year',
  'bus-tours',
  'river-cruises',
  'standup',
  'planetarium',
  'active-sport',
  'moscow-museums',
];

const PUBLIC_LANDING_CATEGORY_PATH = new Map([
  ['river-cruises', 'rechnye-progulki'],
  ['bus-tours', 'avtobusnye-ekskursii'],
  ['river-party', 'vecherinki-na-teplohode'],
  ['standup', 'stendap-i-yumor'],
  ['family-kids', 'detyam-i-semyam'],
  ['concerts-genre', 'kontserty'],
  ['active-sport', 'aktivnyj-otdyh'],
  ['new-year', 'novyj-god'],
  ['salute-9-may', 'salut-9-maya'],
]);

const PUBLIC_CITY_LANDING_PATH = new Map([
  ['bridges-night', 'night-bridges'],
  ['spb-yards', 'spb-yards'],
  ['moscow-dinner-boat', 'dinner-boat'],
  ['moscow-museums', 'moscow-museums'],
  ['moscow-city-day', 'den-goroda'],
  ['planetarium', 'planetarium'],
]);

const PUBLIC_MULTI_CITY_LANDINGS = new Set(['river-cruises', 'bus-tours', 'river-party', 'salute-9-may', 'new-year']);
const PUBLIC_CITY_SCOPED_LANDINGS = new Set(PUBLIC_CITY_LANDING_PATH.keys());
const PUBLIC_DEFAULT_CITY_BY_LANDING = new Map([
  ['bridges-night', 'saint-petersburg'],
  ['spb-yards', 'saint-petersburg'],
  ['moscow-dinner-boat', 'moscow'],
  ['moscow-museums', 'moscow'],
  ['moscow-city-day', 'moscow'],
  ['planetarium', 'saint-petersburg'],
]);

/** Канон города в публичном URL (СПб — полное saint-petersburg). */
const PUBLIC_CITY_PATH_SEGMENT = new Map([
  ['moscow', 'moscow'],
  ['moskva', 'moscow'],
  ['msk', 'moscow'],
  ['saint-petersburg', 'saint-petersburg'],
  ['sankt-peterburg', 'saint-petersburg'],
  ['spb', 'saint-petersburg'],
  ['peterburg', 'saint-petersburg'],
  ['kazan', 'kazan'],
  ['nizhny-novgorod', 'nizhny-novgorod'],
  ['nizhniy-novgorod', 'nizhny-novgorod'],
  ['samara', 'samara'],
  ['sochi', 'sochi'],
  ['kaliningrad', 'kaliningrad'],
  ['ekaterinburg', 'ekaterinburg'],
  ['rostov-on-don', 'rostov-on-don'],
  ['rostov-na-donu', 'rostov-on-don'],
  ['rostov', 'rostov-on-don'],
]);

function publicCityPathSegment(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return '';
  if (PUBLIC_CITY_PATH_SEGMENT.has(key)) return PUBLIC_CITY_PATH_SEGMENT.get(key);
  const canonical = canonicalCitySlug(key);
  if (PUBLIC_CITY_PATH_SEGMENT.has(canonical)) return PUBLIC_CITY_PATH_SEGMENT.get(canonical);
  if (canonical === 'sankt-peterburg') return 'saint-petersburg';
  if (canonical === 'moskva') return 'moscow';
  return canonical || key;
}

function publicLandingHref(slug, citySlug = null) {
  if (PUBLIC_CITY_SCOPED_LANDINGS.has(slug)) {
    const city = PUBLIC_DEFAULT_CITY_BY_LANDING.get(slug) || citySlug;
    const citySegment = publicCityPathSegment(city);
    const topic = PUBLIC_CITY_LANDING_PATH.get(slug) || slug;
    return `/${citySegment}/${topic}/`;
  }

  const categoryPath = PUBLIC_LANDING_CATEGORY_PATH.get(slug) || slug;
  if (citySlug && PUBLIC_MULTI_CITY_LANDINGS.has(slug)) {
    const segment = publicCityPathSegment(citySlug);
    return `/${categoryPath}/${segment}/`;
  }
  return `/${categoryPath}/`;
}

function resolvePromoCitySlug(cityFilter) {
  const key = String(cityFilter || '').trim().toLowerCase();
  if (!key || key === 'all') return null;
  if (PUBLIC_CITY_PATH_SEGMENT.has(key)) return publicCityPathSegment(key);
  const canonical = canonicalCitySlug(key);
  if (PUBLIC_CITY_PATH_SEGMENT.has(canonical)) return publicCityPathSegment(canonical);
  if (key.includes('моск')) return 'moscow';
  if (key.includes('петерб') || key.includes('spb')) return 'saint-petersburg';
  if (key.includes('казан')) return 'kazan';
  return null;
}

const PROMO_CITY_LANDING_BOOSTS = {
  'sankt-peterburg': ['spb-yards', 'bridges-night'],
  'saint-petersburg': ['spb-yards', 'bridges-night'],
  'санкт-петербург': ['spb-yards', 'bridges-night'],
  'spb': ['spb-yards', 'bridges-night'],
  // City Day first; museums/workshops deliberately not boosted into Moscow top.
  'moscow': ['moscow-city-day', 'moscow-dinner-boat', 'river-cruises', 'concerts-genre'],
  'moskva': ['moscow-city-day', 'moscow-dinner-boat', 'river-cruises', 'concerts-genre'],
  'москва': ['moscow-city-day', 'moscow-dinner-boat', 'river-cruises', 'concerts-genre'],
};

export { LANDING_PAGE_SESSION_LIMIT, scopePublicCatalogSessions, selectLandingPageSessions };

function buildSortedPublicLandings(sessions, cityFilter = '') {
  return sortPromoLandings(
    buildPublicLandings(sessions).filter(
      (landing) => landing.events > 0 && !buildOffSeasonLandingSlugs().has(landing.slug),
    ),
    cityFilter,
  );
}

export async function buildPublicPromoBlocks(db, searchParams) {
  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const sessions = await publicCatalogSessions(db);
  const landings = buildSortedPublicLandings(scopePublicCatalogSessions(sessions, cityFilter), cityFilter).slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    items: landings.map((landing, index) => ({
      slug: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle,
      events: landing.events,
      priceFrom: landing.priceFrom,
      href: publicLandingHref(landing.slug, resolvePromoCitySlug(cityFilter)),
      gradientIndex: index,
    })),
  };
}

export async function buildPublicLandingsCatalog(db, searchParams) {
  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const sessions = await publicCatalogSessions(db);
  const landings = buildSortedPublicLandings(scopePublicCatalogSessions(sessions, cityFilter), cityFilter);

  return {
    generatedAt: new Date().toISOString(),
    city: cityFilter || 'all',
    items: landings.map((landing) => ({
      slug: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle,
      events: landing.events,
      priceFrom: landing.priceFrom,
    })),
  };
}

function resolveCityCardImageFromSlug(slug) {
  const imageSlug = CITY_CARD_IMAGE_ALIASES[slug] || slug;
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

export async function buildCatalogSessions(db, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 300, 100);
  const offset = clampNumber(searchParams.get('offset'), 0, 100000, 0);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const destination = searchParams.get('destination');
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const landing = searchParams.get('landing');
  const date = searchParams.get('date');
  const sort = searchParams.get('sort') || 'time';
  const maxPriceRaw = searchParams.get('maxPrice');
  const minPriceRaw = searchParams.get('minPrice');
  const maxPrice = maxPriceRaw != null && String(maxPriceRaw).trim() !== '' ? Number(maxPriceRaw) : NaN;
  const minPrice = minPriceRaw != null && String(minPriceRaw).trim() !== '' ? Number(minPriceRaw) : NaN;
  const dateFrom = String(searchParams.get('dateFrom') || '').trim();
  const dateTo = String(searchParams.get('dateTo') || '').trim();
  const ageMaxRaw = searchParams.get('ageMax');
  const ageMax = ageMaxRaw != null && String(ageMaxRaw).trim() !== '' ? Number(ageMaxRaw) : NaN;
  const forceRefresh = searchParams.get('refresh') === '1';

  const sessions = await publicCatalogSessions(db, forceRefresh);
  const coverSessions = sessions.filter(sessionHasCoverImage);
  const facets =
    !forceRefresh && publicCatalogCache?.catalogFacets
      ? publicCatalogCache.catalogFacets
      : buildCatalogFacets(coverSessions);
  const rows = coverSessions.filter((session) => {
    if (destination && destination !== 'all' && session.destination !== destination) return false;
    if (city && city !== 'all' && session.city !== city && session.destination !== city) return false;
    if (category && category !== 'all' && session.category !== category && !pickCatalogSubcategories(session).includes(category)) return false;
    if (landing && landing !== 'all' && !(session.landingSlugs || []).includes(landing)) return false;
    if (dateFrom || dateTo) {
      if (!matchesCatalogDateRange(session, dateFrom, dateTo)) return false;
    } else if (date && date !== 'all' && !matchesCatalogDate(session, date)) return false;
    if (!matchesCatalogPrice(session, minPrice, maxPrice)) return false;
    if (Number.isFinite(ageMax) && ageMax >= 0 && !matchesCatalogAgeLimit(session, ageMax)) return false;
    if (!query) return true;
    return [session.title, session.city, session.destination, session.venue, session.category, ...(session.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
    });

  const sorted = sortCatalogSessions(rows, sort);
  const arranged = sort === 'price' || sort === 'time' ? sorted : spreadCatalogSessionsByCoverImage(sorted);
  return { total: arranged.length, offset, limit, items: arranged.slice(offset, offset + limit), facets };
}

function buildCatalogFacets(sessions) {
  return {
    cities: countCatalogValues(sessions.map((session) => session.destination || session.city))
      .filter(([name, events]) => name && name !== 'Не указан' && events >= PUBLIC_DESTINATION_MIN_EVENTS)
      .map(([name, events]) => ({ name, events })),
    categories: countCatalogValues(sessions.map((session) => session.category))
      .map(([name, events]) => ({ name, events })),
    subcategories: countCatalogValues(sessions.flatMap((session) => pickCatalogSubcategories(session, 8)))
      .filter(([name]) => name.length <= 32)
      .slice(0, 24)
      .map(([name, events]) => ({ name, events })),
    landings: countCatalogValues(sessions.flatMap((session) => session.landingSlugs || []))
      .map(([slug, events]) => {
        const rule = LANDING_RULES.find((item) => item.slug === slug);
        return { slug, title: rule?.title || humanizeSlug(slug), events };
      }),
    priceSteps: buildCatalogPriceSteps(sessions),
  };
}

function normalizePublicSessionImageKey(imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;

  if (raw.includes('/_next/image') && /[?&]url=/.test(raw)) {
    try {
      const proxy = new URL(raw.replace(/&amp;/g, '&'), 'https://daibilet.ru');
      const inner = proxy.searchParams.get('url');
      if (inner) return normalizePublicSessionImageKey(inner);
    } catch {
      // fall through
    }
  }

  let pathname = raw;
  let search = '';
  try {
    const parsed = new URL(raw.replace(/&amp;/g, '&'), 'https://daibilet.ru');
    if (parsed.port === '443' || parsed.port === '80') parsed.port = '';
    pathname = parsed.pathname;
    search = parsed.search || '';
  } catch {
    const bare = raw.split('#')[0] || raw;
    const q = bare.indexOf('?');
    pathname = q >= 0 ? bare.slice(0, q) : bare;
    search = q >= 0 ? bare.slice(q) : '';
  }

  const normalizedPath = pathname.replace(/\/$/, '').toLowerCase();
  const file = decodeURIComponent(normalizedPath.split('/').filter(Boolean).pop() || '').toLowerCase();
  const sizeSuffixRe =
    /(?:[-_](?:\d{2,4}x\d{2,4}|w\d{2,4}|h\d{2,4}|q\d{2,3}|thumb|small|medium|large|cover|card|preview|resized?))+(?=\.[a-z0-9]+$)/i;

  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      const dirtyAlias = params.get('dirtyAlias') || params.get('dirty_alias');
      if (dirtyAlias && dirtyAlias.trim()) {
        const aliasFile = decodeURIComponent(dirtyAlias.trim()).toLowerCase().split('/').pop() || '';
        if (aliasFile) {
          const stripped = aliasFile.replace(sizeSuffixRe, '');
          return `img:${stripped}`;
        }
      }
    } catch {
      // fall through
    }
  }

  if (file && /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(file)) {
    const stripped = file.replace(sizeSuffixRe, '');
    const oid = stripped.match(/^([a-f0-9]{24})\.(jpe?g|png|webp|gif|avif)$/i);
    if (oid) return `tc-asset:${oid[1].toLowerCase()}`;
    const teploVariant = stripped.match(/^([a-f0-9]{8,})-\d+\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i);
    if (teploVariant) return `stem:${teploVariant[1].toLowerCase()}`;
    return `img:${stripped}`;
  }

  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      const item = params.get('item') || params.get('id') || params.get('key');
      if (item && item.trim()) return `img:q:${item.trim().toLowerCase()}`;
    } catch {
      // fall through
    }
  }

  return normalizedPath || null;
}

export function spreadCatalogSessionsByCoverImage(sessions) {
  if (!Array.isArray(sessions) || sessions.length <= 1) return sessions;

  const pool = [...sessions];
  const result = [];

  while (pool.length > 0) {
    const lastKey = result.length ? normalizePublicSessionImageKey(result[result.length - 1]?.imageUrl) : null;
    let pickIndex = 0;

    if (lastKey) {
      const firstKey = normalizePublicSessionImageKey(pool[0]?.imageUrl);
      if (firstKey && firstKey === lastKey) {
        const alternateIndex = pool.findIndex((session) => {
          const key = normalizePublicSessionImageKey(session.imageUrl);
          return !key || key !== lastKey;
        });
        if (alternateIndex > 0) pickIndex = alternateIndex;
      }
    }

    result.push(pool.splice(pickIndex, 1)[0]);
  }

  return result;
}

function sortCatalogSessions(sessions, sort) {
  const sorted = [...sessions];
  if (sort === 'price') {
    return sorted.sort((a, b) => {
      const aPrice = Number.isFinite(a.priceFrom) ? a.priceFrom : Number.POSITIVE_INFINITY;
      const bPrice = Number.isFinite(b.priceFrom) ? b.priceFrom : Number.POSITIVE_INFINITY;
      return aPrice - bPrice || compareSessionTime(a, b);
    });
  }
  if (sort === 'popular') {
    return sorted.sort((a, b) => (b.sessionCount || 1) - (a.sessionCount || 1) || compareSessionTime(a, b));
  }
  return sorted.sort(compareSessionTime);
}

function compareSessionTime(a, b) {
  const aOpen = isOpenDateCatalogRow(a) && !a.startsAt;
  const bOpen = isOpenDateCatalogRow(b) && !b.startsAt;
  const aTime = aOpen ? Number.MAX_SAFE_INTEGER - 1 : a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
  const bTime = bOpen ? Number.MAX_SAFE_INTEGER - 1 : b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
  return aTime - bTime || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
}

function countCatalogValues(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'ru'));
}

function buildCatalogPriceSteps(sessions) {
  const max = sessions
    .map((session) => session.priceFrom)
    .filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB)
    .sort((a, b) => a - b)
    .at(-1);
  const candidates = [500, 1000, 1500, 2000, 3000, 5000].filter((price) => Number.isFinite(max) && price <= max);
  return candidates.length ? candidates : [1000, 2000, 3000];
}

function humanizeSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Расстояние между двумя WGS84 точками в метрах. */

export async function buildPublicCityPage(db, citySlugOrId) {
  const requestedSlug = String(citySlugOrId || '').toLowerCase();
  const [catalogSessions, venueHubRows] = await Promise.all([
    publicCatalogSessions(db),
    publicVenueHubRows(db, 500),
  ]);
  const matchedSessions = lookupDestinationCatalogSessions(citySlugOrId, requestedSlug, catalogSessions);
  if (!matchedSessions.length) {
    const standaloneName = matchStandaloneCityBySlug(requestedSlug) || matchStandaloneCityBySlug(citySlugOrId);
    if (!standaloneName) return null;
    const destination = publicDestinationFromSession({
      destination: standaloneName,
      destinationType: 'city',
      city: standaloneName,
    });
    let cityVenues = [];
    try {
      const found = await db.query('select id from "City" where title = $1 limit 1', [standaloneName]);
      const cityId = found?.rows?.[0]?.id;
      if (cityId) cityVenues = await publicPublishedVenuesByCityId(db, cityId, 250);
    } catch {
      cityVenues = [];
    }
    const entityLabel = destinationPrepositional(destination);
    return {
      generatedAt: new Date().toISOString(),
      city: {
        id: destination.id,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
        name: destination.name,
        title: destination.name,
        type: 'city',
        isDestination: true,
        events: 0,
        venues: cityVenues.length,
        categories: {},
        seoTitle: buildCityHubSeoTitle(destination.name),
        seoDescription: `Афиша событий, экскурсий, музеев и активностей ${entityLabel}. Быстрый выбор по датам, площадкам и категориям.`,
      },
      sessions: [],
      venues: cityVenues,
      landings: [],
      stats: {
        events: 0,
        venues: cityVenues.length,
        categories: 0,
        priceFrom: null,
      },
    };
  }

  const destination = publicDestinationFromSession(matchedSessions[0]);
  const sessions = matchedSessions.slice(0, 160);
  const sessionVenues = await resolvePublicVenuesForSessions(db, matchedSessions, venueHubRows, 24);
  const cityId = matchedSessions[0]?.cityId || null;
  const contentVenues = cityId ? await publicPublishedVenuesByCityId(db, cityId, 250) : [];
  const cityVenues = mergeCityPageVenues(sessionVenues, contentVenues, 250);
  const venueCount = countDistinctSessionVenues(matchedSessions);
  const prices = sessions.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));
  const landings = buildPublicLandings(sessions).filter(
    (landing) => landing.events > 0 && !buildOffSeasonLandingSlugs().has(landing.slug),
  );
  const entityLabel = destinationPrepositional(destination);

  return {
    generatedAt: new Date().toISOString(),
    city: {
      id: destination.id,
      slug: destination.slug,
      sourceSlug: destination.sourceSlug,
      name: destination.name,
      title: destination.name,
      type: destination.type === 'region' ? 'region' : 'city',
      isDestination: true,
      events: matchedSessions.length,
      venues: venueCount,
      categories,
      seoTitle: buildCityHubSeoTitle(destination.name),
      seoDescription: `Афиша событий, экскурсий, музеев и активностей ${entityLabel}. Быстрый выбор по датам, площадкам и категориям.`,
    },
    sessions,
    venues: cityVenues,
    landings,
    stats: {
      events: matchedSessions.length,
      venues: venueCount,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
}

export async function buildPublicLandingPage(db, landingSlug, cityFilter = '') {
  const rule = resolveLandingRuleBySlug(landingSlug);
  if (!rule) return null;

  const catalogSessions = await publicCatalogSessions(db);
  const { matchedSessions, pageSessions, matchCount } = selectLandingPageSessions(
    filterSessionsForLandingRule(catalogSessions, rule),
    cityFilter,
  );
  // Lean SSR: city-scoped first, then card budget - avoid national top-N starving city URLs.
  const sessions = pageSessions.map((session) => toPublicCatalogListItem(session));
  const prices = matchedSessions
    .flatMap((session) => [session.priceFrom, session.priceTo])
    .filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const cities = countBy(matchedSessions.map((event) => event.destination || event.city).filter(Boolean));
  const categories = countBy(matchedSessions.map((event) => event.category).filter(Boolean));
  const venues = countBy(matchedSessions.map((event) => event.venue).filter(Boolean));

  return {
    generatedAt: new Date().toISOString(),
    landing: {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      city: rule.city || null,
      chips: rule.chips || [],
      events: matchCount,
      venues: Object.keys(venues).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: matchCount >= 20 ? 'ready' : matchCount > 0 ? 'seed' : 'empty',
      seoTitle: `${rule.title}: афиша, расписание и билеты | Дайбилет`,
      seoDescription: `${rule.subtitle}. Табличный выбор по датам, городам, площадкам и цене.`,
    },
    sessions,
    relatedLandings: buildPublicLandings(sessions).filter((landing) => landing.slug !== rule.slug && landing.events > 0),
    blocks: buildDefaultLandingBlocks(rule, sessions),
    stats: {
      events: matchCount,
      sessions: matchCount,
      cities,
      categories,
      venues,
      priceFrom: prices.length ? Math.min(...prices) : null,
      priceTo: prices.length ? Math.max(...prices) : null,
    },
  };
}

export async function buildPublicLandingPageManaged(db, landingSlug, cityFilter = '') {
  const rule = resolveLandingRuleBySlug(landingSlug);
  if (!rule) return null;

  const [catalogSessions, landingResult] = await Promise.all([
    publicCatalogSessions(db),
    db.query(
      `
        select
          landing.*,
          seo.title as "metaTitle",
          seo.description as "metaDescription",
          seo.h1 as "metaH1",
          seo."canonicalUrl" as "metaCanonicalUrl",
          seo.robots as "metaRobots",
          seo."ogTitle" as "metaOgTitle",
          seo."ogDescription" as "metaOgDescription",
          seo."ogImageUrl" as "metaOgImageUrl"
        from "Landing" landing
        left join "SeoMeta" seo on seo."entityType" = 'LANDING' and seo."entityId" = landing.id
        where landing.slug = $1 and landing."isActive" = true
        limit 1
      `,
      [landingSlug],
    ),
  ]);
  const landingRecord = landingResult.rows[0] || null;
  const [manualRows, blockRows] = landingRecord
    ? await Promise.all([
        db.query('select "eventId", reasons from "LandingMatch" where "landingId" = $1', [landingRecord.id]).then((result) => result.rows),
        db.query(
          `
            select
              id, type, variant, title, subtitle, eyebrow, body, "richTextJson",
              payload, "assetUrl", "mobileAssetUrl", "isEnabled", "sortOrder"
            from "LandingContentBlock"
            where "landingId" = $1 and "isEnabled" = true
            order by "sortOrder" asc, id asc
          `,
          [landingRecord.id],
        ).then((result) => result.rows),
      ])
    : [[], []];
  const pinnedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'PINNED').map((row) => row.eventId));
  const excludedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'EXCLUDED').map((row) => row.eventId));
  const manualByEventId = new Map(manualRows.map((row) => [row.eventId, row]));
  const ruleMatchedSessions = catalogSessions
    .filter((session) => {
      const ids = sessionGroupIds(session);
      if (ids.some((id) => excludedIds.has(id))) return false;
      if (ids.some((id) => pinnedIds.has(id))) return true;
      return matchesLandingRule(session, rule) && sessionMatchesLandingSchedule(session, rule);
    })
    .map((session) => {
      const pinned = sessionGroupIds(session).some((id) => pinnedIds.has(id));
      return pinned ? session : applyLandingScheduleToSession(session, rule) || session;
    });
  const { matchedSessions, pageSessions, matchCount } = selectLandingPageSessions(ruleMatchedSessions, cityFilter);
  const sessions = pageSessions.map((session) => {
      const base = {
        ...session,
        manualLandingStatus: sessionGroupIds(session).map((id) => manualByEventId.get(id)?.reasons?.manualStatus).find(Boolean) || null,
      };
      // Lean SSR card for landing grids (keeps purchase URLs for CTA; truncates slots/description).
      return {
        ...toPublicCatalogListItem(base),
        manualLandingStatus: base.manualLandingStatus,
      };
    });
  const prices = matchedSessions
    .flatMap((session) => [session.priceFrom, session.priceTo])
    .filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const cities = countBy(matchedSessions.map((event) => event.destination || event.city).filter(Boolean));
  const categories = countBy(matchedSessions.map((event) => event.category).filter(Boolean));
  const venues = countBy(matchedSessions.map((event) => event.venue).filter(Boolean));
  const landing = mapLandingRecord(landingRecord, rule);
  const seo = mapLandingSeo(landingRecord, rule);

  return {
    generatedAt: new Date().toISOString(),
    landing: {
      slug: rule.slug,
      type: landingTypeForRule(rule),
      title: landing.title,
      subtitle: landing.subtitle,
      city: rule.city || null,
      chips: rule.chips || [],
      events: matchCount,
      venues: Object.keys(venues).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: matchCount >= 20 ? 'ready' : matchCount > 0 ? 'seed' : 'empty',
      seoH1: seo.h1,
      seoTitle: seo.title,
      seoDescription: seo.description,
      canonicalUrl: seo.canonicalUrl,
      isIndexable: landing.isIndexable,
    },
    sessions,
    relatedLandings: buildPublicLandings(sessions).filter((landingItem) => landingItem.slug !== rule.slug && landingItem.events > 0),
    blocks: blockRows.length ? blockRows.map(mapLandingBlock) : buildDefaultLandingBlocks(rule, sessions),
    stats: {
      events: matchCount,
      sessions: matchCount,
      cities,
      categories,
      venues,
      priceFrom: prices.length ? Math.min(...prices) : null,
      priceTo: prices.length ? Math.max(...prices) : null,
    },
  };
}

export async function buildPublicEventPage(db, eventSlugOrId) {
  const cachedCatalogSessions = publicCatalogCache?.sessions || null;
  let catalogSessions = cachedCatalogSessions;
  let resolvedEventId = await resolvePublicEventId(db, eventSlugOrId, catalogSessions);
  let targetPublicSession = lookupCatalogSessionBySlug(eventSlugOrId, catalogSessions);

  const loadEventRow = async (eventLocator) => {
    const eventResult = await db.query(
    `
      select
        e.id,
        e.slug,
        e.title,
        e.description,
        e.kind,
        e.status,
        e."ageLimit",
        e."imageUrl",
        e."seoH1",
        e."seoTitle",
        e."seoDescription",
        e."canonicalPath",
        e."isIndexable",
        e."priceFromRub",
        e."ticketsVacant",
        cat.title as category,
        city.id as "cityId",
        city.title as city,
        city.slug as "citySourceSlug",
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.slug as "venueSlug",
        venue.title as venue,
        venue.address as "venueAddress",
        venue.kind as "venueKind",
        venue.latitude as "venueLatitude",
        venue.longitude as "venueLongitude",
        venue."metroStation" as "venueMetroStation",
        venue."wayToFind" as "venueWayToFind",
        venue."parkingInfo" as "venueParkingInfo",
        source.code as "sourceCode",
        source.name as "sourceName",
        source_link."externalId",
        override.title as "overrideTitle",
        override.description as "overrideDescription",
        override."imageUrl" as "overrideImageUrl",
        override."seoH1" as "overrideSeoH1",
        override."seoTitle" as "overrideSeoTitle",
        override."seoDescription" as "overrideSeoDescription",
        ${orderedEventTagsSql('e.id')} as tags
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      left join "Source" source on source.id = source_link."sourceId"
      left join "EventOverride" override on override."eventId" = e.id
      where e.id = $1 or e.slug = $1
      group by e.id, cat.title, city.id, city.title, city.slug, city."isDestination", region.id, region.slug, region.title, venue.id, venue.slug, venue.title, venue.address, venue.kind, venue.latitude, venue.longitude, venue."metroStation", venue."wayToFind", venue."parkingInfo", source.code, source.name, source_link."externalId", override.id
      limit 1
    `,
      [eventLocator],
    );
    const row = eventResult.rows[0];
    if (!row) return null;
    if (String(row.status || '').toUpperCase() === 'HIDDEN') return null;
    return row;
  };

  let event = await loadEventRow(resolvedEventId || eventSlugOrId);
  if (!event) {
    catalogSessions = await publicCatalogSessions(db);
    resolvedEventId = await resolvePublicEventId(db, eventSlugOrId, catalogSessions);
    targetPublicSession = lookupCatalogSessionBySlug(eventSlugOrId, catalogSessions);
    event = resolvedEventId ? await loadEventRow(resolvedEventId) : null;
  }

  if (!event) return null;
  if (!catalogSessions) {
    catalogSessions = await publicCatalogSessions(db);
  }
  const eventCity = cleanDisplayName(event.city);
  const eventHubs = STANDALONE_CITY_NAMES.has(eventCity) ? new Set([eventCity]) : undefined;
  const eventDestination = publicDestinationForCity(event, eventHubs);

  const requestedSlug = publicEventSlug(eventSlugOrId);
  if (!targetPublicSession && catalogSessions?.length) {
    targetPublicSession =
      lookupCatalogSessionBySlug(eventSlugOrId, catalogSessions) ||
      catalogSessions.find(
        (session) =>
          session.id === event.id ||
          session.sourceSlug === event.slug ||
          session.slug === requestedSlug ||
          sessionGroupIds(session).includes(event.id),
      );
  }
  const fallbackPublicRow = {
    ...event,
    source: event.sourceName || publicSourceLabel(event.sourceCode) || 'Источник',
    sourceCode: event.sourceCode,
    sourceCategory: event.category,
    category: event.category,
    cityId: event.cityId,
    city: event.city,
    venueId: event.venueId,
    venue: event.venue,
  };
  const targetGroupKey = targetPublicSession?.groupKey || publicEventGroupKey(fallbackPublicRow);
  let groupEventIds = targetPublicSession?.groupEventIds?.length ? targetPublicSession.groupEventIds : [event.id];
  const representativeRow = targetPublicSession || fallbackPublicRow;

  // Expand TicketsCloud meta siblings so a past dated slug still shows future slots.
  const metaResult = await db.query(
    `
      select distinct sibling."eventId" as id
      from "EventSourceLink" requested
      join "EventSourceLink" sibling
        on sibling."metaExternalId" = requested."metaExternalId"
       and sibling."eventId" <> requested."eventId"
      where requested."eventId" = $1
        and requested."metaExternalId" is not null
        and nullif(trim(requested."metaExternalId"), '') is not null
      limit 200
    `,
    [event.id],
  );
  if (metaResult.rows.length) {
    groupEventIds = uniqueValues([
      ...groupEventIds,
      ...metaResult.rows.map((row) => row.id),
    ]);
  }

  // Ticket tariffs must be loaded from the page event (and merge peers), not from
  // the entire dated TC sibling group. price ASC + limit 32 across hundreds of
  // slots only returns child tariffs and hides adult/other categories.
  const tariffOfferEventIds = uniqueValues([
    event.id,
    representativeRow.id || event.id,
  ]);

  const [sessionsResult, offersResult] = await Promise.all([
    db.query(
      `
        select
          session.id,
          session."eventId",
          session."startsAt",
          session."endsAt",
          session."sourceStatus",
          session."priceFromRub",
          session."ticketsVacant",
          session."externalId",
          session_event."sourceStatus" as "eventSourceStatus",
          session_source_link."externalId" as "eventExternalId",
          session_source.code as "eventSourceCode",
          session_offer."sourceCode" as "offerSourceCode",
          session_offer.title as "offerTitle",
          session_offer."priceRub" as "offerPriceRub",
          session_offer."widgetUrl" as "offerWidgetUrl",
          session_offer."deeplinkUrl" as "offerDeeplinkUrl",
          session_offer.active as "offerActive"
        from "EventSession" session
        left join "Event" session_event on session_event.id = session."eventId"
        left join "EventSourceLink" session_source_link on session_source_link."eventId" = session."eventId"
        left join "Source" session_source on session_source.id = session_source_link."sourceId"
        left join lateral (
          select
            "sourceCode",
            title,
            "priceRub",
            "widgetUrl",
            "deeplinkUrl",
            active
          from "EventOffer"
          where "eventId" = session."eventId" and active is not false
          order by ("priceRub" >= $2) desc nulls last, "priceRub" asc nulls last
          limit 1
        ) session_offer on true
        where session."eventId" = any($1)
          and ${ACTIVE_SESSION_SQL}
        order by session."startsAt" asc nulls last
        limit 5
      `,
      [groupEventIds, MIN_DISPLAY_PRICE_RUB],
    ),
    db.query(
      `
        select
          offer.id,
          offer."eventId",
          offer."sourceCode",
          coalesce(nullif(offer.title, ''), 'Ticketscloud widget') as title,
          offer."priceRub",
          offer."widgetUrl",
          offer."deeplinkUrl",
          offer.active,
          offer.payload,
          (offer.payload->>'sortOrder')::int as "sortOrder"
        from "EventOffer" offer
        where offer."eventId" = any($1)
          and offer.active is not false
          and offer."priceRub" >= $2
        order by
          coalesce((offer.payload->>'sortOrder')::int, 9999),
          offer."priceRub" asc nulls last,
          offer.id asc
        limit 64
      `,
      [tariffOfferEventIds, MIN_DISPLAY_PRICE_RUB],
    ),
  ]);

  const publicOffers = preferNamedTicketOffers(dedupePublicOffers(offersResult.rows)).slice(0, 32);

  const primaryOfferByEventId = primaryOfferMap(
    sessionsResult.rows
      .map((session) => ({
        eventId: session.eventId,
        sourceCode: session.offerSourceCode,
        title: session.offerTitle,
        priceRub: session.offerPriceRub,
        widgetUrl: session.offerWidgetUrl,
        deeplinkUrl: session.offerDeeplinkUrl,
        active: session.offerActive,
      }))
      .filter((offer) => offer.sourceCode || offer.priceRub != null || offer.widgetUrl || offer.deeplinkUrl),
  );
  const primaryOffer = primaryOfferByEventId.get(representativeRow.id) || publicOffers.find((offer) => offer.active) || publicOffers[0] || null;
  const totalSessionCount = targetPublicSession?.sessionCount || sessionsResult.rows.length;
  const eventPriceFrom = displayPriceFrom(
    targetPublicSession?.priceFrom,
    event.priceFromRub,
    ...sessionsResult.rows.map((session) => session.priceFromRub),
    ...publicOffers.map((offer) => offer.priceRub),
  );
  const fallbackWidgetUrl = buildProviderWidgetUrl(representativeRow.externalId ? representativeRow : { ...event, externalId: event.externalId, offerSourceCode: primaryOffer?.sourceCode });
  const purchase = purchaseInfo({
    ...representativeRow,
    sourceCode: event.sourceCode || primaryOffer?.sourceCode,
    offerSourceCode: primaryOffer?.sourceCode || representativeRow.offerSourceCode,
    offerWidgetUrl: primaryOffer?.widgetUrl || representativeRow.offerWidgetUrl,
    offerDeeplinkUrl: primaryOffer?.deeplinkUrl || representativeRow.offerDeeplinkUrl,
    externalId: representativeRow.externalId || event.externalId,
  });
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const widgetProvider = providerWidgetProvider(event.sourceCode || primaryOffer?.sourceCode);
  const widgetPayload = buildProviderWidgetPayload({
    sourceCode: event.sourceCode || primaryOffer?.sourceCode,
    externalId: event.externalId,
  });
  const tags = event.tags || [];
  const baseEvent = {
    id: representativeRow.id || event.id,
    slug: publicEventSlug(representativeRow.sourceSlug || representativeRow.slug || event.slug),
    sourceSlug: representativeRow.sourceSlug || event.slug,
    sourceCode: event.sourceCode,
    externalId: event.externalId,
    widgetProvider,
    widgetPayload,
    groupKey: targetGroupKey,
    groupEventIds,
    sessionCount: totalSessionCount,
    title: formatPublicEventTitle(event.overrideTitle || event.title),
    description: cleanImportedDescription(event.overrideDescription || event.description),
    imageUrl: event.overrideImageUrl || event.imageUrl || null,
    category: event.category || 'События',
    tags,
    city: event.city || 'Не указан',
    cityId: event.cityId,
    citySlug: eventDestination?.slug || publicCitySlug(event.city || 'Не указан'),
    sourceCitySlug: event.citySourceSlug,
    destination: eventDestination?.name || cleanDisplayName(event.city) || 'Не указан',
    destinationType: eventDestination?.type || 'city',
    timeZone: resolveCityTimeZone(event.city, eventDestination?.name || event.city),
    venueId: event.venueId,
    venueSlug: event.venueSlug,
    venue: event.venue || 'Не указано',
    venueAddress: event.venueAddress,
    venueKind: event.venueKind || 'OTHER',
    venueLatitude: event.venueLatitude == null || !Number.isFinite(Number(event.venueLatitude)) ? null : Number(event.venueLatitude),
    venueLongitude: event.venueLongitude == null || !Number.isFinite(Number(event.venueLongitude)) ? null : Number(event.venueLongitude),
    venueMetroStation: normalizeNullableString(event.venueMetroStation),
    venueWayToFind: normalizeNullableString(event.venueWayToFind),
    venueParkingInfo: normalizeNullableString(event.venueParkingInfo),
    ageLimit: event.ageLimit,
    priceFrom: eventPriceFrom,
    vacant: targetPublicSession?.vacant ?? event.ticketsVacant,
    eventType: String(event.kind || '').toLowerCase(),
    landingSlugs: targetPublicSession?.landingSlugs || LANDING_RULES.filter((rule) => matchesLandingRule({ ...event, title: event.title, venue: event.venue, city: event.city, tags, sourceCategory: event.category }, rule)).map((rule) => rule.slug),
    purchaseUrl,
    widgetUrl: primaryOffer?.widgetUrl || fallbackWidgetUrl,
    deeplinkUrl: primaryOffer?.deeplinkUrl || null,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    seoH1: event.overrideSeoH1 || event.seoH1 || event.title,
    seoTitle: event.overrideSeoTitle || event.seoTitle || `${event.title}: билеты и расписание | Дайбилет`,
    seoDescription: cleanImportedDescription(event.overrideSeoDescription || event.seoDescription) || `Расписание, цены и билеты на ${event.title}. Покупка через виджет билетной системы.`,
    canonicalPath: event.canonicalPath || `/events/${publicEventSlug(representativeRow.sourceSlug || representativeRow.slug || event.slug)}`,
    isIndexable: event.isIndexable,
  };
  const institutionContext = await resolveContextInstitutionForEvent(db, {
    title: baseEvent.title,
    cityId: event.cityId,
    venue: event.venue,
    venueKind: event.venueKind,
  });
  if (institutionContext) {
    baseEvent.institutionVenue = institutionContext.displayName;
    baseEvent.institutionVenueId = institutionContext.id;
    baseEvent.institutionVenueSlug = institutionContext.slug;
  }
  baseEvent.venueStops = await loadPublicEventVenueStops(db, event.id);
  const sessions = sessionsResult.rows.map((session) => {
    const sessionOffer = primaryOfferByEventId.get(session.eventId) || primaryOffer;
    const sourceRow = targetPublicSession && sessionGroupIds(targetPublicSession).includes(session.eventId) ? targetPublicSession : null;
    const sessionSourceCode = session.eventSourceCode || sessionOffer?.sourceCode || sourceRow?.offerSourceCode || sourceRow?.sourceCode || event.sourceCode;
    const sessionExternalId = String(sessionSourceCode || '').toUpperCase().includes('TEPLOHOD')
      ? session.eventExternalId || sourceRow?.externalId || event.externalId
      : session.externalId || session.eventExternalId || sourceRow?.externalId || event.externalId;
    const sessionPurchase = purchaseInfo({
      ...sourceRow,
      sourceCode: sessionSourceCode,
      offerSourceCode: sessionOffer?.sourceCode || sessionSourceCode,
      offerWidgetUrl: sessionOffer?.widgetUrl || sourceRow?.offerWidgetUrl,
      offerDeeplinkUrl: sessionOffer?.deeplinkUrl || sourceRow?.offerDeeplinkUrl,
      externalId: sessionExternalId,
    });
    const schedule = publicSessionScheduleLabels({
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      kind: event.kind,
      sourceStatus: session.sourceStatus,
      city: event.city,
      destination: eventDestination.name,
    });
    return {
      id: session.id,
      eventId: session.eventId,
      startsAt: schedule.startsAt || null,
      endsAt: session.endsAt,
      dateLabel: schedule.dateLabel,
      timeLabel: schedule.timeLabel,
      timeBucket: schedule.timeBucket,
      timeZone: schedule.timeZone,
      sourceStatus: session.sourceStatus,
      eventSourceStatus: session.eventSourceStatus,
      priceFrom: displayPriceFrom(session.priceFromRub, baseEvent.priceFrom),
      vacant: session.ticketsVacant,
      purchaseUrl: sessionPurchase.url,
      purchaseReady: sessionPurchase.ready,
      purchaseUrlSource: sessionPurchase.urlSource,
    };
  });
  const widgetOnlySessions = sessions.length === 0
    && isOpenDateCatalogRow({ kind: event.kind, sourceStatus: event.sourceStatus })
    && purchase.ready
    ? [{
        id: `widget_tep_${event.id}`,
        eventId: event.id,
        startsAt: null,
        endsAt: null,
        dateLabel: 'В виджете',
        timeLabel: 'Выберите время',
        timeBucket: 'day',
        sourceStatus: 'widget',
        priceFrom: baseEvent.priceFrom,
        vacant: baseEvent.vacant,
        purchaseUrl,
        purchaseReady: purchase.ready,
        purchaseUrlSource: purchase.urlSource,
      }]
    : [];
  const publicSessions = sessions.length ? sessions : widgetOnlySessions;
  if (!event.overrideSeoTitle && !event.seoTitle) {
    const nearest = publicSessions[0];
    const dateBit = [nearest?.dateLabel, nearest?.timeLabel].filter(Boolean).join(', ');
    if (dateBit && nearest?.dateLabel && !String(event.title || '').includes(String(nearest.dateLabel))) {
      baseEvent.seoTitle = `${event.title} (${dateBit}): билеты и расписание | Дайбилет`;
    }
  }
  applyEventPrimaryPurchase(baseEvent, publicSessions, event.sourceCode || primaryOffer?.sourceCode);
  const ticketPrices = buildPublicTicketPrices(publicOffers, publicSessions, baseEvent);
  const relatedCandidates = catalogSessions.filter((session) => {
    if (sessionGroupIds(session).some((id) => groupEventIds.includes(id))) return false;
    if (event.cityId && session.cityId) return session.cityId === event.cityId;
    return normalizeGroupPart(session.city) === normalizeGroupPart(event.city);
  });
  relatedCandidates.sort((left, right) => {
    const score = (session) => {
      let value = 0;
      if (session.category === event.category) value += 2;
      if (session.venueKind && session.venueKind === event.venueKind) value += 1;
      if (session.venueId && session.venueId === event.venueId) value += 3;
      return value;
    };
    const byScore = score(right) - score(left);
    if (byScore !== 0) return byScore;
    return String(left.startsAt || '').localeCompare(String(right.startsAt || ''));
  });
  const related = relatedCandidates.slice(0, 12);
  const priceValues = [baseEvent.priceFrom, ...publicSessions.map((session) => session.priceFrom)].filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const vacantValues = publicSessions.map((session) => session.vacant).filter((value) => Number.isFinite(value));

  if (!isSaleableEventForPublic({ ...baseEvent, kind: event.kind, sourceStatus: publicSessions.find((session) => session.sourceStatus === 'widget')?.sourceStatus || event.sourceStatus, startsAt: publicSessions.find((session) => session.startsAt)?.startsAt || null,
      endsAt: publicSessions.find((session) => session.endsAt)?.endsAt || null })) {
    return null;
  }

  return {
    generatedAt: new Date().toISOString(),
    event: baseEvent,
    sessions: publicSessions,
    offers: publicOffers.map((offer) => ({
      id: offer.id,
      sourceCode: offer.sourceCode,
      title: offer.title,
      priceRub: offer.priceRub,
      widgetUrl: offer.widgetUrl,
      deeplinkUrl: offer.deeplinkUrl,
      active: offer.active,
      sortOrder: readOfferSortOrder(offer.sortOrder),
    })),
    ticketPrices,
    related,
    landings: LANDING_RULES.filter((rule) => baseEvent.landingSlugs.includes(rule.slug)).map((rule) => ({
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips || [],
    })),
    stats: {
      sessions: totalSessionCount,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      vacant: vacantValues.length ? vacantValues.reduce((sum, value) => sum + value, 0) : null,
    },
  };
}

function readOfferSortOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPublicTicketPrices(offers, sessions, event) {
  const rows = [];
  const eventTitleKey = normalizeGroupPart(event.title);

  for (const offer of preferNamedTicketOffers(offers || [])) {
    if (offer.active === false || !Number.isFinite(offer.priceRub) || offer.priceRub < MIN_DISPLAY_PRICE_RUB) continue;
    const title = normalizePublicTicketTitle(offer.title, eventTitleKey);
    rows.push({
      key: `offer:${offer.id || offer.eventId}:${normalizeGroupPart(title)}:${offer.priceRub}`,
      title,
      priceRub: offer.priceRub,
      source: publicSourceLabel(offer.sourceCode),
      description: resolvePublicOfferTicketDescription(offer, title),
      purchaseUrl: offer.widgetUrl || offer.deeplinkUrl || event.purchaseUrl || null,
      kind: 'offer',
      sortOrder: readOfferSortOrder(offer.sortOrder),
    });
  }

  const offerPrices = new Set(rows.filter((row) => row.kind === 'offer').map((row) => row.priceRub));
  for (const session of sessions || []) {
    if (!Number.isFinite(session.priceFrom) || session.priceFrom < MIN_DISPLAY_PRICE_RUB) continue;
    if (offerPrices.has(session.priceFrom)) continue;
    rows.push({
      key: `session:${session.id || session.priceFrom}:${session.priceFrom}`,
      title: 'Билет на отдельные сеансы',
      priceRub: session.priceFrom,
      source: null,
      description: null,
      purchaseUrl: session.purchaseUrl || event.purchaseUrl || null,
      kind: 'session',
    });
  }

  if (!rows.length && Number.isFinite(event.priceFrom) && event.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
    rows.push({
      key: `fallback:${event.priceFrom}`,
      title: 'Билет',
      priceRub: event.priceFrom,
      source: null,
      description: null,
      purchaseUrl: event.purchaseUrl || null,
      kind: 'fallback',
    });
  }

  const unique = new Map();
  for (const row of rows) {
    const labelKey = normalizeGroupPart(normalizeTicketCategoryLabel(row.title));
    const mergeKey = `${labelKey}:${row.priceRub}`;
    const existing = unique.get(mergeKey);
    if (!existing || (row.kind === 'offer' && existing.kind !== 'offer')) unique.set(mergeKey, row);
  }

  return Array.from(unique.values())
    .sort((a, b) => {
      const aOrder = readOfferSortOrder(a.sortOrder) ?? 9999;
      const bOrder = readOfferSortOrder(b.sortOrder) ?? 9999;
      return aOrder - bOrder || a.priceRub - b.priceRub || String(a.title).localeCompare(String(b.title), 'ru');
    })
    .slice(0, 32);
}

function splitTitlePartsWithoutWeekdays(title) {
  const parts = String(title || '').split(',').map((part) => part.trim()).filter(Boolean);
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

function isGenericPublicTicketDescription(value) {
  const text = String(cleanImportedDescription(value) || '').toLowerCase();
  if (!text) return true;
  if (text.includes('покупка открывается в виджете')) return true;
  if (text.includes('уточняется в виджете')) return true;
  if (text.includes('минимальная доступная цена')) return true;
  return false;
}

function isTransportBoilerplate(value) {
  const text = cleanImportedDescription(value);
  if (!text) return false;
  return /перевозка\s+пас[-.\s]?в/i.test(text) && /\bТС\s*\d+/i.test(text);
}

function normalizeTicketCategoryLabel(raw) {
  let text = cleanImportedDescription(raw);
  if (!text) return 'Билет';

  const dashSplit = text.split(/\s[-–—]\s/);
  if (dashSplit.length > 1) {
    const head = String(dashSplit[0] || '').trim();
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

function extractPublicOfferPayloadDescription(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  for (const key of ['description', 'comment', 'text']) {
    const direct = cleanImportedDescription(payload[key]);
    if (direct && !isGenericPublicTicketDescription(direct) && !isTransportBoilerplate(direct)) return direct;
  }
  const ticket = payload.ticket;
  if (ticket && typeof ticket === 'object' && !Array.isArray(ticket)) {
    for (const key of ['description', 'comment', 'text']) {
      const nested = cleanImportedDescription(ticket[key]);
      if (nested && !isGenericPublicTicketDescription(nested) && !isTransportBoilerplate(nested)) return nested;
    }
  }
  return null;
}

function parsePublicTitleSupplement(rawTitle, normalizedTitle) {
  const clean = cleanImportedDescription(rawTitle);
  if (!clean) return null;
  const parts = splitTitlePartsWithoutWeekdays(clean);
  if (parts.length <= 1) return null;
  const supplement = parts.slice(1).join(', ').trim();
  if (!supplement || isGenericPublicTicketDescription(supplement) || isTransportBoilerplate(supplement)) return null;
  if (normalizeGroupPart(parts[0]) === normalizeGroupPart(normalizedTitle)) return supplement;
  if (normalizeGroupPart(clean) === normalizeGroupPart(normalizedTitle)) return supplement;
  return supplement;
}

function resolvePublicOfferTicketDescription(offer, normalizedTitle) {
  const fromPayload = extractPublicOfferPayloadDescription(offer.payload);
  if (fromPayload) return fromPayload;
  const fromTitle = parsePublicTitleSupplement(offer.title, normalizedTitle);
  if (fromTitle) return fromTitle;
  return null;
}

function normalizePublicTicketTitle(rawTitle, eventTitleKey) {
  const cleanTitle = cleanImportedDescription(rawTitle);
  const titleKey = normalizeGroupPart(cleanTitle);
  if (!titleKey || titleKey === eventTitleKey) return 'Билет';
  if (titleKey === 'widget' || titleKey.includes('ticketscloud widget')) return 'Билет';
  return normalizeTicketCategoryLabel(cleanTitle);
}

function publicSourceLabel(sourceCode) {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'Ticketscloud';
  if (normalized.includes('TEPLOHOD')) return 'Teplohod.info';
  return normalized || null;
}

function buildProviderWidgetUrl(row) {
  const sourceCode = String(row?.sourceCode || row?.offerSourceCode || '').toUpperCase();
  if (sourceCode.includes('TEPLOHOD')) {
    const eventId =
      normalizeTeplohodExternalId(row?.externalId) ||
      extractTeplohodEventIdFromUrl(row?.offerDeeplinkUrl || row?.deeplinkUrl || row?.offerWidgetUrl);
    return eventId ? buildTeplohodUrl(eventId) : null;
  }
  return buildTicketscloudWidgetUrl(row?.externalId);
}

function normalizeTeplohodExternalId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match ? match[1] : null;
}

function extractTeplohodEventIdFromUrl(url) {
  const match = String(url || '').match(/(?:teplohod\.info\/event\/|event_id=)(\d+)/i);
  return match ? match[1] : null;
}

function providerWidgetProvider(sourceCode) {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TEPLOHOD')) return 'TEPLOHOD';
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'TICKETSCLOUD';
  return null;
}

function extractTcExternalIdFromPurchaseUrl(url) {
  if (!url) return null;
  const match = String(url).match(/[?&]event=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function pickPrimaryPurchasableSession(sessions) {
  for (const session of sessions || []) {
    if (isPublicSessionPurchaseBlocked(session)) continue;
    if (!extractTcExternalIdFromPurchaseUrl(session.purchaseUrl)) continue;
    return session;
  }
  return sessions?.[0] || null;
}

function applyEventPrimaryPurchase(baseEvent, sessions, sourceCode) {
  const primarySession = pickPrimaryPurchasableSession(sessions);
  if (!primarySession?.purchaseUrl) return baseEvent;

  const tcEventId = extractTcExternalIdFromPurchaseUrl(primarySession.purchaseUrl);
  if (!tcEventId) return baseEvent;

  baseEvent.purchaseUrl = primarySession.purchaseUrl;
  baseEvent.widgetUrl = primarySession.purchaseUrl;
  if (providerWidgetProvider(sourceCode) === 'TICKETSCLOUD') {
    baseEvent.externalId = tcEventId;
    baseEvent.widgetPayload = {
      ...(baseEvent.widgetPayload || {}),
      provider: 'TICKETSCLOUD',
      tcEventId,
    };
  }

  return baseEvent;
}

function buildProviderWidgetPayload(row) {
  const provider = providerWidgetProvider(row?.sourceCode || row?.offerSourceCode);
  if (provider === 'TEPLOHOD') {
    const tepEventId = normalizeTeplohodEventId(row?.externalId);
    return {
      provider,
      tepEventId,
      tepWidgetId: process.env.TEP_WIDGET_ID || '14208',
    };
  }

  if (provider === 'TICKETSCLOUD') {
    return {
      provider,
      tcEventId: row?.externalId || null,
    };
  }

  return null;
}

function normalizeTeplohodEventId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match ? match[1] : raw;
}

async function categoryRows(db) {
  const result = await db.query(`
    select cat.title as source, count(e.id)::int as events
    from "Category" cat
    left join "Event" e on e."categoryId" = cat.id
    group by cat.title, cat.position
    order by cat.position asc
  `);
  return result.rows;
}

async function eventRows(db, limit, options = {}) {
  const lean = Boolean(options.lean);
  const ids = Array.isArray(options.ids) ? options.ids.filter(Boolean) : null;
  const params = [];
  let whereSql = '';
  if (ids?.length) {
    params.push(ids);
    whereSql = `where e.id = any($${params.length}::text[])`;
  }
  let limitSql = '';
  if (Number.isFinite(limit) && limit > 0) {
    params.push(Math.floor(limit));
    limitSql = `limit $${params.length}`;
  }

  const result = await db.query(
    `
      select
        e.id,
        e.slug,
        source_link."externalId",
        source.code as "sourceCode",
        source.name as "sourceName",
        e.title,
        ${lean ? "left(e.description, 4000) as description," : 'e.description,'}
        length(trim(coalesce(e.description, '')))::int as "descriptionLength",
        e.kind,
        e.status,
        e."sourceStatus",
        e."ageLimit",
        e."imageUrl",
        ${lean ? 'null::text as "seoH1",' : 'e."seoH1",'}
        ${lean ? 'null::text as "seoTitle",' : 'e."seoTitle",'}
        ${lean ? 'null::text as "seoDescription",' : 'e."seoDescription",'}
        e."canonicalPath",
        e."isIndexable",
        e."priceFromRub",
        e."ticketsVacant",
        e."categoryId",
        e."primarySubcategoryId",
        override.title as "overrideTitle",
        override.description as "overrideDescription",
        override."shortDescription" as "overrideShortDescription",
        override."imageUrl" as "overrideImageUrl",
        override."seoH1" as "overrideSeoH1",
        override."seoTitle" as "overrideSeoTitle",
        override."seoDescription" as "overrideSeoDescription",
        override."canonicalPath" as "overrideCanonicalPath",
        override."isIndexable" as "overrideIsIndexable",
        override."editorStatus" as "overrideEditorStatus",
        override."mergeGroupKey" as "overrideMergeGroupKey",
        cat.title as category,
        city.title as city,
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.slug as "venueSlug",
        venue.title as venue,
        venue.kind as "venueKind",
        offer."sourceCode" as "offerSourceCode",
        offer.title as "offerTitle",
        offer."priceRub" as "offerPriceRub",
        offer."widgetUrl" as "offerWidgetUrl",
        offer."deeplinkUrl" as "offerDeeplinkUrl",
        city.id as "cityId",
        city.slug as "citySlug",
        min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "nextStartsAt",
        min(session."startsAt") as "startsAt",
        min(session."priceFromRub") filter (where session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}) as "sessionPriceFromRub",
        count(distinct session.id)::int as "slotCount",
        ${orderedEventTagsSql('e.id')} as tags,
        coalesce((
          select array_agg(tag.id order by tag.title)
          from "EventTag" event_tag_ids
          join "Tag" tag on tag.id = event_tag_ids."tagId"
          where event_tag_ids."eventId" = e.id
        ), '{}') as "tagIds",
        coalesce(array_remove(array_agg(distinct event_subcategory."subcategoryId"), null), '{}') as "subcategoryIds"
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      left join "Source" source on source.id = source_link."sourceId"
      left join "EventOverride" override on override."eventId" = e.id
      left join "EventSession" session on session."eventId" = e.id
      left join lateral (
        select
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where "eventId" = e.id and active = true
        order by ("priceRub" >= ${MIN_DISPLAY_PRICE_RUB}) desc nulls last, "priceRub" asc nulls last
        limit 1
      ) offer on true
      left join "EventSubcategory" event_subcategory on event_subcategory."eventId" = e.id
      ${whereSql}
      group by
        e.id,
        source_link."externalId",
        source.code,
        source.name,
        override.id,
        cat.title,
        city.title,
        city.id,
        city.slug,
        city."isDestination",
        region.id,
        region.slug,
        region.title,
        venue.id,
        venue.slug,
        venue.title,
        venue.kind,
        offer."sourceCode",
        offer.title,
        offer."priceRub",
        offer."widgetUrl",
        offer."deeplinkUrl"
      order by e.status asc, min(session."startsAt") asc nulls last
      ${limitSql}
    `,
    params,
  );

  const separateCityHubs = collectSeparateCityHubNames(result.rows);
  return result.rows.map((row) => {
    const tags = row.tags || [];
    const destination = publicDestinationForCity(row, separateCityHubs);
    const fallbackDestinationName = cleanDisplayName(row.city) || 'Не указан';
    const priceFrom = displayPriceFrom(row.priceFromRub, row.sessionPriceFromRub, row.offerPriceRub);
    const purchase = purchaseInfo(row);
    const normalizedRow = { ...row, startsAt: row.nextStartsAt || row.startsAt, priceFrom, purchaseReady: purchase.ready, hasImage: Boolean(row.overrideImageUrl || row.imageUrl) };
    const readinessIssues = buildReadinessIssues(normalizedRow);
    const reasons = readinessIssues.map((issue) => issue.label);
    const gate = publishGate(normalizedRow, reasons, readinessIssues);
    const moderationStatus = row.overrideEditorStatus || row.status || 'REVIEW';
    const offerStatus = purchase.status;
    const severity = readinessSeverity(readinessIssues);
    const readiness = readinessIssues.length ? (severity === 'high' ? 'blocked' : 'review') : row.status === 'READY' ? 'ready' : 'review';
    return {
      id: row.id,
      slug: publicEventSlug(row.slug),
      sourceSlug: row.slug,
      source: row.sourceName || publicSourceLabel(row.sourceCode || row.offerSourceCode) || 'Источник',
      sourceCode: row.sourceCode || row.offerSourceCode,
      externalId: row.externalId,
      title: row.title,
      description: row.description,
      categoryId: row.categoryId,
      primarySubcategoryId: row.primarySubcategoryId,
      subcategoryIds: row.subcategoryIds || [],
      tagIds: row.tagIds || [],
      sourceCategory: row.category || 'unknown',
      proposedCategory: row.category || 'не определено',
      city: row.city || 'Не указан',
      cityId: row.cityId,
      citySlug: destination?.slug || publicCitySlug(fallbackDestinationName),
      sourceCitySlug: row.citySlug,
      destination: destination?.name || fallbackDestinationName,
      destinationType: destination?.type || 'city',
      venue: formatPublicVenueTitle(row.venue) || 'Не указано',
      venueId: row.venueId,
      venueSlug: row.venueSlug,
      venueKind: row.venueKind || 'OTHER',
      offerSourceCode: row.offerSourceCode,
      offerTitle: row.offerTitle,
      offerPriceRub: row.offerPriceRub,
      offerWidgetUrl: row.offerWidgetUrl,
      offerDeeplinkUrl: row.offerDeeplinkUrl,
      purchaseReady: purchase.ready,
      purchaseMode: purchase.mode,
      purchaseProvider: purchase.provider,
      purchaseUrlSource: purchase.urlSource,
      eventType: String(row.kind || '').toLowerCase(),
      startsAt: row.nextStartsAt || row.startsAt,
      slotCount: row.slotCount || 0,
      ageLimit: row.ageLimit,
      priceFrom,
      vacant: row.ticketsVacant,
      hasImage: Boolean(row.overrideImageUrl || row.imageUrl),
      imageUrl: row.imageUrl,
      seoH1: row.seoH1,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      canonicalPath: row.canonicalPath,
      isIndexable: row.isIndexable,
      override: {
        title: row.overrideTitle,
        description: row.overrideDescription,
        shortDescription: row.overrideShortDescription,
        imageUrl: row.overrideImageUrl,
        seoH1: row.overrideSeoH1,
        seoTitle: row.overrideSeoTitle,
        seoDescription: row.overrideSeoDescription,
        canonicalPath: row.overrideCanonicalPath,
        isIndexable: row.overrideIsIndexable,
        editorStatus: row.overrideEditorStatus,
        mergeGroupKey: row.overrideMergeGroupKey,
      },
      tags,
      landingHits: LANDING_RULES.filter((rule) => matchesLandingRule({ ...row, tags }, rule)).map((rule) => rule.title).slice(0, 3),
      reasons,
      readinessCodes: readinessIssues.map((issue) => issue.code),
      readinessIssues,
      moderationStatus,
      canPublish: gate.blockers.length === 0,
      publishBlockers: gate.blockers,
      publishWarnings: gate.warnings,
      severity,
      readiness,
      offerStatus,
      status: reasons.length ? 'needs_review' : row.status === 'READY' ? 'ready' : 'needs_review',
    };
  });
}

/** TicketsCloud widget page rejects `token=r:…` with HTTPForbidden/bad token. */
function sanitizeTicketscloudPurchaseUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (!/ticketscloud/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    const token = parsed.searchParams.get('token');
    if (token && token.startsWith('r:')) parsed.searchParams.set('token', token.slice(2));
    if (parsed.hostname === 'ticketscloud.org') parsed.hostname = 'ticketscloud.com';
    return parsed.toString();
  } catch {
    return raw;
  }
}

function purchaseInfo(row = {}) {
  const sourceCode = row.sourceCode || row.offerSourceCode;
  const provider = providerWidgetProvider(sourceCode);
  const fallbackUrl = sanitizeTicketscloudPurchaseUrl(
    buildProviderWidgetUrl({ ...row, offerSourceCode: sourceCode }),
  );
  // Prefer rebuilt TEP checkout: stored teplohod.info/event/* deeplinks currently 404.
  const explicitRaw = provider === 'TEPLOHOD' ? null : row.offerWidgetUrl || row.offerDeeplinkUrl || null;
  const explicitUrl = sanitizeTicketscloudPurchaseUrl(explicitRaw);
  const url = explicitUrl || fallbackUrl || null;
  const mode = provider === 'TEPLOHOD' || provider === 'TICKETSCLOUD' ? 'widget' : url ? 'redirect' : null;
  const urlSource = explicitUrl ? 'offer' : fallbackUrl ? 'fallback' : null;
  const status = !url
    ? 'нет виджета'
    : provider === 'TEPLOHOD'
      ? 'Teplohod widget'
      : provider === 'TICKETSCLOUD'
        ? 'TC widget'
        : 'widget';

  return {
    ready: Boolean(url),
    mode,
    provider,
    urlSource,
    url,
    status,
  };
}

function adminOfferStatus(row) {
  return purchaseInfo(row).status;
}

async function eventRowsByIds(db, ids, options = {}) {
  if (!ids.length) return [];
  const maxIds = Number.isFinite(options.maxIds) ? Math.max(1, Math.floor(options.maxIds)) : 500;
  const unique = Array.from(new Set(ids.filter(Boolean))).slice(0, maxIds);
  return eventRows(db, null, { lean: true, ids: unique });
}

function matchesAdminQuickFilter(event, view) {
  if (view === 'needs_attention') {
    return event.status === 'needs_review' || event.readiness === 'review' || event.readiness === 'blocked';
  }
  if (view === 'ready_publish') return event.readiness === 'ready' && event.canPublish !== false;
  if (view === 'purchase_blocked') return !event.purchaseReady;
  if (view === 'no_image') return !event.hasImage;
  if (view === 'landing_match') return (event.landingHits || []).length > 0;
  return true;
}

export function publishGate(event, reasons, readinessIssues = []) {
  const blockers = [];
  const warnings = [];

  if (event.priceFrom == null) blockers.push('нет цены / offer');
  if (!event.purchaseReady) blockers.push('нет виджета');
  if (!event.startsAt && event.kind !== 'OPEN_DATE') blockers.push('нет даты');
  if (!event.venue) blockers.push('нет площадки');
  if (!event.city) blockers.push('нет города');

  for (const issue of readinessIssues || []) {
    if (issue?.severity === 'high') {
      const label = issue.label || issue.code;
      if (label) blockers.push(label);
    }
  }

  for (const reason of reasons || []) {
    if (reason.includes('изображ')) warnings.push(reason);
    else if (reason.includes('подкатег') || reason.includes('музея') || reason.includes('сквоз')) warnings.push(reason);
    else if (!blockers.includes(reason)) warnings.push(reason);
  }

  return {
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  };
}

function normalizeOverridePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Override payload must be an object');
  }

  const normalized = {};
  for (const key of ['title', 'description', 'shortDescription', 'imageUrl', 'seoH1', 'seoTitle', 'seoDescription', 'canonicalPath']) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    normalized[key] = normalizeNullableString(payload[key]);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isIndexable')) {
    normalized.isIndexable = payload.isIndexable == null ? null : Boolean(payload.isIndexable);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'editorStatus')) {
    const value = normalizeNullableString(payload.editorStatus);
    const allowed = new Set(['DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN']);
    normalized.editorStatus = value && allowed.has(value) ? value : null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'mergeGroupKey')) {
    const value = normalizeNullableString(payload.mergeGroupKey);
    if (!value) {
      normalized.mergeGroupKey = null;
    } else {
      const normalizedKey = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!normalizedKey || normalizedKey.length > 64) {
        throw new Error('mergeGroupKey must be 1-64 chars: a-z, 0-9, _ and -');
      }
      normalized.mergeGroupKey = normalizedKey;
    }
  }

  return normalized;
}

function normalizeVenuePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Venue payload must be an object');
  }

  const normalized = {};
  for (const key of [
    'title',
    'description',
    'shortDescription',
    'heroImageUrl',
    'seoH1',
    'seoTitle',
    'seoDescription',
    'canonicalPath',
    'metroStation',
    'wayToFind',
    'parkingInfo',
    'hookFact',
  ]) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    normalized[key] = normalizeNullableString(payload[key]);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isIndexable')) {
    normalized.isIndexable = payload.isIndexable == null ? null : Boolean(payload.isIndexable);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'kind')) {
    const value = normalizeNullableString(payload.kind);
    const allowed = new Set(['VENUE', 'MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'PIER', 'MEETING_POINT', 'OUTDOOR_LOCATION', 'SPORT_ACTIVITY_SPACE', 'ATTRACTION', 'PARK', 'MONUMENT', 'GASTRO', 'ONLINE', 'OTHER']);
    normalized.kind = value && allowed.has(value) ? value : null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'pageStatus')) {
    const value = normalizeNullableString(payload.pageStatus);
    const allowed = new Set(['NONE', 'CANDIDATE', 'PUBLISHED', 'HIDDEN']);
    normalized.pageStatus = value && allowed.has(value) ? value : null;
  }

  return normalized;
}

function normalizeNullableString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function capitalizeLocality(value) {
  const text = String(value || '').trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function routeCityToPublicDisplayName(cityName) {
  const clean = canonicalizePublicCityName(cityName) || cleanDisplayName(cityName);
  if (!clean || clean === 'Не указан') return clean;
  if (isForeignPublicCity(clean)) return null;
  if (STANDALONE_CITY_NAMES.has(clean)) return clean;
  const mapped = CITY_TO_REGION.get(clean);
  if (mapped) return mapped;
  return clean;
}

function isAllowedPublicDestination(destination) {
  if (!destination?.name || destination.name === 'Не указан') return false;
  if (isForeignPublicCity(destination.name)) return false;
  if (destination.type === 'city') return STANDALONE_CITY_NAMES.has(destination.name);
  if (destination.type === 'region') return PUBLIC_REGION_NAMES.has(destination.name) || isPublicRegionName(destination.name);
  return false;
}

function buildPublicDestinationRecord(row, mappedName) {
  if (STANDALONE_CITY_NAMES.has(mappedName)) {
    const slug = publicCitySlug(mappedName);
    return {
      id: row.cityId || `city_${slug}`,
      slug,
      sourceSlug: row.citySlug || slug,
      name: mappedName,
      type: 'city',
    };
  }

  const slug = publicCitySlug(mappedName);
  return {
    id: row.regionId || `region_${slug}`,
    slug,
    sourceSlug: row.regionSlug || slug,
    name: mappedName,
    type: 'region',
  };
}

/** Обрезки названий: regex «с.» ошибочно съедал начальную «с» у слов (Синопской → Инопской). */
const CITY_BOGUS_ALIASES = new Map([
  ['анкт-петербург', 'Санкт-Петербург'],
  ['инопской', 'Санкт-Петербург'],
  ['инопская', 'Санкт-Петербург'],
  ['пуск', 'Санкт-Петербург'],
  ['плетни', 'Санкт-Петербург'],
  ['оляной', 'Санкт-Петербург'],
  ['аунд', 'Санкт-Петербург'],
  ['основское', 'Сосновское'],
  ['ветланская', 'Владивосток'],
  ['тромынский', 'Москва'],
  ['партаковская', 'Москва'],
  ['тороны', 'Москва'],
  ['ити', 'Владивосток'],
  ['алиха', 'Казань'],
  ['ерова', 'Самара'],
  ['цена', 'Нижний Новгород'],
  ['вобода', 'Самара'],
  ['оветская', 'Самара'],
  ['троителей', 'Тольятти'],
  ['троение', 'Тольятти'],
]);


function normalizeVenueTextKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizePublicCityName(value) {
  const raw = cleanDisplayName(value);
  if (!raw || raw === 'Не указан') return null;
  const alias = CITY_BOGUS_ALIASES.get(normalizeVenueTextKey(raw));
  return alias || raw;
}

function haystackIncludesCityToken(haystack, cityName) {
  const token = normalizeVenueTextKey(cityName);
  if (!token) return false;
  const normalizedHaystack = normalizeVenueTextKey(haystack);
  return ` ${normalizedHaystack} `.includes(` ${token} `);
}

function inferVenueLocalityLabel(name, address) {
  const text = `${name || ''} ${address || ''}`.toLowerCase();
  // Только «с.» с точкой — иначе «синопской» превращается в «инопской».
  const villageMatch = text.match(/(?:^|[,\s])с\.(\s*)([а-яё][а-яё-]{2,40})/);
  if (villageMatch) return capitalizeLocality(villageMatch[2]);
  const regionMatch = text.match(/республик[аи]\s+[а-яё][а-яё\s-]{2,40}/i);
  if (regionMatch) return capitalizeLocality(regionMatch[0]);
  if (text.includes('хакас')) return 'Республика Хакасия';
  return null;
}

function venueLocationContradictsCity(name, address, dbCity) {
  const db = normalizeVenueTextKey(dbCity);
  if (!db || db === 'не указан') return false;
  const haystack = `${name || ''} ${address || ''}`.toLowerCase();
  if (haystack.includes('хакас') && !['абакан', 'хакас', 'черногор', 'минусин', 'ефрем'].some((part) => db.includes(part))) {
    return true;
  }
  if (CITY_BOGUS_ALIASES.has(db)) return true;
  const locality = inferVenueLocalityLabel(name, address);
  if (locality && !haystackIncludesCityToken(haystack, dbCity) && normalizeVenueTextKey(locality) !== db) {
    return true;
  }
  const inferred = inferCityNameFromText(name, address);
  if (inferred && normalizeVenueTextKey(inferred) !== db && !haystackIncludesCityToken(haystack, dbCity)) {
    return true;
  }
  return false;
}




function normalizePublishStatus(value, fallback = 'REVIEW') {
  const normalized = normalizeNullableString(value);
  const allowed = new Set(['DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN']);
  return normalized && allowed.has(normalized) ? normalized : fallback;
}

function normalizeManualMatchStatus(value) {
  const normalized = normalizeNullableString(value);
  const allowed = new Set(['PINNED', 'EXCLUDED', 'REVIEW']);
  return normalized && allowed.has(normalized) ? normalized : 'REVIEW';
}

async function ensureLandingRecord(db, rule) {
  const result = await db.query(
    `
      insert into "Landing" (id, type, slug, title, subtitle, status, rules, "isIndexable", "isActive", "updatedAt")
      values ($1, $6::"LandingType", $2, $3, $4, 'REVIEW', $5::jsonb, false, true, now())
      on conflict (slug) do update set
        rules = excluded.rules,
        "isActive" = true,
        "updatedAt" = now()
      returning id
    `,
    [randomUUID(), rule.slug, rule.title, rule.subtitle || null, JSON.stringify(rule), landingTypeForRule(rule)],
  );
  return result.rows[0]?.id;
}

async function upsertSeoMeta(db, entityType, entityId, payload) {
  if (!entityId) return null;
  const result = await db.query(
    `
      insert into "SeoMeta" (
        id, "entityType", "entityId", title, description, h1, "canonicalUrl", robots,
        "ogTitle", "ogDescription", "ogImageUrl", "updatedAt"
      )
      values ($1, $2::"SeoEntityType", $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
      on conflict ("entityType", "entityId") do update set
        title = excluded.title,
        description = excluded.description,
        h1 = excluded.h1,
        "canonicalUrl" = excluded."canonicalUrl",
        robots = excluded.robots,
        "ogTitle" = excluded."ogTitle",
        "ogDescription" = excluded."ogDescription",
        "ogImageUrl" = excluded."ogImageUrl",
        "updatedAt" = now()
      returning id
    `,
    [
      randomUUID(),
      entityType,
      entityId,
      payload.title ?? null,
      payload.description ?? null,
      payload.h1 ?? null,
      payload.canonicalUrl ?? null,
      payload.robots ?? null,
      payload.ogTitle ?? null,
      payload.ogDescription ?? null,
      payload.ogImageUrl ?? null,
    ],
  );
  return result.rows[0] || null;
}

function mapLandingRecord(row, rule) {
  return {
    id: row?.id || null,
    slug: rule.slug,
    type: row?.type || landingTypeForRule(rule),
    title: row?.title || rule.title,
    subtitle: row?.subtitle || rule.subtitle || null,
    description: row?.description || null,
    status: row?.status || 'REVIEW',
    heroTitle: row?.heroTitle || row?.title || rule.title,
    heroSubtitle: row?.heroSubtitle || row?.subtitle || rule.subtitle || null,
    heroBadge: row?.heroBadge || null,
    heroImageUrl: row?.heroImageUrl || null,
    heroMobileImageUrl: row?.heroMobileImageUrl || null,
    templateType: row?.templateType || (rule.city ? 'COMPARISON_TABLE' : 'HYBRID'),
    layoutVariant: row?.layoutVariant || null,
    surfaceVariant: row?.surfaceVariant || null,
    isIndexable: row?.isIndexable ?? false,
    isActive: row?.isActive ?? true,
    publishedAt: row?.publishedAt || null,
  };
}

function mapLandingSeo(row, rule) {
  return {
    h1: row?.metaH1 || row?.seoH1 || rule.title,
    title: row?.metaTitle || row?.seoTitle || `${rule.title}: афиша, расписание и билеты | Дайбилет`,
    description: row?.metaDescription || row?.seoDescription || `${rule.subtitle || rule.title}. Быстрый выбор по датам, городам, площадкам и цене.`,
    canonicalUrl: row?.metaCanonicalUrl || row?.canonicalUrl || `/landings/${rule.slug}`,
    robots: row?.metaRobots || (row?.isIndexable ? 'index,follow' : 'noindex,follow'),
    ogTitle: row?.metaOgTitle || row?.seoTitle || null,
    ogDescription: row?.metaOgDescription || row?.seoDescription || null,
    ogImageUrl: row?.metaOgImageUrl || row?.ogImageUrl || null,
  };
}

function landingTypeForRule(rule) {
  return rule.city ? 'CITY' : 'MULTI_CITY';
}

function mapLandingBlock(row) {
  return {
    id: row.id,
    type: row.type,
    variant: row.variant || null,
    title: row.title || null,
    subtitle: row.subtitle || null,
    eyebrow: row.eyebrow || null,
    body: row.body || null,
    richTextJson: row.richTextJson || null,
    payload: row.payload || null,
    assetUrl: row.assetUrl || null,
    mobileAssetUrl: row.mobileAssetUrl || null,
    isEnabled: row.isEnabled !== false,
    sortOrder: row.sortOrder || 0,
  };
}

function buildDefaultLandingBlocks(rule, matchedEvents) {
  const cities = Object.entries(countBy(matchedEvents.map((event) => event.destination || event.city).filter(Boolean)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([title, count]) => ({ title, count }));
  const venues = Object.entries(countBy(matchedEvents.map((event) => event.venue).filter(Boolean)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([title, count]) => ({ title, count }));
  const prices = matchedEvents.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const landingType = landingTypeForRule(rule);
  const cityLabel = rule.city || (cities.length ? `${cities.length} городов` : 'разных городах');

  const blocks = [
    {
      id: `fallback-${rule.slug}-trust`,
      type: 'TRUST_BADGES',
      variant: 'compact',
      eyebrow: 'Быстрый выбор',
      title: landingType === 'CITY' ? `Что есть в подборке для города ${rule.city}` : 'Что есть в подборке',
      payload: {
        items: [
          { title: `${matchedEvents.length} событий`, text: 'Импортировано из билетных систем и сгруппировано без дублей слотов.' },
          { title: `${new Set(matchedEvents.map((event) => event.venue).filter(Boolean)).size} площадок`, text: 'Можно быстро сравнить место, дату и цену.' },
          { title: minPrice ? `от ${minPrice} ₽` : 'цены уточняются', text: 'Показываем взрослые/основные цены от 100 ₽, без младенческих тарифов.' },
        ],
      },
      sortOrder: 10,
    },
    {
      id: `fallback-${rule.slug}-value`,
      type: 'VALUE_PROPS',
      variant: landingType === 'CITY' ? 'scenario' : 'hub',
      title: landingType === 'CITY' ? 'Как выбрать подходящий вариант' : 'Быстрые сценарии выбора',
      subtitle: landingType === 'CITY'
        ? 'Сначала сузьте дату и формат, потом сравните ближайшие сеансы в таблице.'
        : 'Широкие лендинги работают как навигация: помогают выбрать город, формат и перейти к покупке.',
      payload: {
        items: [
          { title: 'По дате', text: 'Фильтры поднимают ближайшие сеансы и вечерние варианты.' },
          { title: 'По месту', text: venues.length ? `Популярные площадки: ${venues.slice(0, 3).map((item) => item.title).join(', ')}.` : 'Площадки появятся после импорта.' },
          { title: 'По цене', text: 'В таблице можно сортировать варианты по минимальной доступной цене.' },
        ],
      },
      sortOrder: 20,
    },
    {
      id: `fallback-${rule.slug}-story`,
      type: 'STORY',
      variant: 'editorial',
      title: rule.title,
      subtitle: rule.subtitle || null,
      body: landingType === 'CITY'
        ? `Подборка собирает предложения ${destinationPrepositional({ slug: '', name: rule.city, type: 'city' })}: ближайшие даты, площадки, цены и ссылку на покупку у билетного оператора.`
        : `Это тематическая витрина по направлению «${rule.title}». На верхнем уровне важнее быстро показать города и форматы, а покупочную таблицу оставляем как удобный модуль ниже.`,
      sortOrder: 30,
    },
    {
      id: `fallback-${rule.slug}-faq`,
      type: 'FAQ',
      variant: 'seo',
      title: 'Вопросы перед покупкой',
      payload: {
        items: [
          { question: 'Где проходит оплата?', answer: 'Оплата и чек остаются на стороне билетной системы. Дайбилет хранит факт покупки и статус билета.' },
          { question: 'Почему одно событие может иметь много сеансов?', answer: 'Поставщики часто отдают каждый слот отдельно. Мы группируем одинаковые названия и площадки в одну карточку.' },
          { question: 'Как обновляются даты и цены?', answer: 'Данные обновляются импортом из поставщика; финальная доступность проверяется при переходе к покупке.' },
        ],
      },
      sortOrder: 40,
    },
  ];

  if (landingType === 'MULTI_CITY' && cities.length) {
    blocks.splice(2, 0, {
      id: `fallback-${rule.slug}-cities`,
      type: 'CITY_GRID',
      variant: 'hub',
      title: 'Города в подборке',
      subtitle: 'На мультилендинге лучше вести пользователя в городские срезы, а не дублировать сотни одинаковых строк.',
      payload: { items: cities },
      sortOrder: 25,
    });
  }

  return blocks;
}

function mapLandingAdminEvent(event, manualRow, isAutoMatch, rule = null) {
  const manual = manualRow?.reasons || null;
  const ruleExplanation = rule ? explainLandingRuleMatch(event, rule) : { reasons: [], blockers: [] };
  const manualStatus = manual?.manualStatus || null;
  return {
    id: event.id,
    groupEventIds: event.groupEventIds?.length ? event.groupEventIds : [event.id],
    slug: event.slug,
    title: event.title,
    city: event.city,
    venue: event.venue,
    startsAt: event.startsAt,
    priceFrom: event.priceFrom,
    readiness: event.readiness,
    category: event.sourceCategory,
    tags: event.tags || [],
    isAutoMatch,
    manualStatus,
    manualNote: manual?.note || null,
    matchReasons: uniqueValues([
      manualStatus === 'PINNED' ? 'ручное закрепление' : null,
      manualStatus === 'EXCLUDED' ? 'ручное скрытие' : null,
      manualStatus === 'REVIEW' ? 'ручной возврат к авто' : null,
      ...ruleExplanation.reasons,
    ].filter(Boolean)).slice(0, 10),
    matchBlockers: ruleExplanation.blockers || [],
  };
}

function landingEventSearchText(event) {
  return [
    event.title,
    event.id,
    event.city,
    event.destination,
    event.venue,
    event.sourceCategory,
    event.proposedCategory,
    event.sourceCode,
    event.source,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function mapOverrideRow(row) {
  return {
    title: row.title,
    description: row.description,
    shortDescription: row.shortDescription,
    imageUrl: row.imageUrl,
    seoH1: row.seoH1,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalPath: row.canonicalPath,
    isIndexable: row.isIndexable,
    editorStatus: row.editorStatus,
    mergeGroupKey: row.mergeGroupKey,
  };
}



/** Short hub chips on `/cities` cards (CHPU landings). */
const CITY_HUB_LANDING_SHORT = {
  'river-cruises': 'Речные',
  'bus-tours': 'Автобусные',
  'river-party': 'Вечеринки',
  'bridges-night': 'Мосты',
  'moscow-dinner-boat': 'Ужин',
  'moscow-museums': 'Музеи',
  'moscow-city-day': 'День города',
  'spb-yards': 'Дворы',
  standup: 'Стендап',
  'family-kids': 'Семьям',
  'concerts-genre': 'Концерты',
  'walking-tours': 'Пешие',
  'country-tours': 'Загород',
  exhibitions: 'Выставки',
  'active-sport': 'Активный',
  rooftops: 'Смотровые',
  planetarium: 'Планетарий',
  excursions: 'Экскурсии',
  'unusual-theatres': 'Театр',
  'new-year': 'Новый год',
  'salute-9-may': 'Салют',
};

function buildCityHubTags(bucket) {
  const landingTags = Array.from(bucket.landings.entries())
    .map(([slug, events]) => {
      const rule = LANDING_RULES.find((item) => item.slug === slug);
      const label = CITY_HUB_LANDING_SHORT[slug] || rule?.chips?.[0] || rule?.title || null;
      if (!label) return null;
      return { slug, label, events, kind: 'landing' };
    })
    .filter(Boolean)
    .sort((a, b) => b.events - a.events || a.label.localeCompare(b.label, 'ru'))
    .slice(0, 3);

  if (landingTags.length >= 2) return landingTags;

  const categoryTags = Array.from(bucket.categories.entries())
    .map(([name, events]) => ({
      slug: null,
      label: name,
      events,
      kind: 'category',
    }))
    .sort((a, b) => b.events - a.events || a.label.localeCompare(b.label, 'ru'))
    .slice(0, 3 - landingTags.length);

  return [...landingTags, ...categoryTags].slice(0, 3);
}

async function destinationRows(db) {
  const sessions = await publicCatalogSessions(db);
  return buildPublicDestinationRowsFromSessions(sessions);
}

async function destinationSummaryRowsFast(db) {
  const result = await db.query(
    `
      with primary_offer as (
        select distinct on ("eventId")
          "eventId",
          "sourceCode",
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where active = true
        order by "eventId", ("priceRub" >= $1) desc nulls last, "priceRub" asc nulls last
      ),
      event_base as (
        select
          e.id,
          source.code as "sourceCode",
          coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as "sourceLabel",
          e.title,
          override.title as "overrideTitle",
          e.kind,
          e."sourceStatus",
          city.id as "cityId",
          city.title as city,
          city.slug as "citySlug",
          city."isDestination" as "cityIsDestination",
          region.id as "regionId",
          region.slug as "regionSlug",
          region.title as "regionTitle",
          venue.id as "venueId",
          venue.title as venue,
          min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "startsAt",
          count(distinct session.id) filter (where ${ACTIVE_SESSION_SQL})::int as "slotCount",
          min(e."priceFromRub") filter (where e."priceFromRub" >= $1) as "eventPriceFromRub",
          min(session."priceFromRub") filter (where ${ACTIVE_SESSION_SQL} and session."priceFromRub" >= $1) as "sessionPriceFromRub",
          min(primary_offer."priceRub") filter (where primary_offer."priceRub" >= $1) as "offerPriceRub",
          bool_or(
            primary_offer."widgetUrl" is not null
            or primary_offer."deeplinkUrl" is not null
            or (
              coalesce(source.code::text, primary_offer."sourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
              and source_link."externalId" is not null
            )
          ) as "widgetReady"
        from "Event" e
        left join "City" city on city.id = e."primaryCityId"
        left join "Region" region on region.id = city."regionId"
        left join "Venue" venue on venue.id = e."venueId"
        left join "EventOverride" override on override."eventId" = e.id
        left join "EventSourceLink" source_link on source_link."eventId" = e.id
        left join "Source" source on source.id = source_link."sourceId"
        left join "EventSession" session on session."eventId" = e.id
        left join primary_offer on primary_offer."eventId" = e.id
        where e.status not in ('HIDDEN', 'DRAFT')
        group by
          e.id,
          source.name,
          source.code,
          source_link."externalId",
          primary_offer."sourceCode",
          override.id,
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
            from (values ("eventPriceFromRub"), ("sessionPriceFromRub"), ("offerPriceRub")) as prices(price)
            where price is not null and price >= $1
          ) as "priceFrom",
          (
            "widgetReady"
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
              nullif(trim(${catalogGroupTitleSqlExpression()}), ''),
              trim(coalesce(venue, ''))
            )), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(venue, '')), '\\s+', ' ', 'g'))
          ) as "groupKey"
        from normalized
        where "purchaseReady" = true
          and lower(coalesce("sourceStatus", '')) not in (${PUBLIC_SALES_BLOCKED_STATUS_SQL})
          and (
            "startsAt" is not null
            or kind = 'OPEN_DATE'
            or "sourceStatus" = 'open_date'
          )
      ),
      ranked as (
        select
          *,
          row_number() over (partition by "groupKey" order by "startsAt" asc nulls last, title asc) as rank
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
    `,
    [MIN_DISPLAY_PRICE_RUB],
  );

  const buckets = new Map();
  const separateCityHubs = collectSeparateCityHubNames(result.rows);
  for (const row of result.rows) {
    const destination = publicDestinationForCity(row, separateCityHubs);
    // Foreign / unroutable cities return null — skip without crashing /api/public/stats.
    if (!destination?.name || destination.name === 'Не указан') continue;
    if (!buckets.has(destination.name)) {
      buckets.set(destination.name, {
        id: destination.id,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
        name: destination.name,
        type: destination.type,
        events: 0,
        venueIds: new Set(),
      });
    }

    const bucket = buckets.get(destination.name);
    bucket.events += 1;
    if (row.venueId) bucket.venueIds.add(row.venueId);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      id: bucket.id,
      slug: bucket.slug,
      sourceSlug: bucket.sourceSlug,
      name: bucket.name,
      type: bucket.type,
      events: bucket.events,
      venues: bucket.venueIds.size,
    }))
    .filter(isVisibleOnCitiesCatalog)
    .filter(isAllowedPublicDestination)
    .sort(destinationSort);
}

function publicDestinationForCity(row, separateCityHubs) {
  const cityName = cleanDisplayName(row.city) || 'Не указан';

  if (isForeignPublicCity(cityName)) {
    return null;
  }

  const mappedRegion = CITY_TO_REGION.get(cityName);
  const keepAsSeparateCity =
    isSubjectCapitalCity(cityName) ||
    (isFoldingRegionalTown(cityName) && separateCityHubs && separateCityHubs.has(cityName)) ||
    (STANDALONE_CITY_NAMES.has(cityName) && !mappedRegion);

  if (keepAsSeparateCity) {
    return buildPublicDestinationRecord(row, cityName);
  }

  if (isPublicRegionName(cityName)) {
    return buildPublicDestinationRecord(row, cityName);
  }

  if (mappedRegion) {
    return buildPublicDestinationRecord(row, mappedRegion);
  }

  if (row.cityIsDestination === false && row.regionTitle) {
    return buildPublicDestinationRecord(row, row.regionTitle);
  }

  const routed = routeCityToPublicDisplayName(cityName);
  if (!routed) return null;
  return buildPublicDestinationRecord(row, routed);
}

const CITY_SLUG_CANONICAL = {
  moscow: 'moskva',
  moskva: 'moskva',
  'saint-petersburg': 'sankt-peterburg',
  'sankt-peterburg': 'sankt-peterburg',
  // latin SEO slug, destination slug, and Cyrillic DB slug (и→i → nizhnii-…)
  'nizhny-novgorod': 'nizhniy-novgorod',
  'nizhniy-novgorod': 'nizhniy-novgorod',
  'nizhnii-novgorod': 'nizhniy-novgorod',
  'veliky-novgorod': 'velikiy-novgorod',
  'velikiy-novgorod': 'velikiy-novgorod',
  rostov: 'rostov-na-donu',
  'rostov-on-don': 'rostov-na-donu',
  'rostov-na-donu': 'rostov-na-donu',
};

function canonicalCitySlug(value) {
  const slug = publicCitySlug(value) || String(value || '').trim().toLowerCase();
  return CITY_SLUG_CANONICAL[slug] || slug;
}

function destinationSessionIndexKeys(session) {
  const destination = publicDestinationFromSession(session);
  const keys = new Set();
  const add = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    keys.add(normalized.toLowerCase());
    const canonical = canonicalCitySlug(normalized);
    if (canonical) keys.add(canonical.toLowerCase());
  };

  add(destination.id);
  add(destination.slug);
  add(destination.sourceSlug);
  add(destination.name);
  add(session.cityId);
  add(session.sourceCitySlug);
  add(session.city);

  return keys;
}

function buildDestinationSessionIndex(sessions) {
  const index = new Map();
  for (const session of sessions) {
    for (const key of destinationSessionIndexKeys(session)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(session);
    }
  }
  return index;
}

function buildVenueSessionIndex(sessions) {
  const index = new Map();
  const add = (key, session) => {
    if (!key) return;
    const normalized = String(key).toLowerCase();
    if (!index.has(normalized)) index.set(normalized, []);
    index.get(normalized).push(session);
  };

  for (const session of sessions) {
    add(session.venueId, session);
    add(session.venueSlug, session);
    if (session.venueSlug) add(canonicalCitySlug(session.venueSlug), session);
    const pierKey = canonicalSessionPierKey(session);
    if (pierKey) add(`pier:${pierKey}`, session);
  }

  return index;
}

function buildCatalogSlugIndex(sessions) {
  const index = new Map();
  const add = (key, session) => {
    if (!key) return;
    const normalized = String(key).toLowerCase();
    if (!index.has(normalized)) index.set(normalized, session);
  };

  for (const session of sessions) {
    add(session.id, session);
    add(session.slug, session);
    add(session.sourceSlug, session);
    if (session.sourceSlug) add(publicEventSlug(session.sourceSlug), session);
    if (session.slug) add(publicEventSlug(session.slug), session);
    for (const eventId of session.groupEventIds || []) add(eventId, session);
  }

  return index;
}


function lookupCatalogSessionBySlug(slugOrId, catalogSessions = null) {
  const value = String(slugOrId || '').trim();
  if (!value) return null;

  const requestedSlug = publicEventSlug(value);
  const keys = [value, requestedSlug].filter(Boolean).map((key) => String(key).toLowerCase());
  const index = publicCatalogCache?.slugIndex;
  if (index) {
    for (const key of keys) {
      const hit = index.get(key);
      if (hit) return hit;
    }
  }

  const sessions = catalogSessions || publicCatalogCache?.sessions || [];
  return (
    sessions.find(
      (session) =>
        session.id === value ||
        session.slug === requestedSlug ||
        session.sourceSlug === value ||
        publicEventSlug(session.sourceSlug) === requestedSlug ||
        (session.groupEventIds || []).includes(value),
    ) || null
  );
}


function matchesPublicDestinationPage(session, citySlugOrId, requestedSlug) {
  const destination = publicDestinationFromSession(session);
  const requested = canonicalCitySlug(requestedSlug);
  if (destination.type === 'region') {
    return (
      destination.id === citySlugOrId ||
      canonicalCitySlug(destination.sourceSlug) === requested ||
      canonicalCitySlug(destination.slug) === requested
    );
  }

  return (
    session.cityId === citySlugOrId ||
    canonicalCitySlug(session.sourceCitySlug) === requested ||
    destination.id === citySlugOrId ||
    canonicalCitySlug(destination.sourceSlug) === requested ||
    canonicalCitySlug(destination.slug) === requested ||
    canonicalCitySlug(session.city) === requested
  );
}

function cleanDisplayName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function destinationSort(a, b) {
  const aGroup = destinationSortGroup(a.name, a.type);
  const bGroup = destinationSortGroup(b.name, b.type);
  if (aGroup !== bGroup) return aGroup.localeCompare(bGroup, 'ru');
  if (a.type !== b.type) return a.type === 'city' ? -1 : 1;
  return b.events - a.events || a.name.localeCompare(b.name, 'ru');
}

function destinationSortGroup(name, type) {
  const groups = {
    'Москва': '01-moscow',
    'Московская область': '01-moscow',
    'Санкт-Петербург': '02-spb',
    'Ленинградская область': '02-spb',
    'Казань': '03-kazan',
    'Республика Татарстан': '03-kazan',
    'Краснодар': '04-krasnodar',
    'Краснодарский край': '04-krasnodar',
    'Красноярск': '05-krasnoyarsk',
    'Красноярский край': '05-krasnoyarsk',
    'Абакан': '06-khakasia',
    'Республика Хакасия': '06-khakasia',
    'Ульяновск': '07-ulyanovsk',
    'Ульяновская область': '07-ulyanovsk',
    'Владивосток': '08-vladivostok',
    'Приморский край': '08-vladivostok',
    'Хабаровск': '09-khabarovsk',
    'Хабаровский край': '09-khabarovsk',
    'Самара': '10-samara',
    'Самарская область': '10-samara',
    'Челябинск': '11-chelyabinsk',
    'Челябинская область': '11-chelyabinsk',
    'Уфа': '12-ufa',
    'Республика Башкортостан': '12-ufa',
    'Барнаул': '13-barnaul',
    'Алтайский край': '13-barnaul',
  };
  return groups[name] || `90-${type}-${name}`;
}

async function publicSessions(db, limit) {
  const rows = await publicCatalogSessions(db);
  return rows.slice(0, limit);
}

export async function publicCatalogSessions(db, forceRefresh = false) {
  const now = Date.now();
  const cached = publicCatalogCache;

  if (forceRefresh) {
    if (cached?.sessions) {
      publicCatalogCache = { ...cached, expiresAt: 0, staleUntil: 0 };
    }
    return schedulePublicCatalogRebuild(db, 'force-refresh');
  }

  // Fresh hit.
  if (cached?.sessions && now < cached.expiresAt) {
    return cached.sessions;
  }

  // INC.504.4 / INC.504.5: serve ANY previous sessions immediately; refresh only via
  // canonical public-catalog.dto (child/disk/single-flight) - never a second SQL rebuild.
  if (cached?.sessions?.length) {
    void schedulePublicCatalogRebuild(db, now < (cached.staleUntil || 0) ? 'swr' : 'soft-expire');
    return cached.sessions;
  }

  return schedulePublicCatalogRebuild(db, 'cold');
}

/**
 * INC.504.5: legacy dto.js catalog is an adopt/index layer over public-catalog.dto.ts.
 * Heavy rebuild (SQL + map) lives only in the DTO path / child process.
 */
function schedulePublicCatalogRebuild(db, reason = 'refresh') {
  if (publicCatalogBuildPromise) return publicCatalogBuildPromise;

  publicCatalogBuildPromise = (async () => {
    const startedAt = Date.now();
    try {
      const rows = await loadCanonicalPublicCatalogSessions(db, reason);
      await adoptCanonicalCatalogSessions(rows, reason);
      console.log(
        `Public catalog legacy cache adopted from DTO (${reason}): ${rows.length} sessions in ${Date.now() - startedAt}ms`,
      );
      return rows;
    } finally {
      publicCatalogBuildPromise = null;
    }
  })().catch((error) => {
    publicCatalogBuildPromise = null;
    console.warn(
      `Public catalog legacy cache adopt failed (${reason}): ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  });

  return publicCatalogBuildPromise;
}

async function loadCanonicalPublicCatalogSessions(db, reason) {
  const forceRefresh = reason === 'force-refresh';
  try {
    const { getPublicCatalogSessions } = await import('./public-catalog.dto.js');
    return await getPublicCatalogSessions(forceRefresh, { hydrateSlots: false });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const stale = publicCatalogCache?.sessions;
    // Prefer forever-stale over uncontrolled SQL on the API event loop.
    if (stale?.length) {
      console.warn(
        `Canonical catalog load failed (${reason}), serving stale legacy cache (${stale.length} sessions): ${detail}`,
      );
      return stale;
    }

    const now = Date.now();
    const since = now - lastLegacyCatalogSqlFallbackAt;
    if (lastLegacyCatalogSqlFallbackAt && since < LEGACY_CATALOG_SQL_COOLDOWN_MS) {
      const waitSec = Math.ceil((LEGACY_CATALOG_SQL_COOLDOWN_MS - since) / 1000);
      console.error(
        `CRITICAL P1: legacy inline SQL fallback SKIPPED (rate-limited ${waitSec}s left) after canonical failure (${reason}): ${detail}`,
      );
      throw error;
    }

    lastLegacyCatalogSqlFallbackAt = now;
    // Alert string (P1): keep "legacy inline SQL fallback" verbatim for log monitors.
    console.error(
      `CRITICAL P1: Canonical catalog load failed (${reason}), legacy inline SQL fallback: ${detail}`,
    );
    return publicCatalogSessionsFast(db);
  }
}

function yieldEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

function mapIndexListsToIds(index) {
  const out = Object.create(null);
  for (const [key, list] of index.entries()) {
    out[key] = (list || []).map((session) => session?.id).filter(Boolean);
  }
  return out;
}

function mapIndexOneToId(index) {
  const out = Object.create(null);
  for (const [key, session] of index.entries()) {
    if (session?.id) out[key] = session.id;
  }
  return out;
}

/** INC.504.5c: serialize Maps → id pointers for disk artifact v2 (built in Catalog Worker). */
export function serializePublicCatalogLegacyIndexes(sessions) {
  const destinationIndex = buildDestinationSessionIndex(sessions);
  const venueIndex = buildVenueSessionIndex(sessions);
  const slugIndex = buildCatalogSlugIndex(sessions);
  const catalogFacets = buildCatalogFacets(sessions.filter(sessionHasCoverImage));
  return {
    destinationIndex: mapIndexListsToIds(destinationIndex),
    venueIndex: mapIndexListsToIds(venueIndex),
    slugIndex: mapIndexOneToId(slugIndex),
    catalogFacets,
  };
}

/** Hydrate id-pointer indexes back to Maps of session object refs. */
export function hydratePublicCatalogLegacyIndexes(sessions, serialized) {
  if (!serialized || typeof serialized !== 'object') return null;
  const byId = new Map((sessions || []).map((session) => [String(session.id), session]));
  const hydrateList = (record) => {
    const map = new Map();
    for (const [key, ids] of Object.entries(record || {})) {
      const list = (Array.isArray(ids) ? ids : [])
        .map((id) => byId.get(String(id)))
        .filter(Boolean);
      if (list.length) map.set(key, list);
    }
    return map;
  };
  const hydrateOne = (record) => {
    const map = new Map();
    for (const [key, id] of Object.entries(record || {})) {
      const session = byId.get(String(id));
      if (session) map.set(key, session);
    }
    return map;
  };
  return {
    destinationIndex: hydrateList(serialized.destinationIndex),
    venueIndex: hydrateList(serialized.venueIndex),
    slugIndex: hydrateOne(serialized.slugIndex),
    catalogFacets: serialized.catalogFacets || buildCatalogFacets(sessions.filter(sessionHasCoverImage)),
  };
}

async function adoptCanonicalCatalogSessions(rows, _reason) {
  const now = Date.now();
  const prev = publicCatalogCache;
  const sameBlob = Boolean(prev?.sessions && rows === prev.sessions);

  let destinationIndex;
  let venueIndex;
  let slugIndex;
  let catalogFacets;
  let builtAt;

  if (sameBlob && prev?.destinationIndex && prev?.venueIndex && prev?.slugIndex && prev?.catalogFacets) {
    destinationIndex = prev.destinationIndex;
    venueIndex = prev.venueIndex;
    slugIndex = prev.slugIndex;
    catalogFacets = prev.catalogFacets;
    builtAt = prev.builtAt || now;
  } else {
    // Prefer prebuilt indexes from disk v2 (Catalog Worker) - no Map rebuild on API.
    let hydrated = null;
    try {
      const { loadPublicCatalogDiskCache } = await import('./public-catalog-disk-cache.js');
      const disk = loadPublicCatalogDiskCache();
      if (disk?.version === 2 && disk.indexes && (disk.sessions === rows || disk.sessions?.length === rows.length)) {
        hydrated = hydratePublicCatalogLegacyIndexes(rows, disk.indexes);
      }
    } catch {
      hydrated = null;
    }

    if (hydrated?.destinationIndex && hydrated?.venueIndex && hydrated?.slugIndex) {
      destinationIndex = hydrated.destinationIndex;
      venueIndex = hydrated.venueIndex;
      slugIndex = hydrated.slugIndex;
      catalogFacets = hydrated.catalogFacets;
      builtAt = now;
      console.log(
        `Public catalog legacy indexes hydrated from disk v2 (${rows.length} sessions)`,
      );
    } else {
      // Yield between heavy index maps so health/HTTP can run mid-adopt.
      await yieldEventLoop();
      destinationIndex = buildDestinationSessionIndex(rows);
      await yieldEventLoop();
      venueIndex = buildVenueSessionIndex(rows);
      await yieldEventLoop();
      slugIndex = buildCatalogSlugIndex(rows);
      await yieldEventLoop();
      catalogFacets = buildCatalogFacets(rows.filter(sessionHasCoverImage));
      builtAt = now;
    }
  }

  publicCatalogCache = {
    expiresAt: now + Math.max(30_000, PUBLIC_CATALOG_CACHE_MS),
    staleUntil: now + Math.max(60_000, PUBLIC_CATALOG_STALE_MS),
    sessions: rows,
    destinationIndex,
    venueIndex,
    slugIndex,
    catalogFacets,
    builtAt,
  };
}

/** Emergency fallback only (INC.504.5): prefer public-catalog.dto / child / disk. */
async function publicCatalogSessionsFast(db) {
  const [result, pinnedResult] = await Promise.all([
    db.query(
    `
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
        select distinct on ("eventId")
          "eventId",
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where active = true
        order by "eventId", ("priceRub" >= $1) desc nulls last, "priceRub" asc nulls last
      ),
      event_base as (
        select
          e.id,
          e.slug,
          identity."externalId",
          source.code as "sourceCode",
          source.name as "sourceName",
          coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as "sourceLabel",
          e.title,
          e.description,
          e.kind,
          e."sourceStatus",
          e."ageLimit",
          e."imageUrl",
          e."priceFromRub",
          e."ticketsVacant",
          cat.title as category,
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
          min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "startsAt",
          min(session."priceFromRub") filter (where ${ACTIVE_SESSION_SQL} and session."priceFromRub" >= $1) as "sessionPriceFromRub",
          max(session."priceFromRub") filter (where ${ACTIVE_SESSION_SQL} and session."priceFromRub" >= $1) as "sessionPriceToRub",
          (
            select max(offer."priceRub")
            from "EventOffer" offer
            where offer."eventId" = e.id
              and offer.active = true
              and offer."priceRub" >= $1
          ) as "offerPriceMaxRub",
          count(distinct session.id) filter (where ${ACTIVE_SESSION_SQL})::int as "slotCount",
          ${orderedEventTagsSql('e.id')} as tags,
          (
            select coalesce(array_agg(distinct title), '{}')
            from (
              select sc.title
              from "EventSubcategory" es
              join "Subcategory" sc on sc.id = es."subcategoryId"
              where es."eventId" = e.id
              union
              select sc.title
              from "Subcategory" sc
              where sc.id = e."primarySubcategoryId"
            ) subcats
          ) as subcategories
        from "Event" e
        left join "Category" cat on cat.id = e."categoryId"
        left join "City" city on city.id = e."primaryCityId"
        left join "Region" region on region.id = city."regionId"
        left join "Venue" venue on venue.id = e."venueId"
        left join event_identity identity on identity."eventId" = e.id
        left join "Source" source on source.id = identity."sourceId"
        left join "EventOverride" override on override."eventId" = e.id
        left join "EventSession" session on session."eventId" = e.id
        left join primary_offer on primary_offer."eventId" = e.id
        where e.status not in ('HIDDEN', 'DRAFT')
        group by
          e.id,
          identity."externalId",
          source.code,
          source.name,
          override.id,
          cat.title,
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
            where price is not null and price >= $1
          ) as "priceFrom",
          (
            select max(price)
            from (
              values ("priceFromRub"), ("sessionPriceFromRub"), ("sessionPriceToRub"), ("offerPriceRub"), ("offerPriceMaxRub")
            ) as prices(price)
            where price is not null and price >= $1
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
              nullif(trim(${catalogGroupTitleSqlExpression()}), ''),
              trim(coalesce(venue, ''))
            )), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(venue, '')), '\\s+', ' ', 'g'))
          ) as "groupKey"
        from normalized
        where "purchaseReady" = true
          and lower(coalesce("sourceStatus", '')) not in (${PUBLIC_SALES_BLOCKED_STATUS_SQL})
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
            order by case when lower(coalesce("sourceStatus", '')) in (${PUBLIC_SALES_BLOCKED_STATUS_SQL}) then 1 else 0 end,
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
            order by case when lower(coalesce("sourceStatus", '')) in (${PUBLIC_SALES_BLOCKED_STATUS_SQL}) then 1 else 0 end,
              "startsAt" asc nulls last
          ) as "upcomingSlots"
        from ranked
        group by "groupKey"
      )
      select
        rep.id,
        rep.slug,
        rep."externalId",
        rep."sourceCode",
        rep."sourceName",
        rep."sourceLabel",
        rep.title,
        rep.description,
        rep."overrideDescription",
        rep."overrideShortDescription",
        rep.kind,
        rep."imageUrl",
        rep.category,
        rep."cityId",
        rep.city,
        rep."citySlug",
        rep."cityHeroImageUrl",
        rep."cityIsDestination",
        rep."regionId",
        rep."regionSlug",
        rep."regionTitle",
        rep."venueId",
        rep."venueSlug",
        rep.venue,
        rep."venueAddress",
        rep."venueHeroImageUrl",
        rep."venueKind",
        rep."overrideTitle",
        rep."overrideImageUrl",
        rep."offerSourceCode",
        rep."offerTitle",
        rep."offerPriceRub",
        rep."offerWidgetUrl",
        rep."offerDeeplinkUrl",
        rep.kind,
        rep."sourceStatus",
        rep."ageLimit",
        rep."startsAt",
        rep.tags,
        rep.subcategories,
        grouped."groupKey",
        grouped."groupEventIds",
        grouped."groupedEventsCount",
        grouped."sessionCount",
        grouped."priceFrom",
        grouped."priceTo",
        rep."ticketsVacant" as vacant,
        grouped."upcomingSlots"
      from grouped
      join ranked rep on rep."groupKey" = grouped."groupKey" and rep.rank = 1
      order by rep."startsAt" asc nulls last, rep.title asc
    `,
    [MIN_DISPLAY_PRICE_RUB],
  ),
    db.query(`
      select distinct "eventId"
      from "LandingMatch"
      where coalesce(reasons->>'manualStatus', '') = 'PINNED'
    `),
  ]);

  const pinnedEventIds = new Set(pinnedResult.rows.map((row) => row.eventId));
  const separateCityHubs = collectSeparateCityHubNames(result.rows);
  const sessions = result.rows
    .map((row) => mapGroupedPublicSession(row, pinnedEventIds, { separateCityHubs }))
    .filter(Boolean);
  return dedupeCrossSourceCatalogSessions(regroupMappedPublicCatalogSessions(sessions));
}

function publicListDescription(row) {
  return (
    cleanImportedDescription(row.overrideDescription || row.description) ||
    cleanImportedDescription(row.overrideShortDescription)
  );
}

function publicSessionScheduleLabels(row) {
  const timeZone = resolveCityTimeZone(row.city, row.destination);
  if (!isOpenDateCatalogRow(row)) {
    if (isWideLifetimeSession(row.startsAt, row.endsAt)) {
      return {
        startsAt: '',
        dateLabel: 'Даты в виджете',
        timeLabel: 'При покупке',
        timeBucket: 'day',
        timeZone,
      };
    }

    return {
      startsAt: normalizeStartsAt(row.startsAt) || '',
      dateLabel: formatDate(row.startsAt, timeZone),
      timeLabel: formatTime(row.startsAt, timeZone),
      timeBucket: timeBucket(row.startsAt, timeZone),
      timeZone,
    };
  }

  return {
    startsAt: '',
    dateLabel: 'Открытая дата',
    timeLabel: 'В виджете',
    timeBucket: 'day',
    timeZone,
  };
}

function buildLandingRuleEvent(row, tags, destination, category) {
  return {
    title: row.overrideTitle || row.title,
    category: category || 'unknown',
    sourceCategory: category || 'unknown',
    venue: formatPublicVenueTitle(row.venue) || 'Не указано',
    city: row.city || 'Не указан',
    destination: destination?.name || row.city || 'Не указан',
    tags,
    subcategories: pickCatalogSubcategories({
      subcategories: uniqueValues((row.subcategories || []).filter(Boolean)),
      tags,
      category: category || 'unknown',
    }),
  };
}

function resolvePublicSessionImageUrl(row) {
  const direct = pickFirstUsableEventImageUrl(
    row.overrideImageUrl,
    row.imageUrl,
    row.venueHeroImageUrl,
    row.cityHeroImageUrl,
  );
  if (direct) return direct;

  const slug = row.citySlug || row.sourceCitySlug;
  if (!slug) return null;

  const imageSlug = CITY_CARD_IMAGE_ALIASES[slug] || slug;
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

function isPlaceholderEventImageUrl(imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (lower.includes('placeholder.gif')) return true;
  if (/api\.teplohod\.info\/v1\/image\?item=&/i.test(raw)) return true;
  // Without dirtyAlias upstream returns HTML 400; next/image then fails.
  if (/api\.teplohod\.info\/v1\/image\?/i.test(raw) && !/dirtyAlias=/i.test(raw)) return true;
  return false;
}

function isEphemeralAutoGeneratedCoverUrl(imageUrl) {
  const raw = String(imageUrl || '').trim();
  return /\/images\/(?:events|venues)\/generated\/(?:evt|venue)-auto-/i.test(raw);
}

function isUsableCatalogImageUrl(imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw || isPlaceholderEventImageUrl(raw)) return false;
  if (raw.startsWith('/images/cities/')) return false;
  if (/^https?:\/\//i.test(raw)) return true;
  if (/^\/images\/(events|venues)\//i.test(raw)) return true;
  return false;
}

/** Pre-signed Teplohod S3 URLs expire (~6h); keep stable api.teplohod.info proxy. */
function stabilizeTeplohodImageUrl(imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;
  const signedMatch = raw.match(
    /teplohod-(?:private|public)\/images\/cache\/Events\/(Event\d+)\/([^/?#]+)/i,
  );
  if (signedMatch) {
    const item = signedMatch[1];
    const dirtyAlias = signedMatch[2];
    return `https://api.teplohod.info/v1/image?item=${encodeURIComponent(item)}&dirtyAlias=${encodeURIComponent(dirtyAlias)}`;
  }
  return raw;
}

function pickFirstUsableEventImageUrl(...candidates) {
  const durable = [];
  const ephemeral = [];
  for (const candidate of candidates) {
    if (!candidate || !isUsableCatalogImageUrl(candidate)) continue;
    const stabilized = stabilizeTeplohodImageUrl(candidate);
    if (!stabilized || !isUsableCatalogImageUrl(stabilized)) continue;
    if (isEphemeralAutoGeneratedCoverUrl(stabilized)) ephemeral.push(stabilized);
    else durable.push(stabilized);
  }
  return durable[0] || ephemeral[0] || null;
}

const KNOWN_SESSION_CITIES = [
  'Нижний Новгород',
  'Санкт-Петербург',
  'Ростов-на-Дону',
  'Екатеринбург',
  'Красноярск',
  'Новосибирск',
  'Калининград',
  'Москва',
  'Казань',
  'Самара',
  'Волгоград',
  'Ярославль',
  'Владимир',
  'Пермь',
  'Тверь',
  'Сочи',
  'Тула',
].sort((a, b) => b.length - a.length);

function cityNameStem(city) {
  const compact = city.toLowerCase().replace(/[^а-яё]/g, '');
  if (!compact) return '';
  if (compact.length <= 5) return compact;
  return compact.slice(0, Math.max(5, compact.length - 2));
}

function inferCityNameFromText(...parts) {
  const haystack = parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    // Ship hull titles like «Теплоход «Москва-99»» must not imply city Москва.
    .replace(/(?:теплоход|катер|яхт[аы]?|судно|пароход|корабль)\s*[«"'][^»"']+[»"']/giu, ' ')
    .replace(/(?:теплоход|катер|яхт[аы]?|судно|пароход|корабль)\s+[а-яёa-z][\p{L}\d.\s-]*[-–—]\s*\d{1,4}/giu, ' ')
    .replace(/\b[а-яёa-z]+[-–—]\d{1,4}\b/giu, ' ')
    .replace(/\s+/g, ' ');
  if (!haystack) return null;

  for (const city of KNOWN_SESSION_CITIES) {
    const needle = city.toLowerCase();
    if (haystack.includes(needle)) return city;
    const stem = cityNameStem(city);
    // Word-boundary stem only: bare includes(«казан») false-positives
    // «Казанский собор» / «Казанская площадь» in Saint Petersburg.
    if (stem.length >= 4 && haystackIncludesCityToken(haystack, stem)) return city;
  }

  const match = haystack.match(/(?:^|\s)г\.?\s*([а-яё][а-яё\s-]{2,40})/i);
  if (!match) return null;

  const fragment = match[1].trim().replace(/["«»]/g, '');
  for (const city of KNOWN_SESSION_CITIES) {
    const normalized = city.toLowerCase();
    if (normalized.startsWith(fragment) || fragment.startsWith(normalized.slice(0, 6))) return city;
  }

  return null;
}

function resolvePublicSessionDisplayCity(row) {
  const raw = cleanDisplayName(row.city);
  const canonical = canonicalizePublicCityName(raw);
  if (canonical && canonical !== 'Не указан') return canonical;

  const inferred = inferCityNameFromText(row.title, row.venue, row.venueAddress, ...(row.tags || []));
  if (inferred) return canonicalizePublicCityName(inferred) || inferred;

  if (raw && raw !== 'Не указан') return raw;
  return 'Не указан';
}

function resolvePublicSessionCity(row) {
  const inferred = inferCityNameFromText(row.title, row.venue, row.venueAddress, ...(row.tags || []));
  const raw = cleanDisplayName(row.city);
  const canonical = canonicalizePublicCityName(raw);

  if (inferred) return routeCityToPublicDisplayName(inferred);
  if (canonical) return routeCityToPublicDisplayName(canonical);
  if (raw && raw !== 'Не указан') return routeCityToPublicDisplayName(raw);
  return routeCityToPublicDisplayName(inferred || raw || 'Не указан');
}

function isSaleablePublicSession(session) {
  return Boolean(session.purchaseReady);
}

async function publicEventRows(db, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && publicEventRowsCache && publicEventRowsCache.expiresAt > now) {
    return publicEventRowsCache.rows;
  }
  if (!forceRefresh && publicEventRowsBuildPromise) {
    return publicEventRowsBuildPromise;
  }

  if (forceRefresh) {
    publicEventRowsCache = null;
    publicEventRowsBuildPromise = null;
    if (publicCatalogCache?.sessions) {
      publicCatalogCache = { ...publicCatalogCache, expiresAt: 0 };
    } else {
      publicCatalogCache = null;
    }
    publicHomeCache = null;
  }

  const buildPromise = (async () => {
    const rows = await publicEventRowsLean(db, 10000);
    publicEventRowsCache = {
      expiresAt: Date.now() + PUBLIC_CATALOG_CACHE_MS,
      rows,
    };
    return rows;
  })();

  publicEventRowsBuildPromise = buildPromise;
  try {
    return await buildPromise;
  } finally {
    if (publicEventRowsBuildPromise === buildPromise) publicEventRowsBuildPromise = null;
  }
}

async function publicEventRowsLean(db, limit) {
  const result = await db.query(
    `
      select
        e.id,
        e.slug,
        source_link."externalId",
        source.code as "sourceCode",
        source.name as "sourceName",
        e.title,
        e.kind,
        e."sourceStatus",
        e."imageUrl",
        e."priceFromRub",
        e."ticketsVacant",
        cat.title as category,
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
        offer."sourceCode" as "offerSourceCode",
        offer.title as "offerTitle",
        offer."priceRub" as "offerPriceRub",
        offer."widgetUrl" as "offerWidgetUrl",
        offer."deeplinkUrl" as "offerDeeplinkUrl",
        min(session."startsAt") as "startsAt",
        min(session."priceFromRub") filter (where session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}) as "sessionPriceFromRub",
        count(distinct session.id)::int as "slotCount",
        ${orderedEventTagsSql('e.id')} as tags
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      left join "Source" source on source.id = source_link."sourceId"
      left join "EventOverride" override on override."eventId" = e.id
      left join "EventSession" session on session."eventId" = e.id
      left join lateral (
        select
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where "eventId" = e.id and active = true
        order by ("priceRub" >= ${MIN_DISPLAY_PRICE_RUB}) desc nulls last, "priceRub" asc nulls last
        limit 1
      ) offer on true
      group by
        e.id,
        source_link."externalId",
        source.code,
        source.name,
        override.id,
        cat.title,
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
        offer."sourceCode",
        offer.title,
        offer."priceRub",
        offer."widgetUrl",
        offer."deeplinkUrl"
      having (
        min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) is not null
        or e.kind = 'OPEN_DATE'
        or e."sourceStatus" = 'open_date'
      )
      order by min(session."startsAt") asc nulls last
      limit $1
    `,
    [limit],
  );

  const separateCityHubs = collectSeparateCityHubNames(result.rows);
  return result.rows
    .map((row) => {
      const tags = row.tags || [];
      const destination = publicDestinationForCity(row, separateCityHubs);
      const fallbackDestinationName = cleanDisplayName(row.city) || 'Не указан';
      const priceFrom = displayPriceFrom(row.priceFromRub, row.sessionPriceFromRub, row.offerPriceRub);
      const purchase = purchaseInfo(row);

      return {
        id: row.id,
        slug: publicEventSlug(row.slug),
        sourceSlug: row.slug,
        source: row.sourceName || publicSourceLabel(row.sourceCode || row.offerSourceCode) || 'Источник',
        sourceCode: row.sourceCode || row.offerSourceCode,
        externalId: row.externalId,
        title: row.title,
        sourceCategory: row.category || 'unknown',
        city: row.city || 'Не указан',
        cityId: row.cityId,
        citySlug: destination?.slug || publicCitySlug(fallbackDestinationName),
        sourceCitySlug: row.citySlug,
        destination: destination?.name || fallbackDestinationName,
        destinationType: destination?.type || 'city',
        venue: formatPublicVenueTitle(row.venue) || 'Не указано',
        venueId: row.venueId,
        venueSlug: row.venueSlug,
        venueKind: row.venueKind || 'OTHER',
        offerSourceCode: row.offerSourceCode,
        offerTitle: row.offerTitle,
        offerPriceRub: row.offerPriceRub,
        offerWidgetUrl: row.offerWidgetUrl,
        offerDeeplinkUrl: row.offerDeeplinkUrl,
        purchaseReady: purchase.ready,
        purchaseMode: purchase.mode,
        purchaseProvider: purchase.provider,
        purchaseUrlSource: purchase.urlSource,
        eventType: String(row.kind || '').toLowerCase(),
        kind: row.kind || null,
        sourceStatus: row.sourceStatus || null,
        startsAt: normalizeStartsAt(row.startsAt),
        slotCount: row.slotCount || 0,
        priceFrom,
        vacant: row.ticketsVacant,
        hasImage: Boolean(row.overrideImageUrl || row.imageUrl),
        imageUrl: row.imageUrl,
        override: {
          title: row.overrideTitle,
          imageUrl: row.overrideImageUrl,
        },
        tags,
      };
    })
    .filter((row) => hasUpcomingOrOpenSchedule(row) && row.purchaseReady);
}

function parseCatalogAgeLimit(value) {
  if (value == null || value === '') return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const age = Number(match[0]);
  return Number.isFinite(age) ? age : null;
}

function matchesCatalogAgeLimit(session, ageMax) {
  const limit = parseCatalogAgeLimit(session.ageLimit);
  if (limit == null) return true;
  return limit <= ageMax;
}

function matchesCatalogDateRange(session, dateFrom, dateTo) {
  const from = dateFrom ? startOfLocalDay(new Date(dateFrom)) : null;
  const to = dateTo ? startOfLocalDay(new Date(dateTo)) : null;
  if (!from && !to) return true;
  if (isOpenDateCatalogRow(session)) return true;

  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return false;
  const eventDay = startOfLocalDay(startsAt);
  if (from && eventDay < from) return false;
  if (to && eventDay > to) return false;
  return true;
}

function matchesCatalogPrice(session, minPrice, maxPrice) {
  const price = session.priceFrom;
  const min = Number(minPrice);
  const max = Number(maxPrice);
  const wantsFree = Number.isFinite(min) && min === 0 && Number.isFinite(max) && max === 0;
  if (wantsFree) return !Number.isFinite(price) || price <= 0;
  if (Number.isFinite(min) && min > 0 && (!Number.isFinite(price) || price < min)) return false;
  if (Number.isFinite(max) && max > 0 && (!Number.isFinite(price) || price > max)) return false;
  return true;
}

function matchesCatalogDate(session, dateFilter) {
  if (dateFilter === 'all') return true;
  if (isOpenDateCatalogRow(session)) return dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'weekend';

  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return false;

  const timeZone = session.timeZone || resolveSessionTimeZone(session);
  const diffDays = diffLocalDays(startsAt, new Date(), timeZone);
  if (diffDays == null) return false;

  if (dateFilter === 'today') return diffDays === 0;
  if (dateFilter === 'tomorrow') return diffDays === 1;
  if (dateFilter === 'weekend') return isLocalWeekend(startsAt, timeZone);
  if (dateFilter === 'evening') return session.timeBucket === 'evening' || session.timeBucket === 'night';

  return true;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mapPublicSession(row) {
  const fallbackWidgetUrl = buildProviderWidgetUrl(row);
  const purchase = purchaseInfo(row);
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const tags = row.tags || [];
  const ruleEvent = buildLandingRuleEvent(
    {
      ...row,
      overrideTitle: row.override?.title,
      title: row.title,
      venue: formatPublicVenueTitle(row.venue),
      city: row.city,
      category: row.sourceCategory,
      subcategories: row.subcategories,
    },
    tags,
    { name: row.destination || row.city },
    row.sourceCategory,
  );
  const schedule = publicSessionScheduleLabels(row);
  const timeZone = schedule.timeZone || resolveCityTimeZone(row.city, row.destination);
  const upcomingSlots = Array.isArray(row.upcomingSlots) && row.upcomingSlots.length
    ? row.upcomingSlots
    : row.startsAt
      ? [{
          eventId: row.id,
          startsAt: normalizeStartsAt(row.startsAt),
          dateLabel: formatDate(row.startsAt, timeZone),
          timeLabel: formatTime(row.startsAt, timeZone),
          purchaseUrl,
        }]
      : [];

  return {
    id: row.id,
    slug: publicEventSlug(row.slug),
    sourceSlug: row.sourceSlug || row.slug,
    groupKey: row.groupKey || publicEventGroupKey(row),
    groupEventIds: (row.groupEventIds || [row.id]).slice(0, 12),
    groupedEventsCount: row.groupedEventsCount || 1,
    sessionCount: row.sessionCount || row.slotCount || upcomingSlots.length || 1,
    upcomingSlots: upcomingSlots.slice(0, 8).map((slot) => ({
      eventId: slot.eventId,
      startsAt: normalizeStartsAt(slot.startsAt),
      dateLabel: slot.dateLabel || formatDate(slot.startsAt, timeZone),
      timeLabel: slot.timeLabel || formatTime(slot.startsAt, timeZone),
      purchaseUrl: slot.purchaseUrl,
    })),
    landingSlugs: resolveLandingSlugsForSession(ruleEvent, { startsAt: row.startsAt, upcomingSlots }),
    title: row.override?.title || row.title,
    cityId: row.cityId,
    citySlug: row.citySlug,
    city: row.city,
    destination: row.destination,
    destinationType: row.destinationType || 'city',
    venueId: row.venueId,
    venueSlug: row.venueSlug,
    venue: formatPublicVenueTitle(row.venue),
    venueAddress: row.venueAddress || null,
    venueKind: row.venueKind,
    offerTitle: row.offerTitle,
    offerSourceCode: row.offerSourceCode,
    purchaseUrl,
    widgetUrl: row.offerWidgetUrl || fallbackWidgetUrl,
    deeplinkUrl: row.offerDeeplinkUrl || null,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    category: row.sourceCategory,
    kind: row.kind || null,
    sourceStatus: row.sourceStatus || null,
    subcategories: ruleEvent.subcategories,
    tags: sliceCatalogTags(tags),
    startsAt: schedule.startsAt || '',
    dateLabel: schedule.dateLabel,
    timeLabel: schedule.timeLabel,
    timeBucket: schedule.timeBucket,
    timeZone,
    priceFrom: row.priceFrom,
    priceTo: row.priceTo ?? row.priceFrom,
    vacant: row.vacant,
    imageUrl: resolvePublicSessionImageUrl(row),
  };
}

function buildTicketscloudWidgetUrl(eventExternalId) {
  const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
  if (!token || !eventExternalId) return null;

  const normalizedToken = token.startsWith('r:') ? token.slice(2) : token;
  const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || 'https://ticketscloud.com/v1/widgets/common');
  url.searchParams.set('token', normalizedToken);
  url.searchParams.set('event', eventExternalId);
  return url.toString();
}

function buildTeplohodUrl(eventExternalId) {
  if (!eventExternalId) return null;
  const eventId = String(eventExternalId).replace(/^tep-/i, '').trim();
  if (!/^\d+$/.test(eventId)) return null;
  const widgetId = String(process.env.TEP_WIDGET_ID || '14208').trim() || '14208';
  // teplohod.info/event/{id} currently returns "Ошибка!"; working checkout is account.teplohod.info.
  const checkoutBase = (process.env.TEP_CHECKOUT_BASE_URL || 'https://account.teplohod.info').replace(/\/+$/, '');
  const url = new URL(`${checkoutBase}/order/event-order`);
  url.searchParams.set('widget_id', widgetId);
  url.searchParams.set('event_id', eventId);
  return url.toString();
}


async function resolvePublicEventId(db, eventSlugOrId, catalogSessions = null) {
  const value = String(eventSlugOrId || '').trim();
  if (!value) return null;
  const direct = await db.query('select id from "Event" where id = $1 or slug = $1 limit 1', [value]);
  if (direct.rows[0]?.id) return direct.rows[0].id;

  const tcPrefixMatch = value.match(/^tc-([a-f0-9]{24})-/i);
  if (tcPrefixMatch) {
    const tcId = tcPrefixMatch[1];
    const tcResult = await db.query('select id from "Event" where id = $1 or id = $2 limit 1', [tcId, `evt_${tcId}`]);
    if (tcResult.rows[0]?.id) return tcResult.rows[0].id;
  }

  const suffixMatch = value.match(/(?:^|-)([a-f0-9]{20,})$/i);
  if (suffixMatch) {
    const suffix = suffixMatch[1];
    const suffixResult = await db.query('select id from "Event" where id = $1 or id = $2 or slug = $1 or slug = $2 limit 1', [suffix, `evt_${suffix}`]);
    if (suffixResult.rows[0]?.id) return suffixResult.rows[0].id;
  }

  const requestedSlug = publicEventSlug(value);
  const fromCatalog = lookupCatalogSessionBySlug(value, catalogSessions);
  if (fromCatalog?.id) return fromCatalog.id;

  return null;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function publicEventSlug(value) {
  return publicCitySlug(value);
}


function publicCitySlug(value) {
  const letters = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };

  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => letters[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildLandingRows(events) {
  return LANDING_RULES.map((rule) => {
    const matched = events.filter((event) => matchesLandingRule(event, rule));
    const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price > 0);
    return {
      slug: rule.slug,
      title: rule.title,
      status: matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
      events: matched.length,
      venues: new Set(matched.map((event) => event.venue).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
    };
  });
}

export const buildPublicLandings = buildPublicLandingsFromSessions;

function sortPromoLandings(landings, cityFilter = '') {
  const cityKey = String(cityFilter || '').trim().toLowerCase();
  const boosts = PROMO_CITY_LANDING_BOOSTS[cityKey] || [];

  return [...landings].sort((a, b) => {
    const aBoost = boosts.indexOf(a.slug);
    const bBoost = boosts.indexOf(b.slug);
    if (aBoost !== -1 || bBoost !== -1) {
      if (aBoost === -1) return 1;
      if (bBoost === -1) return -1;
      if (aBoost !== bBoost) return aBoost - bBoost;
    }

    const aOrder = PROMO_LANDING_ORDER.indexOf(a.slug);
    const bOrder = PROMO_LANDING_ORDER.indexOf(b.slug);
    const aRank = aOrder === -1 ? 1000 : aOrder;
    const bRank = bOrder === -1 ? 1000 : bOrder;
    if (aRank !== bRank) return aRank - bRank;
    return b.events - a.events;
  });
}

function collectSessionSlots(session) {
  if (Array.isArray(session.upcomingSlots) && session.upcomingSlots.length) {
    return session.upcomingSlots.filter((slot) => slot?.startsAt);
  }
  if (session.startsAt) {
    return [{
      eventId: session.id,
      startsAt: session.startsAt,
      dateLabel: session.dateLabel,
      timeLabel: session.timeLabel,
      purchaseUrl: session.purchaseUrl,
    }];
  }
  return [];
}

function moscowHourFromStartsAt(value, timeZone = DEFAULT_CITY_TIME_ZONE) {
  return localHourFromInstant(value, timeZone);
}

function slotMatchesMinHour(startsAt, minHour, includeStartsAtHourUntil = 0, timeZone = DEFAULT_CITY_TIME_ZONE) {
  const hour = moscowHourFromStartsAt(startsAt, timeZone);
  if (!Number.isFinite(hour)) return false;
  if (hour >= minHour) return true;
  return includeStartsAtHourUntil > 0 && hour < includeStartsAtHourUntil;
}

function sessionMatchesLandingSchedule(session, rule) {
  if (rule.minStartsAtHour == null) return true;
  const until = rule.includeStartsAtHourUntil ?? 0;
  const timeZone = session.timeZone || resolveSessionTimeZone(session);
  return collectSessionSlots(session).some((slot) => slotMatchesMinHour(slot.startsAt, rule.minStartsAtHour, until, timeZone));
}

function applyLandingScheduleToSession(session, rule) {
  if (rule.minStartsAtHour == null) return session;
  const until = rule.includeStartsAtHourUntil ?? 0;
  const timeZone = session.timeZone || resolveSessionTimeZone(session);
  const slots = collectSessionSlots(session)
    .filter((slot) => slotMatchesMinHour(slot.startsAt, rule.minStartsAtHour, until, timeZone))
    .map((slot) => ({
      eventId: slot.eventId || session.id,
      startsAt: normalizeStartsAt(slot.startsAt),
      dateLabel: slot.dateLabel || formatDate(slot.startsAt, timeZone),
      timeLabel: slot.timeLabel || formatTime(slot.startsAt, timeZone),
      purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
    }));
  if (!slots.length) return null;

  const primary = slots[0];
  return {
    ...session,
    upcomingSlots: slots.slice(0, 8),
    startsAt: primary.startsAt,
    dateLabel: primary.dateLabel,
    timeLabel: primary.timeLabel,
    timeBucket: timeBucket(primary.startsAt, timeZone),
    sessionCount: slots.length,
  };
}

function filterSessionsForLandingRule(sessions, rule) {
  return sessions
    .filter((session) => matchesLandingRule(session, rule) && sessionMatchesLandingSchedule(session, rule))
    .map((session) => applyLandingScheduleToSession(session, rule))
    .filter(Boolean);
}

function resolveLandingSlugsForSession(ruleEvent, sessionDraft, rules = LANDING_RULES) {
  return rules
    .filter((rule) => matchesLandingRule(ruleEvent, rule) && sessionMatchesLandingSchedule(sessionDraft, rule))
    .map((rule) => rule.slug);
}

const READINESS_ISSUE_META = {
  NO_FUTURE_SESSIONS: { label: 'нет будущих сеансов', severity: 'high' },
  MISSING_PURCHASE_ENTRY: { label: 'нет виджета/ссылки покупки', severity: 'high' },
  MISSING_PRICE: { label: 'нет цены', severity: 'high' },
  PRICE_TOO_LOW: { label: `цена ниже ${MIN_DISPLAY_PRICE_RUB} ₽`, severity: 'high' },
  MISSING_CATEGORY: { label: 'не выбрана категория', severity: 'high' },
  MISSING_SUBCATEGORY: { label: 'не выбрана подкатегория', severity: 'medium' },
  MISSING_VENUE: { label: 'нет площадки', severity: 'high' },
  WEAK_DESCRIPTION: { label: 'слабое описание', severity: 'medium' },
  MISSING_IMAGE: { label: 'нет изображения', severity: 'medium' },
};

function buildReadinessIssues(event) {
  const issues = [];
  const add = (code, details = null) => {
    const meta = READINESS_ISSUE_META[code];
    if (!meta || issues.some((issue) => issue.code === code)) return;
    issues.push({ code, label: details || meta.label, severity: meta.severity });
  };

  const rawPriceValues = [event.priceFromRub, event.offerPriceRub].filter((value) => Number.isFinite(value) && value > 0);
  const hasOnlyLowPrice = event.priceFrom == null && rawPriceValues.some((value) => value < MIN_DISPLAY_PRICE_RUB);
  const description = plainReadinessText(event.overrideDescription || event.description || event.overrideShortDescription || '');
  const descriptionLength = Math.max(description.length, Number(event.descriptionLength) || 0);
  const venue = plainReadinessText(event.venue || '');
  const hasVenue = Boolean(event.venueId || (venue && !['не указано', 'не указан', 'unknown'].includes(venue.toLowerCase())));

  if (!hasFutureSession(event)) add('NO_FUTURE_SESSIONS');
  if (!event.purchaseReady) add('MISSING_PURCHASE_ENTRY');
  if (event.priceFrom == null) add(hasOnlyLowPrice ? 'PRICE_TOO_LOW' : 'MISSING_PRICE');
  else if (event.priceFrom < MIN_DISPLAY_PRICE_RUB) add('PRICE_TOO_LOW');
  if (!event.categoryId && !event.category) add('MISSING_CATEGORY');
  if (!event.primarySubcategoryId && !(event.subcategoryIds || []).length) add('MISSING_SUBCATEGORY');
  if (!hasVenue) add('MISSING_VENUE');
  if (descriptionLength < 120) add('WEAK_DESCRIPTION');
  if (!event.hasImage && !event.imageUrl && !event.overrideImageUrl) add('MISSING_IMAGE');

  return issues;
}

function readinessSeverity(issues) {
  if (issues.some((issue) => issue.severity === 'high')) return 'high';
  if (issues.some((issue) => issue.severity === 'medium')) return 'medium';
  return 'low';
}

function hasFutureSession(event) {
  const kind = String(event.kind || event.eventType || '').toUpperCase();
  if (kind === 'OPEN_DATE') return true;
  if (!event.startsAt) return false;
  const startsAt = new Date(event.startsAt).getTime();
  return Number.isFinite(startsAt) && startsAt >= Date.now() - 15 * 60 * 1000;
}

function plainReadinessText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PUBLIC_CATALOG_CATEGORIES = new Set([
  'экскурсии',
  'музеи и арт',
  'мероприятия',
  'активный отдых',
  'развлечения',
]);

const WATER_CATALOG_HINT_RE =
  /(водн(?:ые|ая)?\s+экскурси|речн(?:ая|ые)?|реч(?:ной|ная)\s+порт|теплоход|катер|яхт|лодк|причал|речные\s+прогулки)/i;
const BUS_CATALOG_LABEL_RE = /автобус/i;

function resolveCatalogTransportHint(session = {}) {
  const haystack = [
    session.title,
    session.venue,
    ...(session.subcategories || []),
    ...(session.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (WATER_CATALOG_HINT_RE.test(haystack)) return 'water';
  if (BUS_CATALOG_LABEL_RE.test(haystack)) return 'bus';
  return null;
}

function isConflictingTransportCatalogLabel(label, transport) {
  if (!transport) return false;
  const lower = String(label || '').toLowerCase();
  if (transport === 'water') return BUS_CATALOG_LABEL_RE.test(lower);
  if (transport === 'bus') return WATER_CATALOG_HINT_RE.test(lower);
  return false;
}

function isCrossCategoryCatalogTag(tag, category) {
  const tagNorm = String(tag || '').trim().toLowerCase();
  const categoryNorm = String(category || '').trim().toLowerCase();
  if (!tagNorm || !categoryNorm) return false;
  if (tagNorm === categoryNorm) return false;
  return PUBLIC_CATALOG_CATEGORIES.has(tagNorm);
}

const UTILITY_CATALOG_TAG_RE =
  /^(wc|туалет|кондиционер|аудиосистема|аудиогид|wi-?fi|бар|кафе|кафе-бар|парковка|гардероб|кондиционирование)$/i;
const DURATION_CATALOG_TAG_RE = /^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i;
const VESSEL_CATALOG_TAG_RE = /^(теплоход|катер|яхт|судно|лодк)\s*:/i;
const VENUE_PLACE_CATALOG_TAG_RE = /^площадка\s*:/i;
const VENUE_POLICY_CATALOG_TAG_RE = /^(можно|нельзя|разрешено|запрещено)(?:\s|$)/i;

function isUtilityCatalogTag(tag) {
  const value = String(tag || '').trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  if (UTILITY_CATALOG_TAG_RE.test(lower)) return true;
  if (DURATION_CATALOG_TAG_RE.test(lower)) return true;
  if (VESSEL_CATALOG_TAG_RE.test(lower)) return true;
  if (VENUE_PLACE_CATALOG_TAG_RE.test(lower)) return true;
  if (/^причал\b/i.test(lower)) return true;
  if (value.length > 42) return true;
  return false;
}

function isVenuePolicyCatalogTag(tag) {
  const lower = String(tag || '').trim().toLowerCase();
  if (!lower) return true;
  if (VENUE_POLICY_CATALOG_TAG_RE.test(lower)) return true;
  if (/отдельн/i.test(lower) && /столик/i.test(lower)) return true;
  if (/коляск/i.test(lower)) return true;
  if (/велосипед/i.test(lower)) return true;
  if (/животн/i.test(lower)) return true;
  if (/сво[ейё]м?\s+алкогол/i.test(lower)) return true;
  if (/сво[ейё]й?\s+ед/i.test(lower)) return true;
  return false;
}

function isAmenityCatalogTag(tag) {
  const lower = String(tag || '').trim().toLowerCase();
  if (!lower) return false;
  if (/^(ресторан[-\s]?бар|отопление|экскурсовод|аудиогид)$/i.test(lower)) return true;
  if (/тё?плые?\s+плед/i.test(lower)) return true;
  if (/^панорамн/i.test(lower)) return true;
  if (/детск(ие|ая)\s+стуль/i.test(lower)) return true;
  if (/^с\s+(обедом|ужином|питанием)/i.test(lower)) return true;
  if (/^ледовый\s+класс/i.test(lower)) return true;
  return false;
}

function isCatalogSubcategoryLabel(label, category) {
  const value = String(label || '').trim();
  if (!value || isUtilityCatalogTag(value) || isVenuePolicyCatalogTag(value) || isAmenityCatalogTag(value)) return false;
  if (isCrossCategoryCatalogTag(value, category)) return false;
  if (category && value.toLowerCase() === String(category).toLowerCase()) return false;
  return true;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

const DEFAULT_LANDING_AUDIT_EXPECTATIONS = {
  'bus-tours': ['653', '661', '738', '769', '783', '1130', '1210', '1300', '1433'],
  'new-year': ['1049', '1050'],
};

function loadLandingAuditExpectations(rootDir) {
  const filePath = path.join(rootDir, 'data', 'teplohod', 'landing-expectations.json');
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Use built-in expectations when file is missing.
  }
  return DEFAULT_LANDING_AUDIT_EXPECTATIONS;
}

export async function runLandingAudit(db, rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')) {
  const expectations = loadLandingAuditExpectations(rootDir);
  const catalogSessions = await publicCatalogSessions(db, true);
  const catalogById = new Map(catalogSessions.map((session) => [session.id, session]));
  const checkedAt = new Date().toISOString();
  const items = [];
  const issues = [];

  for (const [landingSlug, externalIds] of Object.entries(expectations)) {
    const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
    if (!rule) {
      issues.push({ landingSlug, code: 'UNKNOWN_LANDING', message: `Лендинг ${landingSlug} не найден` });
      continue;
    }

    for (const externalId of externalIds) {
      const eventId = `evt_tep_${externalId}`;
      const auditRow = await fetchLandingAuditEventRow(db, eventId);
      const catalogSession = catalogById.get(eventId);
      const matchEvent = auditRow
        ? {
            title: auditRow.title,
            category: auditRow.category,
            sourceCategory: auditRow.category,
            venue: auditRow.venue,
            city: auditRow.city,
            tags: auditRow.tags || [],
            subcategories: pickCatalogSubcategories({
              subcategories: auditRow.subcategories || [],
              tags: auditRow.tags || [],
              category: auditRow.category || '',
            }),
          }
        : null;
      const ruleMatch = matchEvent ? explainLandingRuleMatch(matchEvent, rule) : { matches: false, reasons: [], blockers: ['событие не найдено в БД'] };
      const inCatalog = Boolean(catalogSession);
      const onLanding = catalogSession?.landingSlugs?.includes(landingSlug) || false;
      const futureSessions = Number(auditRow?.futureSessionCount || 0);
      const blockers = [];

      if (!auditRow) blockers.push('нет в БД');
      if (auditRow && futureSessions === 0) blockers.push('нет будущих сеансов');
      if (auditRow && !inCatalog) blockers.push('нет в публичном каталоге');
      if (auditRow && inCatalog && !onLanding) blockers.push(`не на лендинге ${landingSlug}`);
      if (auditRow && !ruleMatch.matches) blockers.push(...(ruleMatch.blockers || []));

      const ok = blockers.length === 0;
      const item = {
        landingSlug,
        externalId: String(externalId),
        eventId,
        title: auditRow?.title || null,
        ok,
        inCatalog,
        onLanding,
        futureSessions,
        landingSlugs: catalogSession?.landingSlugs || [],
        matchReasons: ruleMatch.reasons || [],
        blockers: uniqueValues(blockers).slice(0, 10),
      };
      items.push(item);
      if (!ok) issues.push({ ...item, code: 'LANDING_AUDIT_FAIL' });
    }
  }

  return {
    checkedAt,
    summary: {
      total: items.length,
      ok: items.filter((item) => item.ok).length,
      failed: items.filter((item) => !item.ok).length,
    },
    items,
    issues,
  };
}

async function fetchLandingAuditEventRow(db, eventId) {
  const result = await db.query(
    `
      select
        e.id,
        e.title,
        e.status,
        cat.title as category,
        city.title as city,
        venue.title as venue,
        count(session.id) filter (where ${ACTIVE_SESSION_SQL})::int as "futureSessionCount",
        min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "nextStartsAt",
        ${orderedEventTagsSql('e.id')} as tags,
        (
          select coalesce(array_agg(distinct title), '{}')
          from (
            select sc.title
            from "EventSubcategory" es
            join "Subcategory" sc on sc.id = es."subcategoryId"
            where es."eventId" = e.id
            union
            select sc.title
            from "Subcategory" sc
            where sc.id = e."primarySubcategoryId"
          ) subcats
        ) as subcategories
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSession" session on session."eventId" = e.id
      where e.id = $1
      group by e.id, cat.title, city.title, venue.title
    `,
    [eventId],
  );
  return result.rows[0] || null;
}

function mapPublicArticleRow(row) {
  const citySlug = canonicalBlogCitySlug(row.citySlug) || row.citySlug || null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || null,
    coverImageUrl: row.coverImageUrl || null,
    city: blogCityDisplayName(citySlug, row.city),
    citySlug,
    authorId: row.authorId || null,
    authorName: row.authorName || null,
    articleType: row.articleType || null,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    isIndexable: row.isIndexable !== false,
    isFeatured: row.isFeatured === true,
    seoTitle: row.seoTitle || row.title,
    seoDescription: row.seoDescription || row.excerpt || null,
  };
}

function mapPublicArticleDetail(row) {
  return {
    ...mapPublicArticleRow(row),
    content: row.content || '',
    seoH1: row.seoH1 || row.title,
    canonicalPath: row.canonicalPath || `/blog/${row.slug}`,
  };
}

export async function buildPublicArticlesList(db, options = {}) {
  const citySlugFilter = canonicalBlogCitySlug(options.citySlug);
  const rankCitySlug = canonicalBlogCitySlug(options.rankCitySlug);
  const includeBroad = options.includeBroad === true;
  const excludeFeatured = options.excludeFeatured === true;
  const pageLimit = Math.min(Math.max(Number(options.limit) || 100, 1), 200);
  const cursorRaw = String(options.cursor || '').trim();
  const aliases = citySlugFilter && !isBroadBlogCitySlug(citySlugFilter)
    ? blogCitySlugAliases(citySlugFilter)
    : [];

  const params = [];
  let whereExtra = '';
  if (aliases.length) {
    params.push(aliases);
    const aliasIdx = params.length;
    whereExtra += ` and (
      coalesce(nullif(a."citySlug", ''), c.slug) = any($${aliasIdx}::text[])
      ${includeBroad ? ` or coalesce(nullif(a."citySlug", ''), '') in ('multi', 'regions')` : ''}
    )`;
  }
  // Wider window for in-memory rank/cursor (blog corpus is small).
  const fetchLimit = Math.min(200, Math.max(pageLimit * 4, pageLimit + 20));
  params.push(fetchLimit);
  const limitIdx = params.length;

  const { rows } = await db.query(
    `
    select
      a.id,
      a.slug,
      a.title,
      a.excerpt,
      a."coverImageUrl",
      a."publishedAt",
      a."isIndexable",
      a."isFeatured",
      a."seoTitle",
      a."seoDescription",
      a."authorId",
      a."authorName",
      a."articleType",
      case
        when a.slug = 'afisha-regionalnye-goroda' then 'Екатеринбург, Нижний Новгород и Уфа'
        when coalesce(nullif(a."citySlug", ''), '') = 'regions' then 'Регионы'
        when coalesce(nullif(a."citySlug", ''), '') = 'multi' then 'Несколько городов'
        else coalesce(c.title, null)
      end as city,
      case
        when a.slug = 'afisha-regionalnye-goroda' then 'multi'
        else coalesce(
          nullif(a."citySlug", ''),
          case
            when a.slug = 'myuzikly-teatr-novichok-msk-spb' then 'multi'
            else c.slug
          end
        )
      end as "citySlug"
    from "Article" a
    left join "City" c on c.id = a."cityId"
    where a.status = 'PUBLISHED'
      and coalesce(a."isIndexable", true) = true
      and (a."publishedAt" is null or a."publishedAt" <= now())
      ${whereExtra}
    order by a."isFeatured" desc, a."publishedAt" desc nulls last, a."updatedAt" desc
    limit $${limitIdx}
  `,
    params,
  );

  let articles = rows.map(mapPublicArticleRow);
  if (excludeFeatured) {
    articles = articles.filter((article) => article.isFeatured !== true);
  }

  if (rankCitySlug && !isBroadBlogCitySlug(rankCitySlug) && !aliases.length) {
    const target = rankCitySlug;
    const score = (slug) => {
      const value = String(slug || '').trim().toLowerCase();
      if (value === target) return 100;
      if (value === 'multi' || value === 'regions') return 40;
      return 0;
    };
    articles = [...articles].sort((a, b) => {
      const diff = score(b.citySlug) - score(a.citySlug);
      if (diff !== 0) return diff;
      const ta = Date.parse(String(a.publishedAt || '')) || 0;
      const tb = Date.parse(String(b.publishedAt || '')) || 0;
      if (tb !== ta) return tb - ta;
      return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
    });
  }

  let start = 0;
  if (cursorRaw) {
    try {
      const json = Buffer.from(cursorRaw, 'base64url').toString('utf8');
      const parsed = JSON.parse(json);
      const cursorSlug = String(parsed.s || '').trim();
      if (cursorSlug) {
        const idx = articles.findIndex((article) => article.slug === cursorSlug);
        start = idx >= 0 ? idx + 1 : articles.length;
      }
    } catch {
      start = 0;
    }
  }

  const page = articles.slice(start, start + pageLimit);
  const last = page[page.length - 1];
  const hasMore = start + page.length < articles.length;
  const nextCursor =
    hasMore && last
      ? Buffer.from(JSON.stringify({ p: last.publishedAt || null, s: last.slug }), 'utf8').toString('base64url')
      : null;

  return {
    generatedAt: new Date().toISOString(),
    total: articles.length,
    nextCursor,
    articles: page,
  };
}

export async function buildPublicArticlePage(db, slug) {
  const { rows } = await db.query(
    `
      select
        a.id,
        a.slug,
        a.title,
        a.excerpt,
        a.content,
        a."coverImageUrl",
        a."publishedAt",
        a."isIndexable",
        a."seoH1",
        a."seoTitle",
        a."seoDescription",
        a."canonicalPath",
        a."authorId",
        a."authorName",
        a."articleType",
        case
          when a.slug = 'afisha-regionalnye-goroda' then 'Екатеринбург, Нижний Новгород и Уфа'
          when coalesce(nullif(a."citySlug", ''), '') = 'regions' then 'Регионы'
          when coalesce(nullif(a."citySlug", ''), '') = 'multi' then 'Несколько городов'
          else coalesce(c.title, null)
        end as city,
        case
          when a.slug = 'afisha-regionalnye-goroda' then 'multi'
          else coalesce(
            nullif(a."citySlug", ''),
            case
              when a.slug = 'myuzikly-teatr-novichok-msk-spb' then 'multi'
              else c.slug
            end
          )
        end as "citySlug"
      from "Article" a
      left join "City" c on c.id = a."cityId"
      where a.slug = $1
        and a.status = 'PUBLISHED'
        and (a."publishedAt" is null or a."publishedAt" <= now())
      limit 1
    `,
    [slug],
  );
  if (rows[0]) {
    return {
      generatedAt: new Date().toISOString(),
      article: mapPublicArticleDetail(rows[0]),
      cmsOwned: true,
    };
  }

  // Article exists in CMS but is not public (draft/review/archive) - do not fall back to static body.
  const { rows: ownedRows } = await db.query(
    `select status::text as status from "Article" where slug = $1 limit 1`,
    [slug],
  );
  if (ownedRows[0]) {
    return {
      generatedAt: new Date().toISOString(),
      article: null,
      cmsOwned: true,
      cmsStatus: String(ownedRows[0].status || '').toLowerCase(),
    };
  }

  return null;
}

export async function buildAdminArticlesList(db) {
  const { rows } = await db.query(`
    select
      a.id,
      a.slug,
      a.status::text as status,
      a.title,
      a.excerpt,
      a."coverImageUrl",
      a."publishedAt",
      a."isIndexable",
      a."isFeatured",
      a."updatedAt",
      a."citySlug",
      a."authorId",
      a."authorName",
      a."articleType",
      c.title as city
    from "Article" a
    left join "City" c on c.id = a."cityId"
    order by a."isFeatured" desc, a."updatedAt" desc
  `);
  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    rows: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      status: String(row.status || 'DRAFT').toLowerCase(),
      title: row.title,
      excerpt: row.excerpt || '',
      coverImageUrl: row.coverImageUrl || null,
      city: row.city || null,
      citySlug: canonicalBlogCitySlug(row.citySlug) || row.citySlug || null,
      authorId: row.authorId || null,
      authorName: row.authorName || null,
      articleType: row.articleType || null,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      isIndexable: row.isIndexable !== false,
      isFeatured: row.isFeatured === true,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    })),
  };
}

export async function buildAdminArticleDetail(db, articleId) {
  const { rows } = await db.query(
    `
      select
        a.*,
        c.title as city,
        c.slug as "joinedCitySlug"
      from "Article" a
      left join "City" c on c.id = a."cityId"
      where a.id = $1
      limit 1
    `,
    [articleId],
  );
  const row = rows[0];
  if (!row) return null;
  const citySlug =
    canonicalBlogCitySlug(row.citySlug) ||
    canonicalBlogCitySlug(row.joinedCitySlug) ||
    row.citySlug ||
    row.joinedCitySlug ||
    null;
  return {
    id: row.id,
    slug: row.slug,
    status: String(row.status || 'DRAFT').toLowerCase(),
    title: row.title,
    excerpt: row.excerpt || '',
    content: row.content || '',
    coverImageUrl: row.coverImageUrl || null,
    cityId: row.cityId || null,
    city: row.city || null,
    citySlug,
    authorId: row.authorId || null,
    authorName: row.authorName || null,
    articleType: row.articleType || null,
    seoH1: row.seoH1 || null,
    seoTitle: row.seoTitle || null,
    seoDescription: row.seoDescription || null,
    canonicalPath: row.canonicalPath || null,
    isIndexable: row.isIndexable !== false,
    isFeatured: row.isFeatured === true,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

async function resolveArticleCityId(db, citySlug) {
  const aliases = blogCitySlugAliases(citySlug);
  if (!aliases.length) return null;
  const { rows } = await db.query(`select id from "City" where slug = any($1::text[]) limit 1`, [aliases]);
  return rows[0]?.id || null;
}

function normalizeArticleStatus(value) {
  const normalized = String(value || 'DRAFT').trim().toUpperCase();
  const allowed = new Set(['DRAFT', 'REVIEW', 'PUBLISHED', 'HIDDEN']);
  return allowed.has(normalized) ? normalized : 'DRAFT';
}

export async function upsertAdminArticle(db, articleId, payload = {}) {
  const current = articleId ? await buildAdminArticleDetail(db, articleId) : null;
  const title = String(payload.title || current?.title || '').trim();
  if (!title) throw new Error('title_required');

  const slug =
    String(payload.slug || current?.slug || title)
      .trim()
      .toLowerCase()
      .replace(/ё/g, 'e')
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'article';

  const status = normalizeArticleStatus(payload.status || current?.status);
  const excerpt = payload.excerpt ?? current?.excerpt ?? null;
  const content = payload.content ?? current?.content ?? null;
  const coverImageUrl = payload.coverImageUrl ?? current?.coverImageUrl ?? null;
  const finalCitySlug =
    payload.citySlug !== undefined
      ? canonicalBlogCitySlug(payload.citySlug)
      : canonicalBlogCitySlug(current?.citySlug) || current?.citySlug || null;
  let cityId = current?.cityId ?? null;
  if (payload.cityId !== undefined) {
    cityId = payload.cityId || null;
  } else if (payload.citySlug !== undefined) {
    cityId = finalCitySlug ? await resolveArticleCityId(db, finalCitySlug) : null;
  } else if (!cityId && finalCitySlug) {
    cityId = await resolveArticleCityId(db, finalCitySlug);
  }
  const authorId = payload.authorId ?? current?.authorId ?? null;
  const authorName = payload.authorName ?? current?.authorName ?? null;
  const articleType = payload.articleType ?? current?.articleType ?? null;
  const seoH1 = payload.seoH1 ?? current?.seoH1 ?? null;
  const seoTitle = payload.seoTitle ?? current?.seoTitle ?? title;
  const seoDescription = payload.seoDescription ?? current?.seoDescription ?? excerpt;
  const canonicalPath = payload.canonicalPath ?? current?.canonicalPath ?? `/blog/${slug}`;
  const isIndexable = payload.isIndexable ?? current?.isIndexable ?? status === 'PUBLISHED';
  const isFeatured =
    payload.isFeatured !== undefined
      ? Boolean(payload.isFeatured)
      : Boolean(current?.isFeatured);
  const publishedAt =
    status === 'PUBLISHED'
      ? payload.publishedAt || current?.publishedAt || new Date().toISOString()
      : payload.publishedAt ?? current?.publishedAt ?? null;

  if (current) {
    if (isFeatured) {
      await db.query(
        `update "Article" set "isFeatured" = false where "isFeatured" = true and id <> $1`,
        [current.id],
      );
    }
    const { rows } = await db.query(
      `
        update "Article"
        set
          slug = $2,
          status = $3::"ArticleStatus",
          title = $4,
          excerpt = $5,
          content = $6,
          "coverImageUrl" = $7,
          "cityId" = $8,
          "citySlug" = $9,
          "authorId" = $10,
          "authorName" = $11,
          "articleType" = $12,
          "seoH1" = $13,
          "seoTitle" = $14,
          "seoDescription" = $15,
          "canonicalPath" = $16,
          "isIndexable" = $17,
          "isFeatured" = $18,
          "publishedAt" = $19,
          "updatedAt" = now()
        where id = $1
        returning id
      `,
      [
        current.id,
        slug,
        status,
        title,
        excerpt,
        content,
        coverImageUrl,
        cityId,
        finalCitySlug,
        authorId,
        authorName,
        articleType,
        seoH1,
        seoTitle,
        seoDescription,
        canonicalPath,
        isIndexable,
        isFeatured,
        publishedAt,
      ],
    );
    return buildAdminArticleDetail(db, rows[0].id);
  }

  const id = `article_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  if (isFeatured) {
    await db.query(`update "Article" set "isFeatured" = false where "isFeatured" = true`);
  }
  await db.query(
    `
      insert into "Article" (
        id, slug, status, title, excerpt, content, "coverImageUrl", "cityId", "citySlug",
        "authorId", "authorName", "articleType",
        "seoH1", "seoTitle", "seoDescription", "canonicalPath", "isIndexable", "isFeatured",
        "publishedAt", "createdAt", "updatedAt"
      )
      values (
        $1, $2, $3::"ArticleStatus", $4, $5, $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, now(), now()
      )
    `,
    [
      id,
      slug,
      status,
      title,
      excerpt,
      content,
      coverImageUrl,
      cityId,
      finalCitySlug,
      authorId,
      authorName,
      articleType,
      seoH1,
      seoTitle,
      seoDescription,
      canonicalPath,
      isIndexable,
      isFeatured,
      publishedAt,
    ],
  );
  return buildAdminArticleDetail(db, id);
}

export async function deleteAdminArticle(db, articleId) {
  const current = await buildAdminArticleDetail(db, articleId);
  if (!current) return null;
  await db.query(`delete from "Article" where id = $1`, [articleId]);
  return current;
}
