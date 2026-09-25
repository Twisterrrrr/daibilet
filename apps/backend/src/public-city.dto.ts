import { prisma } from '@daibilet/db';
import {
  publicVenueHubRows,
  resolvePublicVenuesForSessions,
  publicPublishedVenuesByCityId,
  mergeCityPageVenues,
} from './public-venue-read.js';
import {
  buildCityHubSeoTitle,
  buildPublicDestinationRowsFromSessions,
  countDistinctSessionVenues,
  destinationPrepositional,
  lookupDestinationCatalogSessions,
  matchStandaloneCityBySlug,
  publicDestinationFromSession,
} from './public-destination.js';
import { buildPublicLandings } from './public-city-landings.js';
import { createDb } from './db.js';
import { getPublicCatalogSessions, getPublicCatalogSessionsSoft, resolveCatalogSessionsByDestinationKeys } from './public-catalog.dto.js';
import { toPublicCatalogListItem } from './public-catalog-list-item.js';
import { pickCityHubFeedSessions } from './city-hub-session-rank.js';
import { resolveProjectRoot } from './project-root.js';
import {
  buildRegionHubEnrichment,
  buildCityRegionNearby,
  findRegionHubByCenterCity,
  clearRegionHubCaches,
} from './region-hub.js';
import type { DestinationType } from './types/common.js';
import type {
  PublicCityPageDto,
  PublicDestinationDto,
  PublicLandingDto,
  PublicSessionDto,
} from './types/public.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_CITY_CACHE_MS = 5 * 60 * 1000;
/** Stale-while-revalidate: serve expired city page while rebuild runs. */
const PUBLIC_CITY_STALE_MS = Number(process.env.PUBLIC_CITY_STALE_MS || 30 * 60 * 1000);
const CITY_SSR_SESSION_LIMIT = 48;
/** Venues/landings enrichment must not block city HTML for tens of seconds. */
const CITY_SECONDARY_TIMEOUT_MS = Number(process.env.DAIBILET_CITY_SECONDARY_TIMEOUT_MS || 3000);
const projectRoot = resolveProjectRoot(import.meta.url);

function cityPerfEnabled() {
  return process.env.DAIBILET_PERF_LOG === '1';
}

function cityPerfMark(label: string, startedAt: number, extra?: Record<string, unknown>) {
  if (!cityPerfEnabled()) return;
  const payload = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[perf:city-dto] ${label}: ${Date.now() - startedAt}ms${payload}`);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          if (cityPerfEnabled()) console.log(`[perf:city-dto] ${label}: timeout ${ms}ms → fallback`);
          resolve(fallback);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface PublicDestinationsDto {
  generatedAt: string;
  destinations: PublicDestinationDto[];
}

interface CachedPayload<T> {
  expiresAt: number;
  staleUntil: number;
  payload: T;
}

const pageCache = new Map<string, CachedPayload<PublicCityPageDto | null>>();
const pageBuildPromises = new Map<string, Promise<PublicCityPageDto | null>>();
let destinationsCache: CachedPayload<PublicDestinationsDto> | null = null;
let destinationsBuild: Promise<PublicDestinationsDto> | null = null;
let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export function clearPublicCityDtoCache(): void {
  // Soft-invalidate for SWR: keep last payloads while rebuild runs.
  const now = Date.now();
  for (const [key, cached] of pageCache) {
    pageCache.set(key, { ...cached, expiresAt: 0, staleUntil: Math.max(cached.staleUntil, now + PUBLIC_CITY_STALE_MS) });
  }
  if (destinationsCache) {
    destinationsCache = {
      ...destinationsCache,
      expiresAt: 0,
      staleUntil: Math.max(destinationsCache.staleUntil, now + PUBLIC_CITY_STALE_MS),
    };
  }
  clearRegionHubCaches();
}

export async function buildPublicDestinationsDto(
  forceRefresh = false,
): Promise<PublicDestinationsDto> {
  const now = Date.now();
  if (!forceRefresh && destinationsCache && destinationsCache.expiresAt > now) {
    return destinationsCache.payload;
  }
  if (!forceRefresh && destinationsCache && now < destinationsCache.staleUntil) {
    void scheduleDestinationsRebuild(false);
    return destinationsCache.payload;
  }
  return scheduleDestinationsRebuild(forceRefresh);
}

function scheduleDestinationsRebuild(forceRefresh: boolean): Promise<PublicDestinationsDto> {
  if (!forceRefresh && destinationsBuild) return destinationsBuild;

  if (forceRefresh) {
    pageCache.clear();
    destinationsCache = destinationsCache
      ? { ...destinationsCache, expiresAt: 0, staleUntil: 0 }
      : null;
  }

  const build = (forceRefresh
    ? getPublicCatalogSessions(true, { hydrateSlots: false })
    : getPublicCatalogSessionsSoft(CITY_SECONDARY_TIMEOUT_MS, { hydrateSlots: false })
  ).then((sessions) => {
    // Soft timeout with null: keep previous destinations payload when possible.
    if (!sessions) {
      if (destinationsCache?.payload) return destinationsCache.payload;
      return { generatedAt: new Date().toISOString(), destinations: [] };
    }
    const payload = {
      generatedAt: new Date().toISOString(),
      destinations: buildPublicDestinationRowsFromSessions(sessions),
    };
    const builtAt = Date.now();
    destinationsCache = {
      expiresAt: builtAt + PUBLIC_CITY_CACHE_MS,
      staleUntil: builtAt + PUBLIC_CITY_STALE_MS,
      payload,
    };
    return payload;
  });
  destinationsBuild = build;
  return build.finally(() => {
    if (destinationsBuild === build) destinationsBuild = null;
  });
}

export async function buildPublicCityDto(
  citySlugOrId: string,
  forceRefresh = false,
): Promise<PublicCityPageDto | null> {
  const cacheKey = String(citySlugOrId || '').trim().toLowerCase();
  const now = Date.now();
  const cached = pageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > now) return cached.payload;
  if (!forceRefresh && cached && now < cached.staleUntil) {
    void scheduleCityPageRebuild(cacheKey, citySlugOrId, false);
    return cached.payload;
  }
  return scheduleCityPageRebuild(cacheKey, citySlugOrId, forceRefresh);
}

function scheduleCityPageRebuild(
  cacheKey: string,
  citySlugOrId: string,
  forceRefresh: boolean,
): Promise<PublicCityPageDto | null> {
  const inflight = pageBuildPromises.get(cacheKey);
  if (!forceRefresh && inflight) return inflight;

  const build = (async () => {
    const buildStartedAt = Date.now();
    const requestedSlug = String(citySlugOrId || '').toLowerCase();
    const legacyDb = getLegacyDb();
    const catalogStartedAt = Date.now();
    const catalogPromise = forceRefresh
      ? getPublicCatalogSessions(true, { hydrateSlots: false })
      : getPublicCatalogSessionsSoft(CITY_SECONDARY_TIMEOUT_MS, { hydrateSlots: false }).then(
          (rows) => rows || [],
        );
    const [catalogSessions, venueHubRows] = await Promise.all([
      catalogPromise,
      withTimeout(publicVenueHubRows(legacyDb, 500), CITY_SECONDARY_TIMEOUT_MS, [], 'venue-hubs'),
    ]);
    cityPerfMark('catalog+venues-hub', catalogStartedAt, {
      sessions: catalogSessions.length,
      venueHubs: venueHubRows.length,
    });
    const indexKeys = [citySlugOrId, requestedSlug].filter(Boolean);
    const indexed = resolveCatalogSessionsByDestinationKeys(indexKeys);
    const matchedSessions = (
      indexed.length
        ? indexed
        : lookupDestinationCatalogSessions(citySlugOrId, requestedSlug, catalogSessions)
    ) as PublicSessionDto[];
    const builtAt = Date.now();
    if (!matchedSessions.length) {
      const emptyPage = await buildStandaloneCityPageWithoutSessions({
        citySlugOrId,
        requestedSlug,
        cacheKey,
        builtAt,
        buildStartedAt,
      });
      return emptyPage;
    }

    const seedSession = matchedSessions[0];
    if (!seedSession) {
      return buildStandaloneCityPageWithoutSessions({
        citySlugOrId,
        requestedSlug,
        cacheKey,
        builtAt,
        buildStartedAt,
      });
    }
    const destination = publicDestinationFromSession(seedSession);
    const sessions = pickCityHubFeedSessions(
      matchedSessions,
      requestedSlug || citySlugOrId,
      CITY_SSR_SESSION_LIMIT,
    ).map((session) => toPublicCatalogListItem(session));
    const mapStartedAt = Date.now();
    const [sessionVenues, cityRecord, contentVenues] = await Promise.all([
      withTimeout(
        resolvePublicVenuesForSessions(legacyDb, matchedSessions, venueHubRows, 24),
        CITY_SECONDARY_TIMEOUT_MS,
        [],
        'resolve-venues',
      ),
      destination.type === 'city' && seedSession.cityId
        ? withTimeout(
            prisma.city.findUnique({ where: { id: seedSession.cityId } }),
            CITY_SECONDARY_TIMEOUT_MS,
            null,
            'city-record',
          )
        : Promise.resolve(null),
      seedSession.cityId
        ? withTimeout(
            publicPublishedVenuesByCityId(legacyDb, seedSession.cityId, 250),
            CITY_SECONDARY_TIMEOUT_MS,
            [],
            'city-content-venues',
          )
        : Promise.resolve([]),
    ]);
    const venues = mergeCityPageVenues(sessionVenues, contentVenues, 250);
    cityPerfMark('venues+city-record', mapStartedAt, { venues: venues.length });
    const venueCount = countDistinctSessionVenues(matchedSessions);
    const prices = matchedSessions
      .map((session: PublicSessionDto) => session.priceFrom)
      .filter((price: number | null | undefined): price is number =>
        Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB,
      );
    // Facet counts must match the hub feed (`sessions`), not the full city catalog.
    // `city.events` / `stats.events` stay on matchedSessions for hero totals.
    const categories = countBy(
      sessions
        .map((event) => event.category)
        .filter((value): value is string => Boolean(value)),
    );
    const landings = (buildPublicLandings(matchedSessions) as PublicLandingDto[]).filter((landing) => landing.events > 0);
    const entityLabel = destinationPrepositional(destination);

    const isRegion = destination.type === 'region';
    const destinations = isRegion
      ? (await buildPublicDestinationsDto(forceRefresh)).destinations
      : [];
    const regionEnrichment = isRegion
      ? buildRegionHubEnrichment({
          regionName: destination.name,
          regionSlug: destination.slug,
          sessions: matchedSessions,
          destinations: destinations as PublicDestinationDto[],
        })
      : null;

    let regionNearby = null;
    if (!isRegion && destination.type === 'city') {
      const regionHub = findRegionHubByCenterCity({
        name: destination.name,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
      });
      if (regionHub) {
        const regionSessions = lookupDestinationCatalogSessions(
          regionHub.regionSlug,
          regionHub.regionSlug,
          catalogSessions,
        ) as PublicSessionDto[];
        regionNearby = buildCityRegionNearby({
          cityName: destination.name,
          citySlug: destination.slug,
          sourceSlug: destination.sourceSlug,
          regionSessions,
          limit: 6,
        });
      }
    }

    const regionSeoDescription =
      `Список событий, площадок и популярных городов в ${destination.name} для загородного отдыха и поездок выходного дня.`;

    const payload: PublicCityPageDto = {
      generatedAt: new Date().toISOString(),
      city: {
        id: destination.id,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
        name: destination.name,
        title: isRegion
          ? `${destination.name}: куда съездить и что посмотреть`
          : destination.name,
        type: destination.type as DestinationType,
        isDestination: true,
        events: matchedSessions.length,
        venues: venueCount,
        categories,
        seoH1: isRegion
          ? `Мероприятия и загородный отдых в ${destination.name}`
          : cityRecord?.seoH1 || destination.name,
        seoTitle: isRegion
          ? `${destination.name}: куда съездить и что посмотреть, загородный отдых`
          : cityRecord?.seoTitle || buildCityHubSeoTitle(destination.name),
        seoDescription: isRegion
          ? regionSeoDescription
          : cityRecord?.seoDescription ||
            `Афиша событий, экскурсий, музеев и активностей ${entityLabel}. Быстрый выбор по датам, площадкам и категориям.`,
        canonicalPath: cityRecord?.canonicalPath || `/cities/${destination.slug}`,
      },
      sessions: sessions as PublicCityPageDto['sessions'],
      venues,
      landings,
      stats: {
        events: matchedSessions.length,
        venues: venueCount,
        categories: Object.keys(categories).length,
        priceFrom: prices.length ? Math.min(...prices) : null,
      },
      ...(regionEnrichment
        ? {
            centerCity: regionEnrichment.centerCity,
            childCities: regionEnrichment.childCities,
            regionInfo: regionEnrichment.regionInfo,
            regionTier: regionEnrichment.liveTier,
            regionInfoNeedsGeneration: regionEnrichment.regionInfoNeedsGeneration,
          }
        : {}),
      ...(regionNearby ? { regionNearby } : {}),
    };
    pageCache.set(cacheKey, {
      expiresAt: builtAt + PUBLIC_CITY_CACHE_MS,
      staleUntil: builtAt + PUBLIC_CITY_STALE_MS,
      payload,
    });
    cityPerfMark('built', buildStartedAt, {
      slug: cacheKey,
      matched: matchedSessions.length,
      sessions: sessions.length,
      venues: venues.length,
      landings: landings.length,
    });
    return payload;
  })();

  pageBuildPromises.set(cacheKey, build);
  return build.finally(() => {
    if (pageBuildPromises.get(cacheKey) === build) pageBuildPromises.delete(cacheKey);
  });
}

async function buildStandaloneCityPageWithoutSessions(args: {
  citySlugOrId: string;
  requestedSlug: string;
  cacheKey: string;
  builtAt: number;
  buildStartedAt: number;
}): Promise<PublicCityPageDto | null> {
  const standaloneName =
    matchStandaloneCityBySlug(args.requestedSlug) || matchStandaloneCityBySlug(args.citySlugOrId);
  if (!standaloneName) {
    const payload = null;
    pageCache.set(args.cacheKey, {
      expiresAt: args.builtAt + PUBLIC_CITY_CACHE_MS,
      staleUntil: args.builtAt + PUBLIC_CITY_STALE_MS,
      payload,
    });
    cityPerfMark('empty', args.buildStartedAt, { slug: args.cacheKey });
    return payload;
  }

  const cityRecord = await withTimeout(
    prisma.city.findFirst({ where: { title: standaloneName } }),
    CITY_SECONDARY_TIMEOUT_MS,
    null,
    'standalone-city-record',
  );
  const destination = publicDestinationFromSession({
    destination: standaloneName,
    destinationType: 'city',
    city: standaloneName,
    cityId: cityRecord?.id,
    sourceCitySlug: cityRecord?.slug,
  } as never);
  const contentVenues = cityRecord?.id
    ? await withTimeout(
        publicPublishedVenuesByCityId(getLegacyDb(), cityRecord.id, 250),
        CITY_SECONDARY_TIMEOUT_MS,
        [],
        'standalone-city-venues',
      )
    : [];
  const entityLabel = destinationPrepositional(destination);
  const payload: PublicCityPageDto = {
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
      venues: contentVenues.length,
      categories: {},
      seoH1: cityRecord?.seoH1 || destination.name,
      seoTitle: cityRecord?.seoTitle || buildCityHubSeoTitle(destination.name),
      seoDescription:
        cityRecord?.seoDescription ||
        `Афиша событий, экскурсий, музеев и активностей ${entityLabel}. Быстрый выбор по датам, площадкам и категориям.`,
      canonicalPath: cityRecord?.canonicalPath || `/cities/${destination.slug}`,
    },
    sessions: [],
    venues: contentVenues,
    landings: [],
    stats: {
      events: 0,
      venues: contentVenues.length,
      categories: 0,
      priceFrom: null,
    },
  };
  pageCache.set(args.cacheKey, {
    expiresAt: args.builtAt + PUBLIC_CITY_CACHE_MS,
    staleUntil: args.builtAt + PUBLIC_CITY_STALE_MS,
    payload,
  });
  cityPerfMark('standalone-empty-sessions', args.buildStartedAt, {
    slug: args.cacheKey,
    venues: contentVenues.length,
  });
  return payload;
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}
