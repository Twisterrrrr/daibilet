/**
 * Public venue read path (hub / catalog / page builders).
 * Extracted from dto.js (F5.3b). Legacy dto.js re-exports the public API.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizePublicVenueRecord,
  formatBusLocationDisplayName,
  formatPierLocationDisplayName,
  findVenueOverride,
} from './venue-normalize.js';
import { formatPublicEventTitle } from './event-title-normalize.ts';
import {
  applyVenueEventFacetCounts,
  fetchLeanPublicVenueRows,
  fetchVenueDistinctEventCounts,
  fetchVenueEventFacetCounts,
  fetchVenueHeroImageFallbacks,
  fetchVenueStopEventCounts,
} from './public-venue-lean.ts';
import {
  isContentPlaceHubEligible,
  isContentPlaceKind,
} from './public-venue-hub-gate.js';
import { MIN_DISPLAY_PRICE_RUB } from './catalog-availability.ts';
import { formatTime, parseSessionStartsAt } from './public-datetime.ts';
import { canonicalSessionPierKey } from './public-catalog-grouping.ts';
import { dedupePublicVenueLinkedEvents } from './public-venue-linked-events.ts';
import { pickFirstUsableEventImageUrl } from './event-image-url.ts';
import { loadCityRoutingConfig } from './city-routing-config.js';
import { resolveProjectRoot } from './project-root.js';

const PUBLIC_CATALOG_CACHE_MS = 5 * 60 * 1000;
/** Soft TTL: serve expired hub while single-flight rebuild runs (INC.504 venues hang). */
const PUBLIC_VENUE_HUB_STALE_MS = Number(process.env.PUBLIC_VENUE_HUB_STALE_MS || 30 * 60 * 1000);
const PROJECT_ROOT = resolveProjectRoot(import.meta.url);

let publicVenueHubCache = null;
/** @type {Map<string, { cacheKey: string, expiresAt: number, staleUntil: number, rows: any[], shell?: boolean }>} */
const publicVenueHubCaches = new Map();
let publicVenueCatalogLists = null;
/** @type {Map<string, Promise<any[]>>} */
const publicVenueHubBuilds = new Map();

/** Optional override for catalog sessions (tests / legacy inject). */
let catalogSessionsProvider = null;

export function setPublicVenueCatalogSessionsProvider(fn) {
  catalogSessionsProvider = typeof fn === 'function' ? fn : null;
}

export function clearPublicVenueReadCache() {
  // Soft-invalidate: keep last hub for SWR so /locations|/venues never await 20s cold rebuild.
  for (const [key, cached] of publicVenueHubCaches) {
    if (cached?.rows?.length) {
      publicVenueHubCaches.set(key, { ...cached, expiresAt: 0 });
    } else {
      publicVenueHubCaches.delete(key);
    }
  }
  publicVenueHubCache = null;
  if (publicVenueCatalogLists?.institution || publicVenueCatalogLists?.location) {
    publicVenueCatalogLists = { ...publicVenueCatalogLists, expiresAt: 0 };
  } else {
    publicVenueCatalogLists = null;
  }
}

export async function warmPublicVenueCatalogCache(db) {
  // Full eligible hub (not take 500) so chips/totals match live catalog.
  const rows = await publicVenueHubRows(db, VENUE_CATALOG_HUB_MAX, { requireEvents: false });
  const now = Date.now();
  publicVenueCatalogLists = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    staleUntil: now + PUBLIC_VENUE_HUB_STALE_MS,
    institution: [],
    location: [],
  };
  for (const row of rows) {
    const item = mapPublicVenueListItem(row);
    if (item.template === 'institution') publicVenueCatalogLists.institution.push(item);
    else publicVenueCatalogLists.location.push(item);
  }
}

export function warmVenueCatalogList(family) {
  if (!publicVenueCatalogLists) return null;
  const now = Date.now();
  if (publicVenueCatalogLists.expiresAt <= now) {
    // Past soft TTL still OK for callers that only need a hint; hard miss after staleUntil.
    if (now > (publicVenueCatalogLists.staleUntil || 0)) return null;
  }
  if (family === 'institution') return publicVenueCatalogLists.institution;
  if (family === 'location') return publicVenueCatalogLists.location;
  return null;
}

async function getCatalogSessions(db) {
  if (catalogSessionsProvider) return catalogSessionsProvider(db);
  const { getPublicCatalogSessions } = await import('./public-catalog.dto.js');
  return getPublicCatalogSessions();
}

/**
 * Venue/location PDP: prefer disk v2 venueIndex + soft timeout.
 * Must not await a hung full-catalog promote/parse on every /locations|/venues slug.
 * Slot hydrate runs only on the venue-scoped slice (not the full catalog) so the
 * schedule date rail sees multi-day Teplohod/TC departures instead of one nearest slot.
 */
const VENUE_PAGE_CATALOG_SOFT_MS = Number(process.env.DAIBILET_VENUE_PAGE_CATALOG_SOFT_MS || 2_500);

async function loadVenuePageCatalogSessions(venueIds, venueContexts = []) {
  const keys = new Set();
  for (const id of venueIds || []) {
    const key = String(id || '').trim().toLowerCase();
    if (key) keys.add(key);
  }
  for (const ctx of venueContexts || []) {
    const slug = normalizePublicVenueSlugKey(ctx?.slug || '');
    if (slug) keys.add(slug);
  }
  for (const pierKey of pierKeysForVenueContexts(venueContexts)) {
    if (pierKey) keys.add(`pier:${pierKey}`);
  }

  try {
    const catalog = await import('./public-catalog.dto.js');
    const soft = await catalog.getPublicCatalogSessionsSoft(VENUE_PAGE_CATALOG_SOFT_MS, {
      hydrateSlots: false,
    });
    if (!soft?.length) return [];

    const indexed = catalog.resolveCatalogSessionsByVenueKeys([...keys]);
    const scoped = indexed.length
      ? sortVenueCatalogSessions(indexed).slice(0, 120)
      : // Index miss (v1 disk / name-only fuzzy): fall back to scoped filter, still no extra promote.
        lookupVenueCatalogSessions(venueIds, soft, venueContexts).slice(0, 120);
    if (!scoped.length) return [];

    try {
      const slotLimit = catalog.VENUE_PAGE_SLOT_LIMIT || 96;
      return await catalog.hydrateCatalogUpcomingSlots(scoped, slotLimit);
    } catch {
      // Keep nearest-slot schedule if EventSession hydrate fails (date rail degrades, PDP stays up).
      return scoped;
    }
  } catch {
    return [];
  }
}

const CITY_ROUTING = loadCityRoutingConfig(import.meta.url);
const STANDALONE_CITY_NAMES = new Set(CITY_ROUTING.standaloneCities || []);
const CITY_TO_REGION = new Map(Object.entries(CITY_ROUTING.cityToRegion || {}));
const FOREIGN_CITY_NAMES = new Set(CITY_ROUTING.foreignCities || []);

function isForeignPublicCity(name) {
  const clean = cleanDisplayName(name);
  return Boolean(clean && FOREIGN_CITY_NAMES.has(clean));
}


function cleanDisplayName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeNullableString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function formatPublicVenueTitle(value) {
  if (value == null) return value;
  return String(value)
    .replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '')
    .trim();
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

const CITY_SLUG_CANONICAL = {
  moscow: 'moskva',
  moskva: 'moskva',
  'saint-petersburg': 'sankt-peterburg',
  'sankt-peterburg': 'sankt-peterburg',
  spb: 'sankt-peterburg',
  peterburg: 'sankt-peterburg',
  petersburg: 'sankt-peterburg',
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

const KNOWN_PIER_ADDRESS_PATTERNS = [
  { key: 'sinopskaya-10', test: (text) => /синопск/.test(text) && /\b10\b/.test(text) },
  { key: 'fontanka-53', test: (text) => /фонтанк/.test(text) && /\b53\b/.test(text) },
  { key: 'dvortsovaya-18', test: (text) => /дворцов/.test(text) && /\b18\b/.test(text) },
];

export function canonicalPierLocationKey(name, address) {
  const text = normalizeVenueTextKey(`${name || ''} ${address || ''}`);
  if (!text) return null;

  for (const pattern of KNOWN_PIER_ADDRESS_PATTERNS) {
    if (pattern.test(text)) return pattern.key;
  }

  if (/причал|набереж/.test(text)) {
    const addressKey = canonicalVenueAddressKey(name, address);
    if (addressKey.length >= 8) return `pier|${addressKey}`;
  }

  return null;
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (degrees) => (Number(degrees) * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)));
}

function mapSlimPublicStopEvent(row) {
  const venueTitle = formatPublicVenueTitle(row.venueTitle || row.venue || '');
  const venueKind = resolvePublicVenueKind(row.venueKind, venueTitle, row.venueAddress);
  return {
    id: row.id,
    slug: publicEventSlug(row.slug || row.id),
    title: formatPublicEventTitle(row.title),
    imageUrl: pickFirstUsableEventImageUrl(row.overrideImageUrl, row.imageUrl),
    priceFrom:
      Number.isFinite(Number(row.priceFromRub)) && Number(row.priceFromRub) >= MIN_DISPLAY_PRICE_RUB
        ? Number(row.priceFromRub)
        : null,
    venue: venueTitle || null,
    venueId: row.venueId || null,
    venueSlug: row.venueSlug || null,
    venueKind: venueKind || row.venueKind || null,
    routeLabel: normalizeNullableString(row.routeLabel ?? row.label) || null,
  };
}

async function loadStopEventsForVenue(db, venueIds) {
  if (!venueIds?.length) return [];
  const result = await db.query(
    `
      select
        e.id,
        e.slug,
        e.title,
        e."imageUrl",
        e."priceFromRub",
        override."imageUrl" as "overrideImageUrl",
        start_venue.id as "venueId",
        start_venue.slug as "venueSlug",
        start_venue.title as "venueTitle",
        start_venue.address as "venueAddress",
        start_venue.kind as "venueKind",
        min(link."sortOrder") as "sortOrder",
        (array_agg(link.label order by link."sortOrder"))[1] as "routeLabel"
      from "event_venue_route_items" link
      join "Event" e on e.id = link."eventId"
      left join "EventOverride" override on override."eventId" = e.id
      left join "Venue" start_venue on start_venue.id = e."venueId"
      where link."venueId" = any($1)
        and link.role = 'STOP'::"RouteItemRole"
        and e.status not in ('HIDDEN', 'DRAFT')
      group by
        e.id, e.slug, e.title, e."imageUrl", e."priceFromRub",
        override."imageUrl",
        start_venue.id, start_venue.slug, start_venue.title, start_venue.address, start_venue.kind
      order by min(link."sortOrder"), e.title
      limit 48
    `,
    [venueIds],
  );
  return dedupePublicVenueLinkedEvents(result.rows.map(mapSlimPublicStopEvent));
}

async function loadNearbyEventsForVenue(db, venue, excludeEventIds = []) {
  const lat = Number(venue.latitude);
  const lng = Number(venue.longitude);
  if (!isValidVenueCoordinatePair(lat, lng)) return [];

  const bboxDeg = 0.005; // ~550m по широте
  const result = await db.query(
    `
      select
        e.id,
        e.slug,
        e.title,
        e."imageUrl",
        e."priceFromRub",
        override."imageUrl" as "overrideImageUrl",
        start_venue.id as "venueId",
        start_venue.slug as "venueSlug",
        start_venue.title as "venueTitle",
        start_venue.address as "venueAddress",
        start_venue.kind as "venueKind",
        start_venue.latitude as "venueLatitude",
        start_venue.longitude as "venueLongitude"
      from "Event" e
      join "Venue" start_venue on start_venue.id = e."venueId"
      left join "EventOverride" override on override."eventId" = e.id
      where e.status not in ('HIDDEN', 'DRAFT')
        and start_venue.id <> $1
        and start_venue.latitude is not null
        and start_venue.longitude is not null
        and abs(start_venue.latitude - $2) <= $4
        and abs(start_venue.longitude - $3) <= $4
      order by e.title
      limit 80
    `,
    [venue.id, lat, lng, bboxDeg],
  );

  const excluded = new Set(excludeEventIds.map(String));
  // Dedupe before slice: TC often fills the top-N with session twins of 1–2 titles.
  return dedupePublicVenueLinkedEvents(
    result.rows
      .filter((row) => !excluded.has(String(row.id)))
      .map((row) => {
        const distance = haversineMeters(lat, lng, Number(row.venueLatitude), Number(row.venueLongitude));
        return { ...row, distanceMeters: distance };
      })
      .filter((row) => Number.isFinite(row.distanceMeters) && row.distanceMeters <= 300)
      .sort((a, b) => a.distanceMeters - b.distanceMeters || String(a.title).localeCompare(String(b.title), 'ru'))
      .map(mapSlimPublicStopEvent),
  ).slice(0, 12);
}

export async function loadPublicEventVenueStops(db, eventId) {
  const result = await db.query(
    `
      select
        link."venueId",
        link.label,
        link."sortOrder",
        venue.slug,
        venue.title,
        venue.kind,
        venue.address
      from "event_venue_route_items" link
      join "Venue" venue on venue.id = link."venueId"
      where link."eventId" = $1
        and link.role = 'STOP'::"RouteItemRole"
      order by link."sortOrder", venue.title
    `,
    [eventId],
  );
  return result.rows.map((row) => {
    const title = formatPublicVenueTitle(row.title);
    const kind = resolvePublicVenueKind(row.kind, title, row.address);
    const slug = publicVenueSlug(row.slug, title, row.venueId);
    const template = publicVenuePageTemplate(kind);
    return {
      venueId: row.venueId,
      slug,
      title,
      kind,
      label: normalizeNullableString(row.label),
      href: `/${template === 'location' ? 'locations' : 'venues'}/${slug}`,
    };
  });
}

export async function buildPublicVenuePage(db, venueSlugOrId) {
  const venue = await resolvePublicVenueRow(db, venueSlugOrId);
  if (!venue || venue.pageStatus === 'HIDDEN') return null;

  // Hub first (lean SQL) — do not block PDP on full catalog JSON promote/parse.
  const hubRows = await publicVenueHubRows(db, 500, { requireEvents: false });
  const mergedGroup = findMergedVenueGroup(hubRows, venue.id);
  const venueContexts = collectVenueSessionLookupContexts(venue, mergedGroup, hubRows);
  const venueIds = [
    ...new Set([
      ...(mergedGroup?.mergedVenueIds || [venue.id]),
      ...venueContexts.map((row) => row.id).filter(Boolean),
    ]),
  ];

  const [venueHeroImageFallbacks, sessions] = await Promise.all([
    fetchVenueHeroImageFallbacks(venueIds),
    loadVenuePageCatalogSessions(venueIds, venueContexts),
  ]);
  if (!sessions.length) {
    const status = String(venue.pageStatus || '').toUpperCase();
    const resolvedKind = resolvePublicVenueKindFromRow(venue);
    const pageTemplate = publicVenuePageTemplate(resolvedKind);
    const isLocationPage = pageTemplate === 'location';
    const hasAddressProfile =
      Boolean(String(venue.address || '').trim()) &&
      Boolean(String(venue.description || venue.shortDescription || '').trim());
    // Content places (must-see): title + shortDescription|hookFact|description; address optional.
    const allowContentPlace = isContentPlaceHubEligible(
      {
        title: venue.title,
        name: venue.title,
        kind: venue.kind,
        pageStatus: venue.pageStatus,
        shortDescription: venue.shortDescription,
        hookFact: venue.hookFact,
        description: venue.description,
      },
      resolvedKind,
    );
    // CF.P2: museum/theatre admission can exist without event sessions in catalog.
    const allowAdmissionOnlyInstitution =
      pageTemplate === 'institution' && hasAddressProfile && status === 'PUBLISHED';
    if (
      !(
        allowContentPlace ||
        (isLocationPage && hasAddressProfile && status !== 'NONE' && status !== 'HIDDEN') ||
        allowAdmissionOnlyInstitution
      )
    ) {
      return null;
    }
  }
  const waterEvents = sessions.filter(isWaterCatalogSession).length;
  const busEvents = sessions.filter(isBusCatalogSession).length;
  const canonicalVenue =
    mergedGroup && mergedGroup.id !== venue.id ? (await resolvePublicVenueRow(db, mergedGroup.id)) || venue : venue;
  const relatedVenues = await publicRelatedVenues(db, venue.id, venue.city, 6, hubRows);
  const hubGateRow = {
    id: canonicalVenue.id,
    slug: canonicalVenue.slug,
    title: canonicalVenue.title,
    name: canonicalVenue.title,
    kind: canonicalVenue.kind,
    pageStatus: canonicalVenue.pageStatus,
    address: canonicalVenue.address,
    description: canonicalVenue.description,
    shortDescription: canonicalVenue.shortDescription,
    events: sessions.length,
    busEvents,
    waterEvents,
    totalEvents: sessions.length,
  };
  const inPublicHub = isPublicVenueHub(hubGateRow, { requireEvents: false });
  // TC import marks unknown venues as MEETING_POINT + pageStatus NONE. Hub excludes
  // MEETING_POINT, so without this escape hatch event cards link to /venues/{slug} → 404.
  // Allow NONE (not HIDDEN) when there are live catalog sessions.
  const curatedMeetingPointPage =
    !inPublicHub &&
    resolvePublicVenueKindFromRow(hubGateRow) === 'meeting_point' &&
    sessions.length > 0 &&
    String(canonicalVenue.pageStatus || '').toUpperCase() !== 'HIDDEN';
  if (!inPublicHub && !curatedMeetingPointPage) {
    return null;
  }
  const prices = sessions.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));
  const routeCount = new Set(sessions.map((session) => session.groupKey || session.id).filter(Boolean)).size || sessions.length;
  const resolvedType = resolvePublicVenueKindFromRow({
    ...hubGateRow,
    shortDescription: mergedGroup?.shortDescription || canonicalVenue.shortDescription,
    description: canonicalVenue.description,
  });
  const displayBase = applyPublicVenueNormalization({
    id: canonicalVenue.id,
    slug: canonicalVenue.slug,
    name: formatPublicVenueTitle(canonicalVenue.title),
    title: formatPublicVenueTitle(canonicalVenue.title),
    address: mergedGroup?.address || canonicalVenue.address,
    city: canonicalVenue.city || 'Не указан',
  });
  const displayName = applyPublicVenueDisplayName(
    {
      name: displayBase.name || displayBase.title,
      address: displayBase.address,
      city: displayBase.city || 'Не указан',
    },
    resolvedType,
  );
  const normalizedVenue = {
    ...displayBase,
    name: displayName,
    title: displayName,
  };
  const hasDescription = Boolean(String(canonicalVenue.description || mergedGroup?.shortDescription || canonicalVenue.shortDescription || '').trim());
  const hasAddress = Boolean(String(normalizedVenue.address || '').trim());
  const hasHeroImage = Boolean(resolveVenueHeroImageUrl(
    {
      id: canonicalVenue.id,
      heroImageUrl: mergedGroup?.heroImageUrl || canonicalVenue.heroImageUrl,
      mergedVenueIds: venueIds,
    },
    venueHeroImageFallbacks,
  ));
  const pageTemplate = publicVenuePageTemplate(resolvedType);
  const sessionCount = sessions.length;
  const weakVenuePage =
    pageTemplate === 'location'
      ? !hasAddress || (!hasDescription && !hasHeroImage) || sessionCount < 1
      : routeCount < 3 || (!hasDescription && !hasHeroImage) || !hasAddress;
  const isIndexable = canonicalVenue.isIndexable !== false && !weakVenuePage;

  const venueCoordinates = resolvePublicVenueCoordinates(canonicalVenue, { resolvedType });

  const stopEvents = await loadStopEventsForVenue(db, venueIds);
  let resolvedNearbyEvents = [];
  if (!stopEvents.length && venueCoordinates) {
    resolvedNearbyEvents = await loadNearbyEventsForVenue(
      db,
      { id: canonicalVenue.id, latitude: venueCoordinates.latitude, longitude: venueCoordinates.longitude },
      [],
    );
  }
  const stopEventCount = stopEvents.length;
  const displayEventCount = routeCount > 0 ? routeCount : stopEventCount;

  return {
    generatedAt: new Date().toISOString(),
    venue: {
      id: canonicalVenue.id,
      slug: publicVenueSlug(canonicalVenue.slug, normalizedVenue.name, canonicalVenue.id),
      name: normalizedVenue.name,
      title: normalizedVenue.name,
      city: normalizedVenue.city || 'Не указан',
      citySlug:
        normalizeNullableString(canonicalVenue.citySlug) ||
        (normalizedVenue.city && normalizedVenue.city !== 'Не указан' ? publicCitySlug(normalizedVenue.city) : null),
      regionSlug: normalizeNullableString(canonicalVenue.regionSlug),
      regionTitle: normalizeNullableString(canonicalVenue.regionTitle),
      address: normalizedVenue.address,
      latitude: venueCoordinates?.latitude ?? null,
      longitude: venueCoordinates?.longitude ?? null,
      metroStation: normalizeNullableString(canonicalVenue.metroStation),
      wayToFind: normalizeNullableString(canonicalVenue.wayToFind),
      parkingInfo: normalizeNullableString(canonicalVenue.parkingInfo),
      hookFact: normalizeNullableString(canonicalVenue.hookFact),
      type: resolvedType,
      template: publicVenuePageTemplate(resolvedType),
      pageStatus: canonicalVenue.pageStatus,
      description: pickPublicVenueDescriptionText(canonicalVenue.shortDescription, canonicalVenue.description),
      shortDescription: pickPublicVenueLeadText(canonicalVenue.shortDescription, canonicalVenue.description),
      heroImageUrl: resolveVenueHeroImageUrl(
        {
          id: canonicalVenue.id,
          heroImageUrl: mergedGroup?.heroImageUrl || canonicalVenue.heroImageUrl,
          mergedVenueIds: venueIds,
        },
        venueHeroImageFallbacks,
      ),
      seoH1: canonicalVenue.seoH1,
      seoTitle: canonicalVenue.seoTitle,
      seoDescription: canonicalVenue.seoDescription,
      canonicalPath: resolvePublicVenueCanonicalPath(
        canonicalVenue.canonicalPath,
        pageTemplate,
        publicVenueSlug(canonicalVenue.slug, normalizedVenue.name, canonicalVenue.id),
      ),
      isIndexable,
      events: displayEventCount,
      stopEventCount,
      categories,
    },
    sessions,
    relatedVenues,
    stopEvents,
    nearbyEvents: resolvedNearbyEvents,
    stats: {
      events: displayEventCount,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
}

function isValidVenueCoordinatePair(latitude, longitude) {
  // Number(null)===0 → reject null-island so missing DB coords stay null in public DTO.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function extractEmbeddedVenueCoordinates(...parts) {
  const text = parts.filter(Boolean).join(' ');

  const parenMatch = text.match(/\(\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)/u);
  if (parenMatch) {
    const latitude = Number(parenMatch[1]);
    const longitude = Number(parenMatch[2]);
    if (isValidVenueCoordinatePair(latitude, longitude)) return { latitude, longitude };
  }

  const decimalSlugMatch = text.match(/(?:^|[-_/])(-?\d{1,2}\.\d{3,})[-_/](-?\d{1,3}\.\d{3,})(?:[-_/]|$)/u);
  if (decimalSlugMatch) {
    const latitude = Number(decimalSlugMatch[1]);
    const longitude = Number(decimalSlugMatch[2]);
    if (isValidVenueCoordinatePair(latitude, longitude)) return { latitude, longitude };
  }

  const dashedSlugMatch = text.match(/(?:^|[-_/])(\d{1,2})-(\d{4,7})-(\d{1,3})-(\d{4,7})(?:[-_/]|$)/u);
  if (dashedSlugMatch) {
    const latitude = Number(`${dashedSlugMatch[1]}.${dashedSlugMatch[2]}`);
    const longitude = Number(`${dashedSlugMatch[3]}.${dashedSlugMatch[4]}`);
    if (isValidVenueCoordinatePair(latitude, longitude)) return { latitude, longitude };
  }

  return null;
}

export function resolvePublicVenueCoordinates(venue = {}, options = {}) {
  const embedded = extractEmbeddedVenueCoordinates(venue.title, venue.name, venue.slug, venue.address);
  if (embedded) return embedded;

  const kind = options.resolvedType || venue.type || venue.kind;
  const override = lookupLocationDescriptionCoordinates(
    venue.slug,
    venue.title || venue.name,
    venue.id,
  );
  // Do not Number(null)→0: that falsely passes range checks as null-island.
  const rawLat = override?.latitude ?? venue.latitude;
  const rawLng = override?.longitude ?? venue.longitude;
  const latitude = rawLat == null || rawLat === '' ? NaN : Number(rawLat);
  const longitude = rawLng == null || rawLng === '' ? NaN : Number(rawLng);
  if (!isValidVenueCoordinatePair(latitude, longitude)) return null;

  if (isPierVenueKind(kind) && !override) {
    return adjustPierCoordinatesToWater(latitude, longitude, venue);
  }

  return { latitude, longitude };
}

let locationDescriptionCoordinatesCache = null;

function getLocationDescriptionCoordinatesMap() {
  if (locationDescriptionCoordinatesCache) return locationDescriptionCoordinatesCache;
  const map = new Map();
  try {
    const filePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../scripts/data/location-descriptions.json',
    );
    const items = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const item of items) {
      if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') continue;
      const slug = String(item.slug || '').trim().toLowerCase();
      if (!slug) continue;
      const coords = { latitude: item.latitude, longitude: item.longitude };
      map.set(slug, coords);
      const shortSlug = slug.replace(/-[a-f0-9]{20,}$/i, '');
      if (shortSlug !== slug) map.set(shortSlug, coords);
    }
  } catch {
    // optional curated overrides
  }
  locationDescriptionCoordinatesCache = map;
  return map;
}

function lookupLocationDescriptionCoordinates(slug, title, id) {
  const candidates = [];
  const add = (value) => {
    const key = String(value || '').trim().toLowerCase();
    if (!key) return;
    candidates.push(key);
    const transliterated = publicCitySlug(key);
    if (transliterated && transliterated !== key) candidates.push(transliterated);
    const deduped = dedupeVenueSlugSuffix(transliterated || key);
    if (deduped && !candidates.includes(deduped)) candidates.push(deduped);
  };

  add(slug);
  add(publicVenueSlug(slug, title, id));

  const map = getLocationDescriptionCoordinatesMap();
  for (const value of candidates) {
    if (map.has(value)) return map.get(value);
    const withoutHash = value.replace(/-[a-f0-9]{20,}$/i, '');
    if (map.has(withoutHash)) return map.get(withoutHash);
    for (const [key, coords] of map) {
      if (value.startsWith(`${key}-`) || key.startsWith(`${value}-`)) return coords;
    }
  }
  return null;
}

export function isPierVenueKind(kindOrType) {
  const key = String(kindOrType || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return key === 'pier' || key === 'pier_water';
}

function detectPierWaterOffset(venue = {}) {
  const city = String(venue.city || '').toLowerCase();
  const text = `${venue.address || ''} ${venue.title || ''} ${venue.name || ''}`.toLowerCase();
  if (city.includes('петербург') || text.includes('санкт-петербург') || text.includes('спб')) {
    return { dLat: -0.00094, dLng: 0.00116 };
  }
  if (city.includes('москва') || text.includes('москва')) {
    return { dLat: -0.00072, dLng: 0.00042 };
  }
  if (city.includes('казан') || text.includes('казань')) {
    return { dLat: -0.00055, dLng: 0.00035 };
  }
  if (/наб(?:ережн)?|причал|речн/i.test(text)) {
    return { dLat: -0.00065, dLng: 0.0005 };
  }
  return null;
}

function adjustPierCoordinatesToWater(latitude, longitude, venue = {}) {
  const offset = detectPierWaterOffset(venue);
  if (!offset) return { latitude, longitude };
  return {
    latitude: latitude + offset.dLat,
    longitude: longitude + offset.dLng,
  };
}

function isVenueHallSuffix(suffix) {
  const key = normalizeVenueTextKey(suffix);
  if (!key) return true;
  if (
    /^(основной|малый|большой|маленький|верхний|нижний|концертный|выставочный|камерный|банкетный|театральный|красный|черный|белый|синий|зеленый|vip)(\s+зал)?$/.test(
      key,
    )
  ) {
    return true;
  }
  if (/^зал(\s+[a-zа-яё0-9\-]+)?$/i.test(key)) return true;
  return false;
}

function venueTitleHasOnlyHallSuffixes(name) {
  const title = String(formatPublicVenueTitle(name) || name || '').trim();
  const segments = title
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length <= 1) return false;
  return segments.slice(1).every((part) => isVenueHallSuffix(part));
}

function canonicalVenueMergeTitle(name) {
  let title = String(formatPublicVenueTitle(name) || '').trim();
  if (!title) return title;

  const segments = title.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
  if (segments.length <= 1) return title;
  if (segments.slice(1).every((part) => isVenueHallSuffix(part))) return segments[0];
  return title;
}

export function applyPublicVenueNormalization(row = {}) {
  const normalized = normalizePublicVenueRecord({
    id: row.id,
    title: row.name || row.title,
    name: row.name || row.title,
    address: row.address,
    city: row.city,
  });
  return {
    ...row,
    name: normalized.title,
    title: normalized.title,
    address: normalized.address,
    city: normalized.city || row.city,
  };
}

function normalizeVenueTextKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy venue-title match for catalog/session attach.
 * Exact equality always wins. Prefix ("parent" / "parent hall") only when the
 * shorter side is long enough - bare "Музей"/"Театр" must not stick to every
 * "Музей …" card (Sortavala TC hall → Perm museums).
 */
export const MIN_FUZZY_VENUE_NAME_LEN = 12;

export function venueTextKeysFuzzyMatch(a, b) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (shorter.length < MIN_FUZZY_VENUE_NAME_LEN) return false;
  return longer.startsWith(`${shorter} `);
}

/** Collapse "24 27 б" / "24/27 Б" → stable house token for venue merge keys. */
function normalizeVenueAddressMergeKey(value) {
  return normalizeVenueTextKey(value)
    .replace(/(\d)\s+([a-zа-я])/gi, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function venueTitleLooksLikeAddress(name) {
  const text = String(name || '').toLowerCase();
  return /(?:\bul\.|\bпр\.|\bпер\.|наб\.|,\s*с\.|,\s*д\.|,\s*дом\b|район,|область,|республик)/i.test(text);
}

function canonicalVenueAddressKey(name, address) {
  const titlePart = normalizeVenueTextKey(canonicalVenueMergeTitle(name) || formatPublicVenueTitle(name) || '');
  const addressPart = normalizeVenueAddressMergeKey(address || '');
  let text = `${titlePart} ${addressPart}`
    .replace(/(?:^|\s)причал(?:\s|$)/g, ' ')
    .replace(/(?:^|\s)наб(?:\s|$)/g, ' набережная ')
    .replace(/(?:^|\s)ул(?:\s|$)/g, ' улица ')
    .replace(/\s+/g, ' ')
    .trim();
  // Re-apply house-letter glue after ул→улица expansion.
  text = text.replace(/(\d)\s+([a-zа-я])/gi, '$1$2');
  return text;
}

function normalizePublicVenueMergeKey(name, city, address) {
  const title = normalizeVenueTextKey(canonicalVenueMergeTitle(name));
  const cityKey = normalizeVenueTextKey(city || 'не указан');

  // Только реальные причалы/пристани. Городские набережные-променады - outdoor must-see, не pier-merge.
  if (/причал|пристань/i.test(`${name || ''} ${address || ''}`)) {
    const pierKey = canonicalPierLocationKey(name, address);
    if (pierKey) return `pier|${cityKey}|${pierKey}`;
    return `pier|${cityKey}|${title}`;
  }

  if (hasBusLikeText(name, address)) {
    return `bus|${cityKey}|${title}`;
  }

  if (venueTitleLooksLikeAddress(name)) {
    return `geo|${title}`;
  }

  // «Club | Красный зал» / «Club | Основной зал» → одна карточка клуба в городе,
  // даже если в адресе пляшет пробел («24/27Б» vs «24/27 Б»).
  if (title && venueTitleHasOnlyHallSuffixes(name)) {
    return `clubhall|${cityKey}|${title}`;
  }

  const addressKey = canonicalVenueAddressKey(name, address);
  if (addressKey.length >= 10) {
    return `addr|${cityKey}|${addressKey}`;
  }

  return `city|${cityKey}|${title}`;
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

export function resolvePublicVenueCity(row) {
  const dbCity = cleanDisplayName(row.city);
  const name = row.name || row.title || '';
  const address = row.address || '';
  const canonicalDb = canonicalizePublicCityName(dbCity);
  // Prefer DB city. Stem inference («казан» ⊂ «Казанский собор») must not
  // reassign SPB/KGD editorial places to another known city.
  if (canonicalDb && !venueLocationContradictsCity(name, address, canonicalDb)) {
    return routeCityToPublicDisplayName(canonicalDb);
  }
  const inferred = inferCityNameFromText(name, address);
  if (inferred && (!canonicalDb || venueLocationContradictsCity(name, address, canonicalDb))) {
    return routeCityToPublicDisplayName(inferred);
  }
  if (canonicalDb) return routeCityToPublicDisplayName(canonicalDb);
  if (dbCity && dbCity !== 'Не указан') return routeCityToPublicDisplayName(dbCity);
  const locality = inferVenueLocalityLabel(name, address);
  return locality ? routeCityToPublicDisplayName(locality) : 'Не указан';
}

function venueRowMergeScore(row) {
  let score = (Number(row.events) || 0) * 1000;
  if (row.heroImageUrl) score += 500;
  if (String(row.pageStatus || '').toUpperCase() === 'PUBLISHED') score += 200;
  if (row.address) score += 50;
  if (row.shortDescription) score += 25;
  return score;
}

function mergePublicVenueHubRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = normalizePublicVenueMergeKey(row.name || row.title, row.city, row.address);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const merged = [];
  for (const items of groups.values()) {
    if (items.length === 1) {
      const only = items[0];
      const canonicalName = canonicalVenueMergeTitle(only.name || only.title) || only.name;
      merged.push({ ...only, name: canonicalName, title: canonicalName, mergedVenueIds: [only.id] });
      continue;
    }

    const sorted = [...items].sort((a, b) => venueRowMergeScore(b) - venueRowMergeScore(a));
    const primary = sorted[0];
    const canonicalName = canonicalVenueMergeTitle(primary.name || primary.title) || primary.name;
    merged.push({
      ...primary,
      name: canonicalName,
      title: canonicalName,
      city: resolvePublicVenueCity(primary),
      events: items.reduce((sum, item) => sum + (Number(item.events) || 0), 0),
      waterEvents: items.reduce((sum, item) => sum + (Number(item.waterEvents) || 0), 0),
      busEvents: items.reduce((sum, item) => sum + (Number(item.busEvents) || 0), 0),
      heroImageUrl: sorted.find((item) => item.heroImageUrl)?.heroImageUrl || primary.heroImageUrl,
      shortDescription: sorted.find((item) => item.shortDescription)?.shortDescription || primary.shortDescription,
      description: sorted.find((item) => item.description)?.description || primary.description,
      address: sorted.find((item) => item.address)?.address || primary.address,
      mergedVenueIds: items.map((item) => item.id),
    });
  }

  return merged.sort((a, b) => (b.events - a.events) || String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
}

function findMergedVenueGroup(rows, venueId) {
  if (!venueId) return null;
  return rows.find((row) => row.id === venueId || (row.mergedVenueIds || []).includes(venueId)) || null;
}

function venueGroupsOverlap(a, b) {
  const left = new Set(a?.mergedVenueIds || (a?.id ? [a.id] : []));
  return (b?.mergedVenueIds || (b?.id ? [b.id] : [])).some((id) => left.has(id));
}

async function rebuildPublicVenueHubRows(take, options = {}) {
  const shell = options.shell === true;
  // Shell: skip distinct product SQL (+ facets + hero SQL) so /venues loadMore can paginate
  // without waiting on a multi-second hub rebuild (cold miss after API restart).
  const leanRows = await fetchLeanPublicVenueRows(take, {
    leanText: false,
    skipEventCounts: shell,
  });
  const venueIds = leanRows.map((row) => row.id);
  const missingHeroIds = shell
    ? []
    : leanRows.filter((row) => !pickRealPublicImageUrl(row.heroImageUrl)).map((row) => row.id);
  const [facets, heroImageFallbacks] = await Promise.all([
    shell
      ? Promise.resolve({ waterCounts: new Map(), busCounts: new Map() })
      : fetchVenueEventFacetCounts(venueIds),
    shell ? Promise.resolve(new Map()) : fetchVenueHeroImageFallbacks(missingHeroIds),
  ]);
  const enriched = applyVenueEventFacetCounts(leanRows, facets).map((row) => {
    const mapped = {
      ...row,
      name: formatPublicVenueTitle(row.name || row.title),
      heroImageUrl: resolveVenueHeroImageUrl(row, heroImageFallbacks),
      nextSessionStartsAt: null,
    };
    mapped.city = resolvePublicVenueCity(mapped);
    return applyPublicVenueNormalization(mapped);
  });
  return mergePublicVenueHubRows(enriched.filter((row) => isPublicVenueHub(row, options)));
}

function schedulePublicVenueHubRebuild(cacheKey, take, options = {}) {
  const inflight = publicVenueHubBuilds.get(cacheKey);
  if (inflight) return inflight;

  const build = rebuildPublicVenueHubRows(take, options)
    .then((merged) => {
      const builtAt = Date.now();
      const entry = {
        cacheKey,
        expiresAt: builtAt + PUBLIC_CATALOG_CACHE_MS,
        staleUntil: builtAt + PUBLIC_VENUE_HUB_STALE_MS,
        rows: merged,
        shell: options.shell === true,
      };
      publicVenueHubCaches.set(cacheKey, entry);
      publicVenueHubCache = entry;
      // Keep family lists in sync with full hub (requireEvents:false path used by /locations).
      if (!options.shell && (options.requireEvents === false || !publicVenueCatalogLists)) {
        publicVenueCatalogLists = {
          expiresAt: builtAt + PUBLIC_CATALOG_CACHE_MS,
          staleUntil: builtAt + PUBLIC_VENUE_HUB_STALE_MS,
          institution: [],
          location: [],
        };
        for (const row of merged) {
          const item = mapPublicVenueListItem(row);
          if (item.template === 'institution') publicVenueCatalogLists.institution.push(item);
          else publicVenueCatalogLists.location.push(item);
        }
      }
      return merged;
    })
    .finally(() => {
      if (publicVenueHubBuilds.get(cacheKey) === build) publicVenueHubBuilds.delete(cacheKey);
    });

  publicVenueHubBuilds.set(cacheKey, build);
  return build;
}

function venueHubCacheBaseKey(take, options = {}) {
  return `${take}:${options.requireEvents === false ? 'all' : 'hub'}`;
}

/**
 * Soft rows without awaiting cold SQL.
 * Shell may reuse full OR shell; full must not reuse shell (events would be 0).
 */
function findSoftVenueHubRows(take, options = {}) {
  const base = venueHubCacheBaseKey(take, options);
  const shell = options.shell === true;
  const keys = shell ? [base, `${base}:shell`] : [base];
  for (const key of keys) {
    const cached = publicVenueHubCaches.get(key);
    if (cached?.rows?.length) return { key, cached };
  }
  return null;
}

export async function publicVenueHubRows(db, limit = 500, options = {}) {
  const now = Date.now();
  const take = Math.max(1, Math.min(Number(limit) || 500, 10000));
  const shell = options.shell === true;
  const baseKey = venueHubCacheBaseKey(take, options);
  const cacheKey = `${baseKey}${shell ? ':shell' : ''}`;
  const cached = publicVenueHubCaches.get(cacheKey) || null;

  if (cached?.rows?.length && cached.expiresAt > now) {
    return cached.rows;
  }

  // Prefer a warm FULL hub over building a shell (already has accurate event≠slots counts).
  if (shell) {
    const full = publicVenueHubCaches.get(baseKey) || null;
    if (full?.rows?.length && full.expiresAt > now) {
      return full.rows;
    }
  }

  // Forever soft-SWR: any previous eligible hub beats a 15-30s cold rebuild on the request path.
  // Critical for /venues «Показать ещё»: Next ISR can paint page-1 while API hub is empty after
  // restart - but once shell/full exists (even soft-expired), page-2 must not wait on lean SQL.
  const soft = findSoftVenueHubRows(take, options);
  if (soft?.cached?.rows?.length) {
    void schedulePublicVenueHubRebuild(cacheKey, take, options);
    return soft.cached.rows;
  }

  const rows = await schedulePublicVenueHubRebuild(cacheKey, take, options);
  return rows;
}

const PUBLIC_VENUE_ROW_SELECT = `
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
    city.id as "cityId",
    city.title as city,
    city.slug as "citySlug",
    region.slug as "regionSlug",
    region.title as "regionTitle"
  from "Venue" venue
  left join "City" city on city.id = venue."cityId"
  left join "Region" region on region.id = city."regionId"
`;

async function resolvePublicVenueRow(db, venueSlugOrId) {
  const value = String(venueSlugOrId || '').trim();
  if (!value) return null;

  const candidates = new Set([value]);
  try {
    candidates.add(decodeURIComponent(value));
  } catch {
    // ignore malformed URI sequences
  }
  candidates.add(publicCitySlug(value));
  candidates.add(stripOpaqueVenueIdSuffix(publicCitySlug(value)));
  for (const candidate of [...candidates]) {
    const result = await db.query(`${PUBLIC_VENUE_ROW_SELECT} where venue.slug = $1 or venue.id = $1 limit 1`, [candidate]);
    if (result.rows[0]) return result.rows[0];
  }

  const suffix = extractOpaqueIdSuffix(value);
  if (suffix) {
    const suffixResult = await db.query(`${PUBLIC_VENUE_ROW_SELECT} where venue.id = $1 or venue.id = $2 limit 1`, [`venue_${suffix}`, suffix]);
    if (suffixResult.rows[0]) return suffixResult.rows[0];
  }

  return resolvePublicVenueRowByComputedSlug(db, value);
}

function normalizePublicVenueSlugKey(value) {
  return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(publicCitySlug(value) || value));
}

async function resolvePublicVenueRowByComputedSlug(db, requestedSlug) {
  const normalized = normalizePublicVenueSlugKey(requestedSlug);
  if (!normalized) return null;

  const numericSuffix = normalized.match(/-(\d+)$/);
  if (numericSuffix) {
    for (const venueId of [`venue_tep_${numericSuffix[1]}`, `venue_${numericSuffix[1]}`]) {
      const result = await db.query(`${PUBLIC_VENUE_ROW_SELECT} where venue.id = $1 limit 1`, [venueId]);
      const row = result.rows[0];
      if (row && publicVenueSlug(row.slug, row.title, row.id) === normalized) return row;
    }
  }

  const prefixResult = await db.query(
    `${PUBLIC_VENUE_ROW_SELECT}
     where venue.slug = $1
        or venue.slug like $2
     order by length(venue.slug) asc
     limit 24`,
    [normalized, `${normalized}-%`],
  );
  for (const row of prefixResult.rows) {
    if (publicVenueSlug(row.slug, row.title, row.id) === normalized) return row;
  }

  const cyrillicResult = await db.query(
    `${PUBLIC_VENUE_ROW_SELECT} where venue.slug ~ '[А-Яа-яЁё]' order by venue."updatedAt" desc nulls last limit 1200`,
  );
  for (const row of cyrillicResult.rows) {
    if (publicVenueSlug(row.slug, row.title, row.id) === normalized) return row;
  }

  return null;
}

function cleanImportedDescription(value) {
  if (value == null) return null;
  const text = String(value)
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
  return text ? text : null;
}

function isWeakVenueLeadText(value) {
  const text = String(cleanImportedDescription(value) || '').trim();
  if (!text) return true;
  if (text.length < 24) return true;
  if (/^(легенда|описание|текст|n\/a|нет|—|-)$/i.test(text)) return true;
  return false;
}

function pickPublicVenueDescriptionText(shortDescription, description) {
  const full = cleanImportedDescription(description);
  if (full) return full;
  const short = cleanImportedDescription(shortDescription);
  if (short && !isWeakVenueLeadText(short)) return short;
  return null;
}

function truncateVenueLeadText(text, maxLength = 220) {
  const value = String(text || '').trim();
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, maxLength - 1).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = lastSpace > Math.floor(maxLength * 0.55) ? slice.slice(0, lastSpace) : slice;
  return `${clipped}...`;
}

function pickPublicVenueLeadText(shortDescription, description) {
  const full = cleanImportedDescription(description);
  const short = cleanImportedDescription(shortDescription);
  if (short && !isWeakVenueLeadText(short)) return short;
  if (!full) return null;
  return truncateVenueLeadText(full);
}

async function venueRows(db, limit, options = {}) {
  const lean = Boolean(options.lean);
  const result = await db.query(
    `
      select
        venue.id,
        venue.slug,
        venue.title as name,
        ${lean ? 'null::text as "shortDescription",' : 'venue."shortDescription",'}
        ${lean ? 'null::text as description,' : 'venue.description,'}
        venue."heroImageUrl",
        city.title as city,
        venue.address,
        venue.kind,
        venue."pageStatus",
        count(event.id)::int as events,
        count(event.id) filter (where ${PUBLIC_WATER_EVENT_SQL})::int as "waterEvents"
      from "Venue" venue
      left join "City" city on city.id = venue."cityId"
      left join "Event" event on event."venueId" = venue.id
      left join "Category" cat on cat.id = event."categoryId"
      left join "Subcategory" sub on sub.id = event."primarySubcategoryId"
      group by venue.id, city.title
      order by events desc, venue.title asc
      limit $1
    `,
    [limit],
  );

  return result.rows.map((row) => {
    const name = formatPublicVenueTitle(row.name);
    const mapped = {
      id: row.id,
      slug: row.slug,
      name,
      city: row.city || 'Не указан',
      address: row.address,
      shortDescription: row.shortDescription,
      heroImageUrl: row.heroImageUrl,
      proposedKind: String(row.kind || 'OTHER').toLowerCase(),
      kind: String(row.kind || 'OTHER').toUpperCase(),
      pageStatus: String(row.pageStatus || 'NONE').toLowerCase(),
      reason: row.pageStatus === 'CANDIDATE' ? 'кандидат на public-страницу' : 'пока только локация',
      events: row.events,
      waterEvents: row.waterEvents,
    };
    mapped.city = resolvePublicVenueCity(mapped);
    return applyPublicVenueNormalization(mapped);
  });
}

const PUBLIC_VENUE_HUB_EXCLUDED_KINDS = new Set(['MEETING_POINT', 'ONLINE']);

export const INSTITUTION_VENUE_KINDS = new Set([
  'MUSEUM_ART_SPACE',
  'MUSEUM',
  'ART_SPACE',
  'THEATER',
  'CONCERT_HALL',
  'CLUB_BAR_RESTAURANT',
  'BAR',
]);

/**
 * Public split MUSEUM_ART_SPACE → museum | art_space (crumbs + catalog ?type=).
 * DB enum остаётся MUSEUM_ART_SPACE; TODO: Prisma MUSEUM / ART_SPACE + backfill.
 */
function classifyMuseumOrArtSpace(name, address, shortDescription, description, idOrSlug) {
  const text = [name, address, shortDescription, description, idOrSlug].filter(Boolean).join(' ').toLowerCase();
  // Explicit overrides: Erarta (legacy ART_SPACE) stays art_space despite «Музей» in title.
  if (/эрарта|\berarta\b|ven_spbboats_erarta/i.test(text)) return 'art_space';
  if (/музей\s+современного\s+искусств/i.test(text)) return 'art_space';
  if (/арт[-\s]?пространств|art[-\s]?space|иммерсив|люмьер|глазунов/i.test(text)) return 'art_space';
  if (/галере/i.test(text) && !/музей|третьяков|эрмитаж|пушкинск|русск(?:ий|ого)\s+музей/i.test(text)) {
    return 'art_space';
  }
  return 'museum';
}

function finalizeMuseumArtPublicKind(kind, name, address, options = {}) {
  const key = String(kind || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (key === 'museum' || key === 'art_space') return key;
  if (key === 'museum_art_space') {
    return classifyMuseumOrArtSpace(
      name,
      address,
      options.shortDescription,
      options.description,
      [options.id, options.slug].filter(Boolean).join(' '),
    );
  }
  return key;
}

export function normalizeVenueKindValue(value) {
  return String(value || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

export function publicVenuePageTemplate(kind) {
  const normalized = normalizeVenueKindValue(kind);
  return INSTITUTION_VENUE_KINDS.has(normalized) ? 'institution' : 'location';
}

/** Drop stored canonicalPath when it points at the wrong /locations|/venues family. */
export function resolvePublicVenueCanonicalPath(storedPath, pageTemplate, slug) {
  const fallback = `/${pageTemplate === 'location' ? 'locations' : 'venues'}/${slug}`;
  const stored = String(storedPath || '').trim();
  if (!stored) return fallback;
  const normalized = stored.startsWith('/') ? stored : `/${stored}`;
  const storedFamily = normalized.startsWith('/locations/')
    ? 'location'
    : normalized.startsWith('/venues/')
      ? 'institution'
      : null;
  if (!storedFamily || storedFamily !== pageTemplate) return fallback;
  return normalized;
}

const MEETING_POINT_TEXT_RE =
  /место сбора|место встречи|точка сбора|точка встречи|площадка:|^метро\b|^м\.(?:\s|«|"|')|\bм\.\s*(?:«|[а-яё])|\bу метро\b|около метро|у памятник|памятник|\bпам\.|\bу пам\b|пл\.\s*у\s*пам/iu;

function hasMeetingPointSignals(name, address, shortDescription, description) {
  const text = `${venueNameAddressText(name, address)} ${shortDescription || ''} ${description || ''}`.toLowerCase();
  return MEETING_POINT_TEXT_RE.test(text);
}

function isMeetingPointLikeRow(row) {
  const resolved = resolvePublicVenueKindFromRow(row);
  if (resolved === 'bus') return false;
  if (resolved === 'meeting_point') return true;
  // Explicit CMS/content kinds (park/monument/museum/…) win over «памятник» title text.
  if (resolved && resolved !== 'venue' && resolved !== 'other') return false;
  if (isContentPlaceKind(row?.kind || row?.proposedKind, resolved)) return false;
  const name = `${row.name || row.title || ''} ${row.address || ''}`.toLowerCase();
  return MEETING_POINT_TEXT_RE.test(name);
}

function venueNameAddressText(name, address) {
  return `${name || ''} ${address || ''}`.toLowerCase();
}

const PUBLIC_WATER_EVENT_TEXT_RE =
  /водн|речн|теплоход|катер|яхт|корабл|судн|лодк|канал|круиз|развод.*мост|мост.*развод|прогулк/i;

const PUBLIC_WATER_EVENT_SQL = `
  (
    coalesce(cat.title, '') ~* 'водн|речн|теплоход|катер'
    or coalesce(sub.title, '') ~* 'водн|речн|теплоход|катер'
    or coalesce(event.title, '') ~* 'теплоход|катер|яхт|корабл|судн|лодк|речн|река|канал|круиз|развод.*мост|мост.*развод|прогулк'
    or exists (
      select 1
      from "EventTag" event_tag
      join "Tag" tag on tag.id = event_tag."tagId"
      where event_tag."eventId" = event.id
        and tag.title ~* 'водн|речн|теплоход|катер|яхт|корабл'
    )
    or exists (
      select 1
      from "EventOffer" event_offer
      where event_offer."eventId" = event.id
        and event_offer.active = true
        and event_offer."sourceCode"::text = 'TEPLOHOD'
    )
  )
`;

function isWaterCatalogSession(session) {
  if (!session) return false;
  if (String(session.sourceCode || '').toUpperCase().includes('TEPLOHOD')) return true;
  const text = [session.category, session.title, ...(session.tags || []), session.sourceCode].filter(Boolean).join(' ').toLowerCase();
  return PUBLIC_WATER_EVENT_TEXT_RE.test(text);
}

function hasWaterOnlyEvents(waterEvents, totalEvents) {
  const water = Number(waterEvents || 0);
  const total = Number(totalEvents || 0);
  return total > 0 && water >= total;
}

const PUBLIC_BUS_EVENT_TEXT_RE =
  /автобус|автобусн|hop[\s-]?on|hop[\s-]?off|city[\s-]?sightseeing|city[\s-]?tour|сити[\s-]?тур|двухэтажн|садись[\s-]?руляй/i;

function isBusCatalogSession(session) {
  if (!session) return false;
  const text = [session.category, session.title, ...(session.tags || []), ...(session.subcategories || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return PUBLIC_BUS_EVENT_TEXT_RE.test(text);
}

function hasBusOnlyEvents(busEvents, totalEvents) {
  const bus = Number(busEvents || 0);
  const total = Number(totalEvents || 0);
  return total > 0 && bus >= total;
}

function hasActiveBusCatalogEvents(busEvents) {
  return Number(busEvents || 0) > 0;
}

function hasBusLikeText(name, address) {
  const text = venueNameAddressText(name, address);
  // Brand boarding desks for bus tours (owner: not museums).
  if (/якарели|yakareli/i.test(text)) return true;
  if (
    /автобус|bus[\s-]?stop|авт\.?\s*остан|автобусн(?:ая|ой)?\s+останов|остановк.*автобус|hop[\s-]?on|hop[\s-]?off|city[\s-]?sightseeing|city[\s-]?tour|сити[\s-]?тур|двухэтажн|маршрут.*автобус|садись[\s-]?руляй|^автобус$/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/\bсектор\s*[«"'][A-ZBCАВСЕ]/i.test(text)) {
    if (/причал|пристань|набереж|речн|канал|фонтанк|мойк|нев|мост|устьин|китай/i.test(text)) return false;
    return true;
  }
  return false;
}

function isTransportVehicleVenueName(name) {
  const text = String(name || '').trim();
  if (!text) return false;
  if (/^yutong\b|^маз\b|^паз\b|^hyundai\b|^mercedes\b|^volvo\b|^man\b|^ikarus\b/i.test(text)) return true;
  // Fleet-style single token + digits ("Yutong 1234", "МАЗ123"). Multi-word titles with a year
  // ("Модная среда 1823") must NOT match - they are real venues, not bus fleet labels.
  if (/^[a-zа-яё][a-zа-яё-]{0,20}\s?\d{3,5}$/i.test(text) && text.length <= 28) return true;
  return false;
}

function isJunkPublicVenueRow(row) {
  const name = String(row?.name || row?.title || '').trim();
  const address = String(row?.address || '').trim();
  const text = venueNameAddressText(name, address);

  const storedKind = normalizeVenueKindValue(row?.kind || row?.proposedKind);
  // Institution venues (clubs/halls/museums) are never "bus fleet" junk even if title ends with digits.
  if (isTransportVehicleVenueName(name) && !INSTITUTION_VENUE_KINDS.has(storedKind)) return true;
  if (/^на парковке\b|парковк.*турист|турист.*транспорт|парковка.*(?:трц|торгов|молл)/i.test(text)) {
    if (Number(row?.busEvents || 0) <= 0) return true;
  }
  if (/^wc\b|^туалет\b|^кондиционер\b/i.test(name)) return true;

  const resolved = resolvePublicVenueKindFromRow(row);
  if (resolved === 'meeting_point' && !hasActiveBusCatalogEvents(row?.busEvents)) return true;

  return false;
}

function buildActiveVenueEventCounts(sessions) {
  const activeCounts = new Map();
  const waterCounts = new Map();
  const busCounts = new Map();
  const heroImageFallbacks = new Map();
  const nextSessionStartsAt = new Map();
  const seen = new Map();
  const now = Date.now();

  for (const session of sessions || []) {
    if (!session?.venueId) continue;
    if (!seen.has(session.venueId)) seen.set(session.venueId, new Set());
    const keys = seen.get(session.venueId);
    const key = session.groupKey || session.id;
    if (!key || keys.has(key)) continue;
    keys.add(key);
    activeCounts.set(session.venueId, (activeCounts.get(session.venueId) || 0) + 1);
    if (isWaterCatalogSession(session)) {
      waterCounts.set(session.venueId, (waterCounts.get(session.venueId) || 0) + 1);
    }
    if (isBusCatalogSession(session)) {
      busCounts.set(session.venueId, (busCounts.get(session.venueId) || 0) + 1);
    }
    if (!heroImageFallbacks.has(session.venueId)) {
      const imageUrl = pickRealPublicImageUrl(session.imageUrl);
      if (imageUrl) heroImageFallbacks.set(session.venueId, imageUrl);
    }
    if (session.startsAt) {
      const at = parseSessionStartsAt(session.startsAt).getTime();
      if (Number.isFinite(at) && at >= now - 30 * 60 * 1000) {
        const previous = nextSessionStartsAt.get(session.venueId);
        if (!previous || at < previous) nextSessionStartsAt.set(session.venueId, session.startsAt);
      }
    }
  }

  return { activeCounts, waterCounts, busCounts, heroImageFallbacks, nextSessionStartsAt };
}

function pickRealPublicImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (url.startsWith('/images/cities/')) return null;
  if (/placeholder\.gif/i.test(url)) return null;
  if (/^https?:\/\//i.test(url)) return url;
  // Local TC overrides + generated covers (Sortavala etc.) - not city placeholders.
  if (/^\/images\/(events|venues)\//i.test(url)) return url;
  return null;
}

function resolveVenueHeroImageUrl(row, heroImageFallbacks = null) {
  const stored = pickRealPublicImageUrl(row?.heroImageUrl);
  if (stored) return stored;

  const venueIds = row?.mergedVenueIds || (row?.id ? [row.id] : []);
  for (const venueId of venueIds) {
    const fallback = heroImageFallbacks?.get(venueId);
    if (fallback) return fallback;
  }

  return row?.heroImageUrl || null;
}

function hasStrongPierLocationText(name, address) {
  const text = venueNameAddressText(name, address);
  if (/смотров(?:ая|ой|ую|ые)\s+площадк/i.test(text)) return false;
  if (/пассажирск(?:ий|ого|ая|ые)\s+терминал/i.test(text)) return true;
  if (/морск(?:ой|ого|ая|ые)\s+вокзал/i.test(text)) return true;
  if (/речн(?:ой|ая|ого|ые)?\s+(?:вокзал|порт)/i.test(text)) return true;
  if (/причал|пристань/i.test(text)) return true;
  if (/набереж/i.test(text) && /(?:терминал|вокзал|порт)/i.test(text)) return true;
  return false;
}

function hasPierLikeText(name, address) {
  return hasStrongPierLocationText(name, address);
}

/** Собор / церковь / монастырь / мечеть - public kind `temple` (чип «Храмы»). */
function isTempleLikeVenueName(name) {
  return /(?:собор|церков|храм|монастыр|мечет|синагог|кирх|часовн|костел|\bлавр[аы]\b)/iu.test(
    String(name || ''),
  );
}

function isViewingPlatformLikeVenue(name, address, shortDescription, description) {
  const text = [name, address, shortDescription, description].filter(Boolean).join(' ');
  return /смотров(?:ая|ой|ую|ые)\s+площадк|smotrovaya|viewing platform|observation deck/i.test(text);
}

function isBarLikeFromText(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  if (/(?:^|[\s«"'(\[]|-)(?:бар|паб)(?:[\s"'»)\],!.]|$)/u.test(t)) return true;
  if (/\bpub\b|(?:^|[\s-])bar(?:[\s.-]|$)|-bar\b|\bbar\b|barrock|music\s*bar|lounge[\s-]?bar|bar$/iu.test(t)) return true;
  if (/концертный бар|рок-бар|коктейльн(?:ый|ого) бар|музыкальн(?:ый|ого) бар|ночной бар/iu.test(t)) return true;
  return false;
}

function isClubRestaurantLikeFromText(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t || isBarLikeFromText(t)) return false;
  if (
    /ресторан|кафе|гастроном|пивной ресторан|ресторан-клуб|музыкальн(?:ый|ого) ресторан|баварск|грузинск|хачапури|хинкали|гостеприимств|oktoberfest|пивоварен/iu.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /ночной клуб|музыкальн(?:ый|ого) клуб|концертный клуб|клубный ресторан|арт-пространств[^\n]{0,48}клуб|клуб[^\n]{0,24}арт-пространств|(?:^|[\s«"'(\[]|-)(?:клуб)(?:[\s"'»)\],!.]|$)/u.test(
      t,
    )
  ) {
    return true;
  }
  return /\bclub\b/i.test(t) && !/concert hall|concert-hall/i.test(t);
}

function inferBarOrClubFromContent(name, address, shortDescription, description) {
  const content = [name, address, shortDescription, description].filter(Boolean).join(' ');
  if (isBarLikeVenue(name, address) || isBarLikeFromText(content)) return 'bar';
  if (isClubRestaurantLikeFromText(content)) return 'club_bar_restaurant';
  return null;
}

function isBarLikeVenue(name, address) {
  const nameText = String(name || '').trim().toLowerCase();
  if (!nameText) return false;
  if (/(?:^|[\s«"'(\[]|-)(?:бар|паб)(?:[\s"'»)\],!.]|$)/u.test(nameText)) return true;
  return /\bpub\b|(?:^|[\s-])bar(?:[\s.-]|$)|-bar\b|\bbar\b|barrock|music\s*bar|lounge[\s-]?bar|bar$/iu.test(nameText);
}

function inferPublicVenueKindFromName(name, address) {
  const text = venueNameAddressText(name, address);
  if (MEETING_POINT_TEXT_RE.test(text)) return 'meeting_point';
  if (/смотров(?:ая|ой|ую|ые)\s+площадк/i.test(text)) return 'museum';
  // Named loft / event space must not become pier just because address is on an embankment.
  if (/(?:^|[\s«"'(])лофт(?:[\s"'»),!.]|$)|(?:^|[\s-])loft(?:[\s.-]|$)|лофт[-\s]?проект/i.test(text)) {
    return 'venue';
  }
  if (hasBusLikeText(name, address)) return 'bus';
  if (hasStrongPierLocationText(name, address)) return 'pier';
  if (/турбаз|база отдыха|глэмпинг/i.test(text)) return 'outdoor_location';
  if (/театр|teatr/i.test(text)) return 'theater';
  if (/музей|галере|выстав|арт[-\s]?пространств|art[-\s]?space|иммерсив/i.test(text)) {
    return classifyMuseumOrArtSpace(name, address, null, null);
  }
  if (isBarLikeVenue(name, address)) return 'bar';
  if (/банкет|\bзал\b|hall|концерт|филармони|дворец/i.test(text)) return 'concert_hall';
  if (/клуб|\bclub\b|ресторан|кафе/i.test(text)) return 'club_bar_restaurant';
  if (/стадион|арена|спорт|каток/i.test(text)) return 'sport_activity_space';
  // «парк» / сквер → park; не путать с парковкой. Платный вход (Монрепо) - later, не catalog mix.
  if (/\bпарк\b|сквер/i.test(text) && !/парковк/i.test(text)) return 'park';
  return 'venue';
}

function canonicalStoredVenueKind(storedKind) {
  const stored = normalizeVenueKindValue(storedKind).toLowerCase();
  if (stored === 'pier_water' || stored === 'pier') return 'pier';
  return stored;
}

export function resolvePublicVenueKind(storedKind, name, address, options = {}) {
  const stored = canonicalStoredVenueKind(storedKind);
  const inferred = inferPublicVenueKindFromName(name, address);
  const { id, slug, shortDescription, description, waterEvents = 0, busEvents = 0, totalEvents = 0 } = options;
  const text = venueNameAddressText(name, address);
  const busByAllEvents =
    hasBusOnlyEvents(busEvents, totalEvents) && !/teplohod|теплоход|причал|пристань/i.test(text);
  const busByCatalogEvents = hasActiveBusCatalogEvents(busEvents);
  // River port / pier CMS rows must not become «bus» because one sibling session is tagged
  // «Автобусные экскурсии» (Казань, Девятаева / речной порт).
  const pierProtected =
    stored === 'pier' ||
    inferred === 'pier' ||
    hasStrongPierLocationText(name, address);

  if (
    !pierProtected &&
    (inferred === 'bus' || hasBusLikeText(name, address) || busByAllEvents || busByCatalogEvents)
  ) {
    return 'bus';
  }

  // Explicit CMS/content kinds win over «памятник» / набережная / пивоварня heuristics (must-see).
  // Institution kinds also win over water-only catalog heuristics (false «прогулка/судно» matches
  // must not turn concert halls / clubs into pier pages).
  if (stored === 'park') return 'park';
  if (stored === 'monument') return 'monument';
  // Соборы / церкви / монастыри: отдельный public kind для чипа «Храмы» на /places.
  if (
    (stored === 'attraction' || stored === 'outdoor_location' || stored === 'temple') &&
    isTempleLikeVenueName(name)
  ) {
    return 'temple';
  }
  if (stored === 'outdoor_location') return 'outdoor_location';
  if (stored === 'attraction') return 'attraction';
  if (stored === 'temple') return 'temple';
  if (stored === 'gastro') return 'gastro';
  if (stored === 'theater') return 'theater';
  if (stored === 'museum_art_space' || stored === 'museum' || stored === 'art_space') {
    return finalizeMuseumArtPublicKind(stored, name, address, { id, slug, shortDescription, description });
  }

  const storedInstitution = INSTITUTION_VENUE_KINDS.has(normalizeVenueKindValue(storedKind));
  if (storedInstitution && stored !== 'pier') {
    // Named loft / concert hall on an embankment stays institution even with waterish sessions.
    return finalizeMuseumArtPublicKind(stored, name, address, { id, slug, shortDescription, description });
  }

  if (
    inferred === 'meeting_point' ||
    stored === 'meeting_point' ||
    hasMeetingPointSignals(name, address, shortDescription, description)
  ) {
    return 'meeting_point';
  }

  if (inferred === 'park') return 'park';

  const barOrClub = inferBarOrClubFromContent(name, address, shortDescription, description);
  if (barOrClub) return barOrClub;

  if (isViewingPlatformLikeVenue(name, address, shortDescription, description)) {
    return 'museum';
  }

  // Water-only catalog events are not enough: bus transfer points (пл. Восстания etc.)
  // often sell Ladoga/boat tickets while the physical stop is still a boarding point.
  // Explicit VENUE/loft CMS kind wins over embankment address heuristics (Высота 21 etc.).
  const nameOnly = String(name || '');
  const storedVenueNotPier =
    (stored === 'venue' || stored === 'other' || inferred === 'venue') &&
    !/причал|пристань/i.test(nameOnly);
  if (
    !storedVenueNotPier &&
    (stored === 'pier' ||
      hasStrongPierLocationText(name, address) ||
      hasPierLikeText(name, address) ||
      inferred === 'pier' ||
      (hasWaterOnlyEvents(waterEvents, totalEvents) &&
        !isViewingPlatformLikeVenue(name, address, shortDescription, description) &&
        stored !== 'meeting_point' &&
        !/\bпл\.|\bплощад|\bметро\b|\bм\.\s|вокзал|место посадки|точка сбора/i.test(text)))
  ) {
    return 'pier';
  }

  if (INSTITUTION_VENUE_KINDS.has(normalizeVenueKindValue(storedKind))) {
    return finalizeMuseumArtPublicKind(stored, name, address, { id, slug, shortDescription, description });
  }

  if (stored === 'other' || stored === 'venue') {
    return finalizeMuseumArtPublicKind(inferred, name, address, { id, slug, shortDescription, description });
  }

  if (stored === 'theater' && inferred !== 'theater') {
    return finalizeMuseumArtPublicKind(inferred, name, address, { id, slug, shortDescription, description });
  }

  return finalizeMuseumArtPublicKind(stored, name, address, { id, slug, shortDescription, description });
}

function resolveForcedPublicVenueKind(override) {
  const raw = String(override?.publicKind || override?.publicType || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw === 'pier_water') return 'pier';
  if (raw === 'museum_art' || raw === 'museum_art_space') return 'museum';
  return raw;
}

function resolvePublicVenueKindFromRow(row) {
  const override = findVenueOverride({
    id: row.id,
    title: row.name || row.title,
    name: row.name || row.title,
    slug: row.slug,
  });
  const forced = resolveForcedPublicVenueKind(override);
  if (forced) return forced;
  const storedKind = override?.kind || row.kind || row.proposedKind;
  return resolvePublicVenueKind(storedKind, row.name || row.title, row.address, {
    id: row.id,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    waterEvents: Number(row.waterEvents || 0),
    busEvents: Number(row.busEvents || 0),
    totalEvents: Number(row.events || 0),
  });
}

export function isPublicVenueHub(row, options = {}) {
  const requireEvents = options.requireEvents !== false;
  if (!row) return false;
  const kind = normalizeVenueKindValue(row.kind || row.proposedKind);
  const resolvedKind = resolvePublicVenueKindFromRow(row);
  if (PUBLIC_VENUE_HUB_EXCLUDED_KINDS.has(kind)) {
    // Bus boarding points are stored as MEETING_POINT; allow when resolved public type is bus
    // (catalog bus events OR editorial publicKind override), not only busEvents > 0.
    if (!(kind === 'MEETING_POINT' && (hasActiveBusCatalogEvents(row.busEvents) || resolvedKind === 'bus'))) {
      return false;
    }
  }
  if (isMeetingPointLikeRow(row)) return false;
  if (isJunkPublicVenueRow(row)) return false;
  if (String(row.pageStatus || '').toUpperCase() === 'HIDDEN') return false;
  if (requireEvents && Number(row.events) <= 0) {
    // Must-see content places (park/monument/museum/…) list in /venues|/locations with profile, 0 events ok.
    return isContentPlaceHubEligible(row, resolvedKind);
  }
  return true;
}

function applyPublicVenueDisplayName(row, type) {
  const name = row.name || row.title;
  if (type === 'bus') return formatBusLocationDisplayName(name, row.address, row.city);
  if (type === 'pier') return formatPierLocationDisplayName(name, row.address, row.city);
  return name;
}

/** Catalog first paint / page size (24–48 band). */
const VENUE_CATALOG_PAGE_DEFAULT = 36;
const VENUE_CATALOG_PAGE_MAX = 100;
const VENUE_CATALOG_PAGE_INDEX_MAX = 10_000;
/** Explicit dump requests (DayRoute) - not used as catalog universe cap. */
const VENUE_CATALOG_DUMP_MAX = 2000;
/**
 * Hub universe for /venues|/locations list+stats.
 * Former `take(500)` / `wideHub ? 2000 : 500` made hero + kind chips stuck at exactly 500.
 */
const VENUE_CATALOG_HUB_MAX = 10000;

const MUSEUM_SCALE_KINDS = new Set(['museum', 'art_space', 'museum_art_space']);
const LARGE_HALL_KINDS = new Set(['theater', 'concert_hall']);
const INTIMATE_KINDS = new Set(['bar', 'club_bar_restaurant']);
const LARGE_HALL_NAME_RE =
  /\b(большой|марийский|новат|оперн|балет|филармон|консерватор|дворец\s+спорт|ледовый|арена|стадион)\b/iu;
const INTIMATE_NAME_RE = /\b(камерн|лофт|клуб|бар|рюмочн|speakeasy|спикизи|галере)\b/iu;
const PIER_LOGISTICS_KINDS = new Set(['pier', 'pier_water']);
const BUS_LOGISTICS_KINDS = new Set(['bus']);
const WALKING_LOGISTICS_KINDS = new Set([
  'park',
  'monument',
  'outdoor_location',
  'attraction',
  'temple',
  'gastro',
  'meeting_point',
  'sport_activity_space',
]);

function resolveInstitutionScaleFromKind(type, name) {
  if (MUSEUM_SCALE_KINDS.has(type)) return 'museum';
  if (LARGE_HALL_KINDS.has(type)) return 'large_hall';
  if (INTIMATE_KINDS.has(type)) return 'intimate';
  const text = String(name || '');
  if (LARGE_HALL_NAME_RE.test(text)) return 'large_hall';
  if (INTIMATE_NAME_RE.test(text)) return 'intimate';
  return 'other';
}

function resolveLocationLogisticsFromKind(type, name) {
  if (PIER_LOGISTICS_KINDS.has(type)) return 'pier';
  if (BUS_LOGISTICS_KINDS.has(type)) return 'bus';
  if (WALKING_LOGISTICS_KINDS.has(type)) return 'walking';
  const text = String(name || '').toLowerCase();
  if (/причал|пристань|дебаркадер|набережн/.test(text)) return 'pier';
  if (/автобус|автовокзал|место посадки/.test(text)) return 'bus';
  if (/пешеход|прогулк|двор|улица|площад|парк|сквер/.test(text)) return 'walking';
  return 'other';
}

function encodeVenueCatalogCursor(slug) {
  const value = String(slug || '').trim();
  if (!value) return null;
  return Buffer.from(JSON.stringify({ s: value }), 'utf8').toString('base64url');
}

function decodeVenueCatalogCursor(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const slug = String(parsed?.s || '').trim();
    return slug || null;
  } catch {
    return null;
  }
}

function catalogPopularity(item) {
  return Math.max(Number(item.events) || 0, Number(item.stopEventCount) || 0);
}

function sortVenueCatalogItems(items, sortMode) {
  const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru');
  const byPopularity = (a, b) => catalogPopularity(b) - catalogPopularity(a) || byName(a, b);
  if (sortMode === 'mixed') {
    const institutions = items.filter((item) => item.template === 'institution').sort(byPopularity);
    const locations = items.filter((item) => item.template !== 'institution').sort(byPopularity);
    const mixed = [];
    const n = Math.max(institutions.length, locations.length);
    for (let i = 0; i < n; i += 1) {
      if (institutions[i]) mixed.push(institutions[i]);
      if (locations[i]) mixed.push(locations[i]);
    }
    return mixed;
  }
  const mode = sortMode === 'asc' || sortMode === 'desc' ? sortMode : 'events';
  return [...items].sort((a, b) => {
    if (mode === 'events') return byPopularity(a, b);
    const cmp = byName(a, b);
    return mode === 'asc' ? cmp : -cmp;
  });
}

function paginateVenueCatalogItems(items, { cursor, limit, page: pageIndex }) {
  const decoded = decodeVenueCatalogCursor(cursor);
  let start = 0;
  // Cursor wins when both are present (legacy infinite-scroll clients).
  if (decoded) {
    const idx = items.findIndex((item) => String(item.slug || '') === decoded);
    start = idx >= 0 ? idx + 1 : items.length;
  } else if (pageIndex > 1) {
    start = (pageIndex - 1) * limit;
  }
  const page = items.slice(start, start + limit);
  const last = page[page.length - 1];
  const hasMore = start + page.length < items.length;
  const currentPage = limit > 0 ? Math.floor(start / limit) + 1 : 1;
  return {
    page,
    pageIndex: currentPage,
    hasMore,
    nextCursor: hasMore && last?.slug ? encodeVenueCatalogCursor(last.slug) : null,
  };
}

export function mapPublicVenueListItem(row) {
  const normalized = applyPublicVenueNormalization(row);
  const type = resolvePublicVenueKindFromRow(normalized);
  const name = applyPublicVenueDisplayName(normalized, type);
  const shortDescription = pickPublicVenueLeadText(normalized.shortDescription, normalized.description);
  // Same resolver as venue detail page (overrides / embedded slug coords / pier water offset).
  const coords = resolvePublicVenueCoordinates(normalized, { resolvedType: type });
  const cityId = normalizeNullableString(normalized.cityId) || null;
  const citySlug =
    normalizeNullableString(normalized.citySlug) ||
    (normalized.city && normalized.city !== 'Не указан' ? publicCitySlug(normalized.city) : null);
  // Lean list DTO: no sessions / mini-affiche / empty categories blob.
  return {
    id: normalized.id,
    slug: publicVenueSlug(normalized.slug, name, normalized.id),
    name,
    city: normalized.city,
    cityId,
    citySlug,
    address: normalized.address,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    metroStation: normalizeNullableString(normalized.metroStation),
    wayToFind: normalizeNullableString(normalized.wayToFind),
    hookFact: normalizeNullableString(normalized.hookFact),
    type,
    template: publicVenuePageTemplate(type),
    pageStatus: normalized.pageStatus,
    shortDescription,
    heroImageUrl: normalized.heroImageUrl,
    events: normalized.events,
    stopEventCount: Number.isFinite(Number(normalized.stopEventCount))
      ? Number(normalized.stopEventCount)
      : undefined,
    nextSlot: normalized.nextSessionStartsAt ? formatTime(normalized.nextSessionStartsAt) : null,
  };
}

function mapPublicVenuePinItem(venue) {
  const lat = Number(venue.latitude);
  const lng = Number(venue.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    latitude: lat,
    longitude: lng,
    kind: venue.type,
  };
}

function hasValidVenueCatalogCoords(venue) {
  const lat = Number(venue.latitude);
  const lng = Number(venue.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

export async function buildPublicVenuesCatalog(db, searchParams = new URLSearchParams()) {
  const mode = String(searchParams.get('mode') || 'list').trim().toLowerCase();
  const isPins = mode === 'pins';
  const hasEventsRaw = String(
    searchParams.get('hasEvents') || searchParams.get('has_events') || '',
  )
    .trim()
    .toLowerCase();
  const hasEventsFilter = hasEventsRaw === '1' || hasEventsRaw === 'true' || hasEventsRaw === 'yes';
  const sortMode = String(searchParams.get('sort') || 'events').trim().toLowerCase();
  const sortNeedsCounts = sortMode !== 'asc' && sortMode !== 'desc';
  // hasEvents / «По событиям» need real event+STOP counts; shell zeros `events` and sorts as A-Я.
  const shellCounts =
    !isPins &&
    !hasEventsFilter &&
    !sortNeedsCounts &&
    (searchParams.get('counts') === '0' ||
      searchParams.get('phase') === 'shell' ||
      searchParams.get('shell') === '1');
  const requestedLimit = Number(searchParams.get('limit'));
  const listLimitMax =
    Number.isFinite(requestedLimit) && requestedLimit > VENUE_CATALOG_PAGE_MAX
      ? VENUE_CATALOG_DUMP_MAX
      : VENUE_CATALOG_PAGE_MAX;
  const limit = isPins
    ? clampNumber(searchParams.get('limit'), 1, VENUE_CATALOG_HUB_MAX, VENUE_CATALOG_HUB_MAX)
    : clampNumber(searchParams.get('limit'), 1, listLimitMax, VENUE_CATALOG_PAGE_DEFAULT);
  const cursorRaw = String(searchParams.get('cursor') || '').trim();
  const pageIndex = clampNumber(searchParams.get('page'), 1, VENUE_CATALOG_PAGE_INDEX_MAX, 1);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const typeFilter = String(searchParams.get('type') || '').trim().toLowerCase();
  const familyRaw = String(searchParams.get('family') || '').trim().toLowerCase();
  const familyFilter = familyRaw === 'institution' || familyRaw === 'location' ? familyRaw : '';
  const scaleFilter = String(searchParams.get('scale') || '').trim().toLowerCase();
  const logisticsFilter = String(searchParams.get('logistics') || '').trim().toLowerCase();

  const buildEnvelope = (filteredItems, pageItems, nextCursor, hasMore, facetSource, countsPending, envelopePage) => {
    const citySource = facetSource?.cityUniverse || filteredItems;
    const typeSource = facetSource?.typeUniverse || filteredItems;
    const scaleSource = facetSource?.scaleUniverse || filteredItems;
    const cities = countBy(citySource.map((venue) => venue.city).filter(Boolean));
    const types = countBy(typeSource.map((venue) => venue.type).filter(Boolean));
    const scales = countBy(
      scaleSource
        .filter((venue) => venue.template === 'institution')
        .map((venue) => resolveInstitutionScaleFromKind(venue.type, venue.name))
        .filter((value) => value !== 'other'),
    );
    const logistics = countBy(
      scaleSource
        .filter((venue) => venue.template === 'location')
        .map((venue) => resolveLocationLogisticsFromKind(venue.type, venue.name))
        .filter((value) => value !== 'other'),
    );
    // Catalog size (incl. 0-event content places) vs afisha metrics (event≠slots).
    const catalogVenues = filteredItems.length;
    const eventsTotal = countsPending
      ? 0
      : filteredItems.reduce((sum, venue) => sum + (Number(venue.events) || 0), 0);
    const venuesWithEvents = countsPending
      ? 0
      : filteredItems.reduce((sum, venue) => sum + (Number(venue.events) > 0 ? 1 : 0), 0);
    const catalogStats = {
      venues: catalogVenues,
      venuesWithEvents,
      // Sum over filtered universe (city/type/q), not the current page of 24.
      events: eventsTotal,
      cities,
      types,
      scales,
      logistics,
    };
    if (isPins) {
      return {
        generatedAt: new Date().toISOString(),
        total: filteredItems.length,
        pins: filteredItems.map(mapPublicVenuePinItem).filter(Boolean),
        venues: [],
        nextCursor: null,
        hasMore: false,
        limit,
        page: 1,
        stats: catalogStats,
      };
    }
    return {
      generatedAt: new Date().toISOString(),
      total: filteredItems.length,
      venues: pageItems,
      nextCursor,
      hasMore,
      limit,
      page: envelopePage || 1,
      countsPending: Boolean(countsPending),
      stats: catalogStats,
    };
  };

  const applyListFilters = (items) => {
    // Facet stages mirror /venues|/locations chips: city universe → type → scale/logistics.
    let working = items;
    if (query) {
      working = working.filter((venue) =>
        [venue.name, venue.city, venue.address, venue.type, venue.wayToFind, venue.shortDescription]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      );
    }
    if (familyFilter) {
      working = working.filter((venue) => venue.template === familyFilter);
    }
    // Places «С событиями»: только площадки (institution) с афишей/билетами.
    // Локации (гастро, парки, STOP-туры) в этот фильтр не входят.
    if (hasEventsFilter) {
      working = working.filter(
        (venue) => venue.template === 'institution' && Number(venue.events) > 0,
      );
    }
    const cityUniverse = working;
    if (cityFilter) {
      working = working.filter((venue) => publicVenueRowMatchesCityFilter(venue, cityFilter));
    }
    const typeUniverse = working;
    if (typeFilter) {
      const typeSet = new Set(
        typeFilter
          .split(',')
          .map((part) => String(part || '').trim().toLowerCase())
          .filter(Boolean),
      );
      working = working.filter((venue) => typeSet.has(String(venue.type || '').toLowerCase()));
    }
    const scaleUniverse = working;
    if (scaleFilter === 'museum' || scaleFilter === 'large_hall' || scaleFilter === 'intimate') {
      working = working.filter(
        (venue) => resolveInstitutionScaleFromKind(venue.type, venue.name) === scaleFilter,
      );
    }
    if (logisticsFilter === 'pier' || logisticsFilter === 'bus' || logisticsFilter === 'walking') {
      working = working.filter(
        (venue) => resolveLocationLogisticsFromKind(venue.type, venue.name) === logisticsFilter,
      );
    }
    return { filtered: working, cityUniverse, typeUniverse, scaleUniverse };
  };

  // Do NOT short-circuit on warmVenueCatalogList: it was built from hub take(500)
  // and pinned hero/chips at exactly 500. Always load full catalog hub + paginate.

  // Full eligible hub for accurate total/stats; page size via ?page= or legacy cursor.
  // requireEvents:false keeps 0-event editorial must-see in /locations and /venues.
  // shellCounts: skip distinct product SQL on cold miss (progressive /venues city switch).
  const rows = await publicVenueHubRows(db, VENUE_CATALOG_HUB_MAX, {
    requireEvents: false,
    shell: shellCounts,
  });
  const fullWarm = publicVenueHubCaches.get(`${VENUE_CATALOG_HUB_MAX}:all`);
  // Warm full hub reused for shell request → counts already accurate (event≠slots).
  const servedFromFullHub = Boolean(fullWarm?.rows?.length && rows === fullWarm.rows);
  const countsPending = Boolean(shellCounts && !servedFromFullHub);

  let mapped = rows.map(mapPublicVenueListItem);
  const { filtered, cityUniverse, typeUniverse, scaleUniverse } = applyListFilters(mapped);
  const sorted = sortVenueCatalogItems(filtered, sortMode);
  const facetSource = { cityUniverse, typeUniverse, scaleUniverse };

  if (isPins) {
    return buildEnvelope(sorted.filter(hasValidVenueCatalogCoords), [], null, false, facetSource, false, 1);
  }

  const { page, pageIndex: resolvedPage, hasMore, nextCursor } = paginateVenueCatalogItems(sorted, {
    cursor: cursorRaw,
    limit,
    page: pageIndex,
  });
  const pageItems = countsPending
    ? page.map((item) => ({ ...item, events: 0, nextSlot: null }))
    : page;
  return buildEnvelope(sorted, pageItems, nextCursor, hasMore, facetSource, countsPending, resolvedPage);
}

/**
 * Distinct product counts for progressive /venues enrich (event≠slots).
 * Short in-memory cache: first hit after hub miss is ~0.5–1s SQL; warm <50ms.
 * @param {string[]} venueIds
 */
const venueEventCountsCache = new Map();
const VENUE_EVENT_COUNTS_CACHE_MS = 60_000;

export async function buildPublicVenueEventCounts(venueIds = []) {
  const ids = [...new Set((venueIds || []).map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 100);
  const sortedKey = ids.slice().sort().join(',');
  const now = Date.now();
  if (sortedKey) {
    const hit = venueEventCountsCache.get(sortedKey);
    if (hit && hit.expiresAt > now) {
      return { generatedAt: hit.generatedAt, counts: hit.counts, stopCounts: hit.stopCounts || {} };
    }
  }
  const [countsMap, stopCountsMap] = await Promise.all([
    fetchVenueDistinctEventCounts(ids),
    fetchVenueStopEventCounts(ids),
  ]);
  const counts = {};
  const stopCounts = {};
  for (const [id, value] of countsMap) {
    counts[id] = Number(value) || 0;
  }
  for (const [id, value] of stopCountsMap) {
    stopCounts[id] = Number(value) || 0;
  }
  const generatedAt = new Date().toISOString();
  if (sortedKey) {
    venueEventCountsCache.set(sortedKey, {
      expiresAt: now + VENUE_EVENT_COUNTS_CACHE_MS,
      generatedAt,
      counts,
      stopCounts,
    });
    // Bound map size (simple FIFO drop).
    if (venueEventCountsCache.size > 200) {
      const first = venueEventCountsCache.keys().next().value;
      if (first) venueEventCountsCache.delete(first);
    }
  }
  return {
    generatedAt,
    counts,
    stopCounts,
  };
}

function collectVenueSessionLookupContexts(venue, mergedGroup, hubRows = []) {
  const contexts = [];
  const seen = new Set();
  const add = (row) => {
    if (!row) return;
    const key = `${row.id || ''}|${row.slug || ''}|${row.name || row.title || ''}|${row.address || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    contexts.push(row);
  };

  add(venue);
  add(mergedGroup);

  const baseSlug = normalizePublicVenueSlugKey(venue?.slug || '');
  const baseName = normalizeVenueTextKey(formatPublicVenueTitle(venue?.name || venue?.title || ''));
  if (baseSlug || baseName) {
    for (const row of hubRows || []) {
      const rowSlug = normalizePublicVenueSlugKey(row?.slug || '');
      const rowName = normalizeVenueTextKey(formatPublicVenueTitle(row?.name || row?.title || ''));
      const slugHit =
        baseSlug && rowSlug && (rowSlug === baseSlug || rowSlug.startsWith(`${baseSlug}-`));
      const nameHit = venueTextKeysFuzzyMatch(baseName, rowName);
      if (slugHit || nameHit) add(row);
    }
  }
  return contexts;
}

function pierKeysForVenueContexts(venueContexts = []) {
  const keys = new Set();
  for (const context of venueContexts) {
    const pierKey = canonicalPierLocationKey(context.name || context.title, context.address);
    if (pierKey) keys.add(pierKey);
  }
  return keys;
}

function sortVenueCatalogSessions(sessions) {
  return sessions.sort((a, b) => {
    const aTime = Date.parse(a.startsAt || '') || Number.POSITIVE_INFINITY;
    const bTime = Date.parse(b.startsAt || '') || Number.POSITIVE_INFINITY;
    return aTime - bTime || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
  });
}

function lookupVenueCatalogSessions(venueIds, catalogSessions, venueContexts = []) {
  if (!venueIds?.length && !venueContexts.length) return [];

  const pierKeys = pierKeysForVenueContexts(venueContexts);
  const idSet = new Set(venueIds || []);
  const slugPrefixes = new Set();
  const nameKeys = new Set();
  for (const ctx of venueContexts || []) {
    const slug = normalizePublicVenueSlugKey(ctx?.slug || '');
    if (slug) slugPrefixes.add(slug);
    const nameKey = normalizeVenueTextKey(formatPublicVenueTitle(ctx?.name || ctx?.title || ''));
    if (nameKey.length >= MIN_FUZZY_VENUE_NAME_LEN) nameKeys.add(nameKey);
  }

  const matched = catalogSessions.filter((session) => {
    if (idSet.has(session.venueId)) return true;
    const pierKey = canonicalSessionPierKey(session);
    if (pierKey && pierKeys.has(pierKey)) return true;

    // TC often links tickets to a hall child slug (muzei-…-hogvarts-holl-…) while the
    // public card is the parent muzei-…. Match prefix / shared title so afisha returns.
    const sessionSlug = normalizePublicVenueSlugKey(session?.venueSlug || '');
    if (sessionSlug) {
      for (const prefix of slugPrefixes) {
        if (sessionSlug === prefix || sessionSlug.startsWith(`${prefix}-`)) return true;
      }
    }
    const sessionName = normalizeVenueTextKey(formatPublicVenueTitle(session?.venue || ''));
    if (sessionName) {
      for (const nameKey of nameKeys) {
        if (venueTextKeysFuzzyMatch(sessionName, nameKey)) return true;
      }
    }
    return false;
  });
  return sortVenueCatalogSessions(matched);
}

/** @visibleForTesting catalog session attach by venue id / slug / distinctive title */
export function lookupVenueCatalogSessionsForTest(venueIds, catalogSessions, venueContexts = []) {
  return lookupVenueCatalogSessions(venueIds, catalogSessions, venueContexts);
}

function sessionVenueIds(sessions) {
  return [...new Set((sessions || []).map((session) => session.venueId).filter(Boolean))];
}

function sessionVenueSlugKeys(sessions) {
  return new Set(
    (sessions || [])
      .map((session) => normalizePublicVenueSlugKey(session?.venueSlug || session?.venue || ''))
      .filter(Boolean),
  );
}

function hubRowMatchesSessionVenues(row, venueIds, venueSlugKeys) {
  const ids = row?.mergedVenueIds || (row?.id ? [row.id] : []);
  if (ids.some((id) => venueIds.has(id))) return true;
  if (!venueSlugKeys.size) return false;
  const slug = normalizePublicVenueSlugKey(publicVenueSlug(row.slug, row.name || row.title, row.id));
  return Boolean(slug && venueSlugKeys.has(slug));
}

export function publicVenuesForSessionsFromHub(sessions, hubRows, limit) {
  const venueIds = new Set(sessionVenueIds(sessions));
  const venueSlugKeys = sessionVenueSlugKeys(sessions);
  if (!venueIds.size && !venueSlugKeys.size) return [];

  const matched = [];
  const usedIds = new Set();
  for (const row of hubRows || []) {
    if (!hubRowMatchesSessionVenues(row, venueIds, venueSlugKeys)) continue;
    const ids = row.mergedVenueIds || [row.id];
    if (ids.some((id) => usedIds.has(id))) continue;
    ids.forEach((id) => usedIds.add(id));
    matched.push(row);
    if (matched.length >= limit) break;
  }
  return matched.map(mapPublicVenueListItem);
}

/**
 * City hubs must show venues from city events even when the venue is outside the
 * global top-N hub window (publicVenueHubRows limit). Murmansk "Мега Кружка" was
 * rank ~511 with hub limit 500 → events>0 but venues=0.
 */
export async function resolvePublicVenuesForSessions(db, sessions, hubRows, limit = 24) {
  const fromHub = publicVenuesForSessionsFromHub(sessions, hubRows, limit);
  if (fromHub.length >= limit) return fromHub;

  const venueIds = new Set(sessionVenueIds(sessions));
  if (!venueIds.size) return fromHub;

  const coveredIds = new Set();
  for (const row of hubRows || []) {
    if (!hubRowMatchesSessionVenues(row, venueIds, new Set())) continue;
    for (const id of row.mergedVenueIds || [row.id]) coveredIds.add(id);
  }
  for (const item of fromHub) {
    if (item?.id) coveredIds.add(item.id);
  }

  const missingIds = [...venueIds].filter((id) => !coveredIds.has(id));
  if (!missingIds.length) return fromHub;

  const { activeCounts, waterCounts, busCounts, heroImageFallbacks, nextSessionStartsAt } =
    buildActiveVenueEventCounts(sessions);
  const missingRows = (await venueRowsByIds(db, missingIds))
    .map((row) => ({
      ...row,
      events: activeCounts.get(row.id) || Number(row.events) || 0,
      waterEvents: waterCounts.get(row.id) || Number(row.waterEvents) || 0,
      busEvents: busCounts.get(row.id) || 0,
      heroImageUrl: resolveVenueHeroImageUrl(row, heroImageFallbacks),
      nextSessionStartsAt: nextSessionStartsAt.get(row.id) || null,
      mergedVenueIds: [row.id],
    }))
    .filter((row) => isPublicVenueHub(row));

  const remaining = Math.max(0, limit - fromHub.length);
  return [...fromHub, ...missingRows.slice(0, remaining).map(mapPublicVenueListItem)];
}

async function venueRowsByIds(db, ids) {
  const venueIds = [...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!venueIds.length) return [];

  const result = await db.query(
    `
      select
        venue.id,
        venue.slug,
        venue.title as name,
        venue."shortDescription",
        venue.description,
        venue."heroImageUrl",
        venue."hookFact",
        city.id as "cityId",
        city.title as city,
        city.slug as "citySlug",
        venue.address,
        venue.latitude,
        venue.longitude,
        venue.kind,
        venue."pageStatus",
        count(event.id)::int as events,
        count(event.id) filter (where ${PUBLIC_WATER_EVENT_SQL})::int as "waterEvents"
      from "Venue" venue
      left join "City" city on city.id = venue."cityId"
      left join "Event" event on event."venueId" = venue.id
      left join "Category" cat on cat.id = event."categoryId"
      left join "Subcategory" sub on sub.id = event."primarySubcategoryId"
      where venue.id = any($1::text[])
      group by venue.id, city.id, city.title, city.slug
    `,
    [venueIds],
  );

  return result.rows.map((row) => {
    const name = formatPublicVenueTitle(row.name);
    const mapped = {
      id: row.id,
      slug: row.slug,
      name,
      cityId: row.cityId || null,
      city: row.city || 'Не указан',
      citySlug: row.citySlug || null,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      shortDescription: row.shortDescription,
      hookFact: row.hookFact,
      heroImageUrl: row.heroImageUrl,
      proposedKind: String(row.kind || 'OTHER').toLowerCase(),
      kind: String(row.kind || 'OTHER').toUpperCase(),
      pageStatus: String(row.pageStatus || 'NONE').toLowerCase(),
      reason: row.pageStatus === 'CANDIDATE' ? 'кандидат на public-страницу' : 'пока только локация',
      events: row.events,
      waterEvents: row.waterEvents,
    };
    mapped.city = resolvePublicVenueCity(mapped);
    return applyPublicVenueNormalization(mapped);
  });
}

/** Home cold path: venue meta only (event counts come from catalog sessions). */
async function venueRowsByIdsLean(db, ids) {
  const venueIds = [...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!venueIds.length) return [];

  const result = await db.query(
    `
      select
        venue.id,
        venue.slug,
        venue.title as name,
        venue."shortDescription",
        venue.description,
        venue."heroImageUrl",
        venue."hookFact",
        city.id as "cityId",
        city.title as city,
        city.slug as "citySlug",
        venue.address,
        venue.latitude,
        venue.longitude,
        venue.kind,
        venue."pageStatus",
        0::int as events,
        0::int as "waterEvents"
      from "Venue" venue
      left join "City" city on city.id = venue."cityId"
      where venue.id = any($1::text[])
    `,
    [venueIds],
  );

  return result.rows.map((row) => {
    const name = formatPublicVenueTitle(row.name);
    const mapped = {
      id: row.id,
      slug: row.slug,
      name,
      cityId: row.cityId || null,
      city: row.city || 'Не указан',
      citySlug: row.citySlug || null,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      shortDescription: row.shortDescription,
      hookFact: row.hookFact,
      heroImageUrl: row.heroImageUrl,
      proposedKind: String(row.kind || 'OTHER').toLowerCase(),
      kind: String(row.kind || 'OTHER').toUpperCase(),
      pageStatus: String(row.pageStatus || 'NONE').toLowerCase(),
      reason: row.pageStatus === 'CANDIDATE' ? 'кандидат на public-страницу' : 'пока только локация',
      events: row.events,
      waterEvents: row.waterEvents,
    };
    mapped.city = resolvePublicVenueCity(mapped);
    return applyPublicVenueNormalization(mapped);
  });
}

/** Match catalog city=? against title / citySlug / canonical aliases (nizhny ↔ нижнии). */
export function publicVenueRowMatchesCityFilter(row, cityFilterRaw) {
  const cityFilter = String(cityFilterRaw || '').trim().toLowerCase();
  if (!cityFilter || cityFilter === 'all') return true;
  const filterCanon = canonicalCitySlug(cityFilter);
  const rowCityCanon = canonicalCitySlug(row?.city || '');
  const rowSlugCanon = canonicalCitySlug(row?.citySlug || '');
  if (filterCanon && (rowCityCanon === filterCanon || rowSlugCanon === filterCanon)) return true;
  if (rowCityCanon === cityFilter || rowSlugCanon === cityFilter) return true;
  const cityName = String(row?.city || '').toLowerCase();
  if (cityName.includes(cityFilter)) return true;
  // Editorial slugs are latin-prefixed (nizhny-novgorod-…); allow prefix match on filter.
  const venueSlug = String(row?.slug || '').toLowerCase();
  if (venueSlug.startsWith(`${cityFilter}-`) || (filterCanon && venueSlug.startsWith(`${filterCanon}-`))) {
    return true;
  }
  // nizhny-novgorod filter vs nizhny-novgorod-* slugs when canon is nizhniy-novgorod
  if (filterCanon === 'nizhniy-novgorod' && venueSlug.startsWith('nizhny-novgorod-')) return true;
  return false;
}

/**
 * Published/candidate content places for a city (must-see) with coords.
 * City hubs only had session venues before - editorial sights never reached day-route.
 */
export async function publicPublishedVenuesByCityId(db, cityId, limit = 200) {
  const id = String(cityId || '').trim();
  // City hubs with dense must-see (SPB ~180+) need headroom beyond old 80/120.
  const cap = Math.min(Math.max(1, Number(limit) || 200), 400);
  if (!id) return [];

  const result = await db.query(
    `
      select
        venue.id,
        venue.slug,
        venue.title as name,
        venue."shortDescription",
        venue.description,
        venue."heroImageUrl",
        venue."hookFact",
        city.id as "cityId",
        city.title as city,
        city.slug as "citySlug",
        venue.address,
        venue.latitude,
        venue.longitude,
        venue.kind,
        venue."pageStatus",
        0::int as events,
        0::int as "waterEvents"
      from "Venue" venue
      join "City" city on city.id = venue."cityId"
      where venue."cityId" = $1
        and venue."pageStatus" in ('PUBLISHED', 'CANDIDATE')
      order by
        case when venue.slug like 'nizhny-novgorod-%' then 0 else 1 end,
        case when venue.slug like 'saint-petersburg-%' or venue.slug in ('ermitazh','erarta','planetarii-1') then 0 else 1 end,
        venue.title asc
      limit $2
    `,
    [id, cap],
  );

  return result.rows
    .map((row) => {
      const name = formatPublicVenueTitle(row.name);
      const mapped = {
        id: row.id,
        slug: row.slug,
        name,
        cityId: row.cityId || null,
        city: row.city || 'Не указан',
        citySlug: row.citySlug || null,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        shortDescription: row.shortDescription,
        hookFact: row.hookFact,
        heroImageUrl: row.heroImageUrl,
        proposedKind: String(row.kind || 'OTHER').toLowerCase(),
        kind: String(row.kind || 'OTHER').toUpperCase(),
        pageStatus: String(row.pageStatus || 'NONE').toLowerCase(),
        events: 0,
        waterEvents: 0,
      };
      mapped.city = resolvePublicVenueCity(mapped);
      return applyPublicVenueNormalization(mapped);
    })
    .filter((row) => isPublicVenueHub(row, { requireEvents: false }))
    .map(mapPublicVenueListItem);
}

/** Prefer session/hub venues, then append published city content places (dedupe by id/slug). */
export function mergeCityPageVenues(sessionVenues, contentVenues, limit = 250) {
  const cap = Math.min(Math.max(1, Number(limit) || 250), 400);
  const out = [];
  const seen = new Set();
  const take = (item) => {
    if (!item || out.length >= cap) return;
    const id = String(item.id || '').trim();
    const slug = String(item.slug || '').trim().toLowerCase();
    const keys = [id, slug].filter(Boolean);
    if (!keys.length || keys.some((key) => seen.has(key))) return;
    for (const key of keys) seen.add(key);
    out.push(item);
  };
  // Content/editorial first (must-see /locations), then event venues.
  // Old order let session rows fill the cap and drop seeded must-see without tickets.
  const sessionBudget = Math.min(48, Math.max(16, Math.floor(cap * 0.2)));
  for (const item of contentVenues || []) take(item);
  let sessionTaken = 0;
  for (const item of sessionVenues || []) {
    if (sessionTaken >= sessionBudget && out.length >= Math.min(cap, (contentVenues || []).length + sessionBudget)) {
      break;
    }
    const before = out.length;
    take(item);
    if (out.length > before) sessionTaken += 1;
  }
  for (const item of sessionVenues || []) take(item);
  return out;
}

export async function publicVenues(db, limit) {
  return (await publicVenueHubRows(db, 500)).slice(0, limit).map(mapPublicVenueListItem);
}

/**
 * Home rail venues without awaiting full hub SQL (~5s cold).
 * Prefer soft hub; on true cold pick top session venues + venueRowsByIds and warm hub in background.
 */
export async function publicVenuesForHome(db, sessions, limit = 36) {
  const take = Math.max(36, Math.min(Number(limit) || 36, 36));
  const hubTake = 500;
  const hubOptions = {};
  const hubKey = venueHubCacheBaseKey(hubTake, hubOptions);

  const softHub =
    findSoftVenueHubRows(hubTake, hubOptions) ||
    findSoftVenueHubRows(VENUE_CATALOG_HUB_MAX, { requireEvents: false });
  if (softHub?.cached?.rows?.length) {
    void schedulePublicVenueHubRebuild(hubKey, hubTake, hubOptions);
    const fromHub = publicVenuesForSessionsFromHub(sessions, softHub.cached.rows, take);
    if (fromHub.length >= Math.min(12, take)) return fromHub.slice(0, take);
    if (fromHub.length) return fromHub;
    return softHub.cached.rows.slice(0, take).map(mapPublicVenueListItem);
  }

  // Cold: do not block home on lean hub rebuild; warm in background for /venues.
  void schedulePublicVenueHubRebuild(hubKey, hubTake, hubOptions);

  const { activeCounts, waterCounts, busCounts, heroImageFallbacks, nextSessionStartsAt } =
    buildActiveVenueEventCounts(sessions);
  const topIds = [...activeCounts.entries()]
    .sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))
    .slice(0, Math.max(take * 3, take))
    .map(([id]) => id);
  if (!topIds.length) return [];

  const rows = (await venueRowsByIdsLean(db, topIds))
    .map((row) => ({
      ...row,
      events: activeCounts.get(row.id) || Number(row.events) || 0,
      waterEvents: waterCounts.get(row.id) || Number(row.waterEvents) || 0,
      busEvents: busCounts.get(row.id) || 0,
      heroImageUrl: resolveVenueHeroImageUrl(row, heroImageFallbacks),
      nextSessionStartsAt: nextSessionStartsAt.get(row.id) || null,
      mergedVenueIds: [row.id],
    }))
    .filter((row) => isPublicVenueHub(row))
    .sort((left, right) => (right.events || 0) - (left.events || 0) || String(left.name || '').localeCompare(String(right.name || ''), 'ru'))
    .slice(0, take);

  return rows.map(mapPublicVenueListItem);
}

/**
 * Cultural attractions that can sit next to museums (Исаакий, Кунсткамера).
 * Bars / standup / pubs must never appear next to museum institution PDP.
 */
const CULTURAL_ATTRACTION_NAME_RE =
  /музей|собор|кунсткамер|галере|эрмитаж|дворец|храм|крепост|петропавл|исаак|фаберже|эрарта|штаб|арсенал|монастыр/iu;

function isCulturalAttractionLikeKind(kind, name) {
  const key = String(kind || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return (key === 'attraction' || key === 'monument' || key === 'temple') && CULTURAL_ATTRACTION_NAME_RE.test(String(name || ''));
}

/** @internal exported for unit tests */
export function scoreRelatedVenueCandidate(currentKind, currentName, candidateKind, candidateName, events = 0) {
  const current = String(currentKind || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const candidate = String(candidateKind || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  let score = -1;
  if (MUSEUM_SCALE_KINDS.has(current) || isCulturalAttractionLikeKind(current, currentName)) {
    if (MUSEUM_SCALE_KINDS.has(candidate)) {
      score = candidate === 'museum' || candidate === 'museum_art_space' ? 100 : 90;
    } else if (isCulturalAttractionLikeKind(candidate, candidateName)) {
      score = 70;
    }
  } else if (LARGE_HALL_KINDS.has(current)) {
    if (LARGE_HALL_KINDS.has(candidate)) score = candidate === current ? 100 : 80;
  } else if (INTIMATE_KINDS.has(current)) {
    if (INTIMATE_KINDS.has(candidate)) score = candidate === current ? 100 : 80;
  } else if (candidate === current) {
    score = 50;
  } else if (
    publicVenuePageTemplate(current) === 'institution' &&
    publicVenuePageTemplate(candidate) === 'institution' &&
    !INTIMATE_KINDS.has(candidate) &&
    !INTIMATE_KINDS.has(current)
  ) {
    // Same institution family without nightlife cross-talk (e.g. theater↔concert already covered).
    score = -1;
  }
  if (score < 0) return -1;
  return score + Math.min(20, Number(events) || 0);
}

async function publicRelatedVenues(db, venueId, city, limit, hubRows = null) {
  if (!city) return [];
  const rows = hubRows || (await publicVenueHubRows(db, 500));
  const current = findMergedVenueGroup(rows, venueId);
  const currentKind = resolvePublicVenueKindFromRow(current || {});
  const currentName = current?.name || current?.title || '';
  const currentTemplate = publicVenuePageTemplate(currentKind);
  return rows
    .filter((row) => row.city === city && isPublicVenueHub(row) && !venueGroupsOverlap(current, row))
    .map((row) => {
      const kind = resolvePublicVenueKindFromRow(row);
      const name = row.name || row.title || '';
      // Location pages keep same-template related; museums may also pull cultural attractions.
      let score = scoreRelatedVenueCandidate(currentKind, currentName, kind, name, row.events);
      if (score < 0 && currentTemplate === 'location' && publicVenuePageTemplate(kind) === 'location') {
        score = 40 + Math.min(20, Number(row.events) || 0);
      }
      return score < 0 ? null : { row, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => mapPublicVenueListItem(entry.row));
}

async function publicVenuesForCity(db, city, limit) {
  if (!city) return [];
  return (await publicVenueHubRows(db, 500))
    .filter((row) => row.city === city)
    .slice(0, limit)
    .map(mapPublicVenueListItem);
}

async function publicVenuesForSessions(db, sessions, limit) {
  const venueIds = new Set(sessions.map((session) => session.venueId).filter(Boolean));
  if (!venueIds.size) return [];
  return (await publicVenueHubRows(db, 500))
    .filter((row) => (row.mergedVenueIds || [row.id]).some((id) => venueIds.has(id)))
    .slice(0, limit)
    .map(mapPublicVenueListItem);
}

function extractOpaqueIdSuffix(value) {
  const match = String(value || '').match(/(?:^|[-_])([a-f0-9]{20,})$/i);
  return match ? match[1].toLowerCase() : null;
}

function stripOpaqueVenueIdSuffix(slug) {
  const suffix = extractOpaqueIdSuffix(slug);
  if (!suffix) return slug;
  const trimmed = String(slug || '').replace(new RegExp(`[-_]${suffix}$`, 'i'), '');
  return trimmed || slug;
}

function dedupeVenueSlugSuffix(slug) {
  const parts = String(slug || '')
    .split('-')
    .filter(Boolean);
  if (parts.length < 2) return slug;
  if (parts[parts.length - 1] === parts[parts.length - 2]) {
    return parts.slice(0, -1).join('-');
  }
  return slug;
}

function buildPublicVenueSlug(title, id) {
  const titleSlug = publicCitySlug(title) || 'venue';
  const rawId = String(id || '').replace(/^venue_/, '');
  const idSlug = publicCitySlug(rawId) || rawId;
  if (!idSlug) return dedupeVenueSlugSuffix(titleSlug);
  if (titleSlug.endsWith(`-${idSlug}`)) return dedupeVenueSlugSuffix(titleSlug);
  return dedupeVenueSlugSuffix(`${titleSlug}-${idSlug}`);
}

export function publicVenueSlug(slug, title, id) {
  const raw = String(slug || '').trim();
  const normalized = publicCitySlug(raw);
  if (normalized && !/^[a-f0-9]{20,}$/i.test(normalized)) {
    return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(normalized));
  }
  if (title && id) return buildPublicVenueSlug(title, id);
  return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(normalized || raw));
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
