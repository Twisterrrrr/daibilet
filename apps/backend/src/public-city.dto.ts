import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '@daibilet/db';
import {
  buildPublicDestinationRowsFromSessions,
  buildPublicLandings,
  destinationPrepositional,
  lookupDestinationCatalogSessions,
  publicDestinationFromSession,
  publicVenueHubRows,
  publicVenuesForSessionsFromHub,
} from './dto.js';
import { createDb } from './db.js';
import { getPublicCatalogSessions } from './public-catalog.dto.js';
import type { DestinationType } from './types/common.js';
import type {
  PublicCityPageDto,
  PublicDestinationDto,
  PublicLandingDto,
  PublicSessionDto,
} from './types/public.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_CITY_CACHE_MS = 5 * 60 * 1000;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export interface PublicDestinationsDto {
  generatedAt: string;
  destinations: PublicDestinationDto[];
}

interface CachedPayload<T> {
  expiresAt: number;
  payload: T;
}

const pageCache = new Map<string, CachedPayload<PublicCityPageDto | null>>();
let destinationsCache: CachedPayload<PublicDestinationsDto> | null = null;
let destinationsBuild: Promise<PublicDestinationsDto> | null = null;
let legacyDb: ReturnType<typeof createDb> | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export function clearPublicCityDtoCache(): void {
  pageCache.clear();
  destinationsCache = null;
  destinationsBuild = null;
}

export async function buildPublicDestinationsDto(
  forceRefresh = false,
): Promise<PublicDestinationsDto> {
  const now = Date.now();
  if (!forceRefresh && destinationsCache && destinationsCache.expiresAt > now) {
    return destinationsCache.payload;
  }
  if (!forceRefresh && destinationsBuild) return destinationsBuild;

  if (forceRefresh) clearPublicCityDtoCache();
  const build = getPublicCatalogSessions(forceRefresh).then((sessions) => {
    const payload = {
      generatedAt: new Date().toISOString(),
      destinations: buildPublicDestinationRowsFromSessions(sessions),
    };
    destinationsCache = {
      expiresAt: Date.now() + PUBLIC_CITY_CACHE_MS,
      payload,
    };
    return payload;
  });
  destinationsBuild = build;
  try {
    return await build;
  } finally {
    if (destinationsBuild === build) destinationsBuild = null;
  }
}

export async function buildPublicCityDto(
  citySlugOrId: string,
  forceRefresh = false,
): Promise<PublicCityPageDto | null> {
  const cacheKey = String(citySlugOrId || '').trim().toLowerCase();
  const cached = pageCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.payload;
  if (forceRefresh) pageCache.delete(cacheKey);

  const requestedSlug = String(citySlugOrId || '').toLowerCase();
  const [catalogSessions, venueHubRows] = await Promise.all([
    getPublicCatalogSessions(forceRefresh),
    publicVenueHubRows(getLegacyDb(), 500),
  ]);
  const matchedSessions = lookupDestinationCatalogSessions(
    citySlugOrId,
    requestedSlug,
    catalogSessions,
  ) as PublicSessionDto[];
  if (!matchedSessions.length) {
    pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_CITY_CACHE_MS, payload: null });
    return null;
  }

  const destination = publicDestinationFromSession(matchedSessions[0]);
  const sessions = matchedSessions.slice(0, 160);
  const venues = publicVenuesForSessionsFromHub(sessions, venueHubRows, 24);
  const prices = sessions
    .map((session: PublicSessionDto) => session.priceFrom)
    .filter((price: number | null | undefined): price is number =>
      Number.isFinite(price) && Number(price) >= MIN_DISPLAY_PRICE_RUB,
    );
  const categories = countBy(sessions.map((event: PublicSessionDto) => event.category).filter(Boolean));
  const landings = (buildPublicLandings(sessions) as PublicLandingDto[]).filter((landing) => landing.events > 0);
  const entityLabel = destinationPrepositional(destination);
  const cityRecord = destination.type === 'city' && sessions[0]?.cityId
    ? await prisma.city.findUnique({ where: { id: sessions[0].cityId } })
    : null;

  const payload: PublicCityPageDto = {
    generatedAt: new Date().toISOString(),
    city: {
      id: destination.id,
      slug: destination.slug,
      sourceSlug: destination.sourceSlug,
      name: destination.name,
      title: destination.name,
      type: destination.type as DestinationType,
      isDestination: true,
      events: sessions.length,
      venues: venues.length,
      categories,
      seoH1: cityRecord?.seoH1 || destination.name,
      seoTitle: cityRecord?.seoTitle || `${destination.name}: афиша, экскурсии и билеты | Дайбилет`,
      seoDescription: cityRecord?.seoDescription ||
        `Афиша событий, экскурсий, музеев и активностей ${entityLabel}. Быстрый выбор по датам, площадкам и категориям.`,
      canonicalPath: cityRecord?.canonicalPath || `/cities/${destination.slug}`,
    },
    sessions,
    venues,
    landings,
    stats: {
      events: sessions.length,
      venues: venues.length,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
  pageCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_CITY_CACHE_MS, payload });
  return payload;
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}
