import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG_PAGE_SIZE_DEFAULT, CATALOG_PAGE_SIZE_MAX } from '@daibilet/contracts/catalog';
import { prisma } from '@daibilet/db';
import { raw, sql } from '@daibilet/db/sql';
import {
  ACTIVE_SESSION_SQL,
  PUBLIC_SALES_BLOCKED_STATUS_SQL,
  isPublicSessionRowOnSale,
  isSaleableForPublicCatalog,
} from './catalog-availability.js';
import { resolveCityTimeZone } from './city-timezone.js';
import {
  loadPublicCatalogDiskCacheWithStat,
  resolveCatalogRebuildLockPath,
  resolveCatalogRebuildMode,
  resolveCatalogRebuildScriptPath,
  writePublicCatalogDiskCache,
  type PublicCatalogDiskIndexes,
} from './public-catalog-disk-cache.js';
import {
  dedupeCrossSourceCatalogSessions,
  regroupMappedPublicCatalogSessions,
  sessionHasCoverImage,
} from './public-catalog-grouping.js';
import { formatDate, formatTime, normalizeStartsAt, timeBucket } from './public-datetime.js';
import { mapGroupedPublicSession, collectSeparateCityHubNames, pickCatalogSubcategories } from './public-catalog.mapper.js';
import { findLandingRule } from './landing-rules.js';
import { LIST_SLOT_PREVIEW_LIMIT, toPublicCatalogListItem } from './public-catalog-list-item.js';
import { providerForSource } from './provider-purchase.js';
import type { PublicCatalogMappingRow } from './public-catalog.mapper.js';
import type { PublicCatalogDto, PublicSessionDto } from './types/public.js';
import type { PublicCatalogQuery } from './types/schemas.js';
import type { PurchaseProvider } from './types/common.js';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_CATALOG_CACHE_MS = 5 * 60 * 1000;
/** Soft TTL for background refresh; past this we still serve memory/disk and refresh async (INC.504.4). */
const PUBLIC_CATALOG_STALE_MS = Number(process.env.PUBLIC_CATALOG_STALE_MS || 30 * 60 * 1000);
/** Max wait for cold/force rebuild before returning whatever cache exists. */
const PUBLIC_CATALOG_COLD_AWAIT_MS = Number(process.env.PUBLIC_CATALOG_COLD_AWAIT_MS || 8_000);
const PUBLIC_CATALOG_CHILD_WAIT_MS = Number(process.env.PUBLIC_CATALOG_CHILD_WAIT_MS || 190_000);
const PUBLIC_CATALOG_MAP_CHUNK = Math.max(20, Number(process.env.PUBLIC_CATALOG_MAP_CHUNK || 80));
/** Hydrate enough slots for EventCard 2×2 chips after primary is excluded from chips. */
const CATALOG_CARD_SLOT_TARGET = 5;
const CATALOG_HYDRATED_SLOT_LIMIT = 8;
/**
 * Venue/location PDP date rail needs many calendar days of departures, not card previews.
 * Dense piers can have 10+ slots/day; 96 covers ~1-2 weeks for typical water schedules.
 */
export const VENUE_PAGE_SLOT_LIMIT = 96;
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

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
  staleUntil: number;
  sessions: PublicSessionDto[];
  builtAt?: number;
  /** Disk v2 id-pointer indexes (venue/destination/slug). Kept in memory so PDP/city avoid full scans. */
  indexes?: PublicCatalogDiskIndexes;
  /** Lazy session.id → row map for index hydration. */
  byId?: Map<string, PublicSessionDto>;
}

let catalogCache: CatalogCache | null = null;
let catalogBuildPromise: Promise<PublicSessionDto[]> | null = null;
let catalogChildSpawnedAt = 0;
/** Coalesce concurrent async disk promotes (INC.504.5c polish). */
let catalogDiskPromotePromise: Promise<void> | null = null;
/** Last disk mtime successfully considered by promote (stat-gate; skip re-parse). */
let catalogDiskKnownMtimeMs: number | null = null;

function catalogSessionsById(cache: CatalogCache): Map<string, PublicSessionDto> {
  if (cache.byId && cache.byId.size === cache.sessions.length) return cache.byId;
  cache.byId = new Map(cache.sessions.map((session) => [String(session.id), session]));
  return cache.byId;
}

function adoptCatalogCache(next: {
  sessions: PublicSessionDto[];
  expiresAt: number;
  staleUntil: number;
  builtAt: number;
  indexes?: PublicCatalogDiskIndexes;
}): PublicSessionDto[] {
  catalogCache = {
    expiresAt: next.expiresAt,
    staleUntil: next.staleUntil,
    sessions: next.sessions,
    builtAt: next.builtAt,
    ...(next.indexes ? { indexes: next.indexes } : {}),
  };
  return next.sessions;
}

function resolveSessionsFromIdIndex(
  index: Record<string, string[]> | undefined,
  keys: string[],
): PublicSessionDto[] {
  if (!catalogCache?.sessions?.length || !index || !keys.length) return [];
  const byId = catalogSessionsById(catalogCache);
  const out: PublicSessionDto[] = [];
  const seen = new Set<string>();
  for (const rawKey of keys) {
    const key = String(rawKey || '')
      .trim()
      .toLowerCase();
    if (!key) continue;
    const ids = index[key];
    if (!ids?.length) continue;
    for (const id of ids) {
      const session = byId.get(String(id));
      if (!session || seen.has(session.id)) continue;
      seen.add(session.id);
      out.push(session);
    }
  }
  return out;
}

/**
 * Index-scoped venue lookup (disk v2 venueIndex). Prefer over filtering ~3k sessions.
 * Keys: venueId, venueSlug, pier:{key} (same as dto.js buildVenueSessionIndex).
 */
export function resolveCatalogSessionsByVenueKeys(keys: string[]): PublicSessionDto[] {
  return resolveSessionsFromIdIndex(catalogCache?.indexes?.venueIndex, keys);
}

/**
 * Index-scoped destination/city lookup (disk v2 destinationIndex).
 */
export function resolveCatalogSessionsByDestinationKeys(keys: string[]): PublicSessionDto[] {
  return resolveSessionsFromIdIndex(catalogCache?.indexes?.destinationIndex, keys);
}

/** Soft-timeout wrapper for request paths that must not wait on cold catalog promote/parse. */
export async function getPublicCatalogSessionsSoft(
  timeoutMs = 2_500,
  options: { hydrateSlots?: boolean } = {},
): Promise<PublicSessionDto[] | null> {
  const hydrateSlots = options.hydrateSlots === true;
  try {
    const sessions = await Promise.race([
      getPublicCatalogSessions(false, { hydrateSlots }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), Math.max(250, timeoutMs));
      }),
    ]);
    return sessions;
  } catch {
    return null;
  }
}

export function clearPublicCatalogDtoCache(): void {
  // Soft-invalidate for SWR: keep last sessions while rebuild runs.
  if (catalogCache?.sessions) {
    catalogCache = { ...catalogCache, expiresAt: 0 };
  } else {
    catalogCache = null;
  }
  // Do not clear in-flight rebuild - callers may still await it.
}

export async function buildPublicCatalogDto(query: PublicCatalogQuery): Promise<PublicCatalogDto> {
  // Base catalog cache omits heavy slot hydration; hydrate only the requested page.
  const sessions = await getPublicCatalogSessions(query.refresh === 1, { hydrateSlots: false });
  const byIds = Boolean(query.ids?.length);
  // Favorites / ids lookup: allow sessions without cover; normal catalog stays cover-gated.
  const sourceSessions = byIds ? sessions : sessions.filter(sessionHasCoverImage);
  const filtered = sourceSessions.filter((session) => matchesCatalogQuery(session, query));
  const sorted = sortCatalogSessions(filtered, query.sort || 'random', query);
  const defaultLimit = byIds ? Math.min(Math.max(query.ids!.length, 1), CATALOG_PAGE_SIZE_MAX) : CATALOG_PAGE_SIZE_DEFAULT;
  const limit = clampNumber(query.limit, 1, CATALOG_PAGE_SIZE_MAX, defaultLimit);
  const total = sorted.length;
  const maxOffset = total > 0 ? Math.floor((total - 1) / limit) * limit : 0;
  const offset = Math.min(clampNumber(query.offset, 0, 100000, 0), maxOffset);
  const pageRows = sorted.slice(offset, offset + limit);
  const hydratedPage = await hydrateCatalogUpcomingSlots(pageRows, LIST_SLOT_PREVIEW_LIMIT);
  const items = hydratedPage.map(toPublicCatalogListItem);
  // Facets are conditional: each dimension counts against sibling filters (not the full catalog).
  const facets = buildConditionalCatalogFacets(sourceSessions, query);

  return {
    generatedAt: new Date().toISOString(),
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
    items,
    facets,
  };
}

export async function getPublicCatalogSessions(
  forceRefresh = false,
  options: { hydrateSlots?: boolean } = {},
): Promise<PublicSessionDto[]> {
  const hydrateSlots = options.hydrateSlots !== false;
  const now = Date.now();

  if (forceRefresh) {
    if (catalogCache?.sessions) {
      catalogCache = { ...catalogCache, expiresAt: 0, staleUntil: 0 };
    }
    const sessions = await awaitCatalogRebuild('force-refresh');
    return hydrateSlots ? hydrateCatalogUpcomingSlots(sessions) : sessions;
  }

  // Warm path: fresh memory hit returns before any disk promote (Codex / INC.504.5c stat-gate).
  if (catalogCache?.sessions?.length) {
    const cached = catalogCache;
    if (now < cached.expiresAt) {
      return hydrateSlots ? hydrateCatalogUpcomingSlots(cached.sessions) : cached.sessions;
    }
    // Soft-SWR: serve stale immediately; cheap mtime-gated promote may refresh memory if worker wrote newer file.
    void promoteDiskCacheIfNewerAsync();
    const reason = now < (cached.staleUntil || 0) ? 'swr' : 'soft-expire';
    triggerBackgroundCatalogRebuild(reason);
    return hydrateSlots ? hydrateCatalogUpcomingSlots(cached.sessions) : cached.sessions;
  }

  // Cold: await async disk promote once, then rebuild if still empty.
  await promoteDiskCacheIfNewerAsync();
  if (catalogCache?.sessions?.length) {
    const cached = catalogCache;
    if (now < (cached.expiresAt || 0)) {
      return hydrateSlots ? hydrateCatalogUpcomingSlots(cached.sessions) : cached.sessions;
    }
    triggerBackgroundCatalogRebuild(now < (cached.staleUntil || 0) ? 'swr' : 'soft-expire');
    return hydrateSlots ? hydrateCatalogUpcomingSlots(cached.sessions) : cached.sessions;
  }

  const sessions = await awaitCatalogRebuild('cold');
  return hydrateSlots ? hydrateCatalogUpcomingSlots(sessions) : sessions;
}

/**
 * Async disk -> memory Soft-SWR promote with atomic pointer swap.
 * Stat-gated: unchanged mtime skips readFile + JSON.parse of v1/v2 snapshot.
 */
async function promoteDiskCacheIfNewerAsync(): Promise<void> {
  if (catalogDiskPromotePromise) return catalogDiskPromotePromise;

  catalogDiskPromotePromise = (async () => {
    try {
      const loaded = await loadPublicCatalogDiskCacheWithStat(catalogDiskKnownMtimeMs);
      if (loaded.status === 'missing') return;
      catalogDiskKnownMtimeMs = loaded.mtimeMs;
      if (loaded.status === 'unchanged') return;
      const disk = loaded.snapshot;
      if (!disk?.sessions?.length) return;
      const memBuiltAt = catalogCache?.builtAt || 0;
      if (disk.builtAt <= memBuiltAt && catalogCache?.sessions?.length) return;
      // Atomic swap of the in-memory reference; old blob -> GC.
      // Keep v2 indexes in memory so venue/city PDP can resolve without full-array filter.
      adoptCatalogCache({
        expiresAt: disk.expiresAt,
        staleUntil: disk.staleUntil,
        sessions: disk.sessions,
        builtAt: disk.builtAt,
        ...(disk.indexes ? { indexes: disk.indexes } : {}),
      });
    } catch (error) {
      console.error(
        `Failed to promote catalog from disk: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      catalogDiskPromotePromise = null;
    }
  })();

  return catalogDiskPromotePromise;
}

function triggerBackgroundCatalogRebuild(reason: string): void {
  const mode = resolveCatalogRebuildMode();
  if (mode === 'off') return;
  if (catalogBuildPromise) return;

  if (mode === 'child') {
    spawnCatalogRebuildChild(reason);
    return;
  }

  void scheduleInlineCatalogRebuild(reason);
}

async function awaitCatalogRebuild(reason: string): Promise<PublicSessionDto[]> {
  const mode = resolveCatalogRebuildMode();

  if (mode === 'off') {
    await promoteDiskCacheIfNewerAsync();
    if (catalogCache?.sessions?.length) return catalogCache.sessions;
    throw new Error(`Public catalog rebuild mode=off and no disk/memory cache (${reason})`);
  }

  if (mode === 'child') {
    const beforeBuiltAt = catalogCache?.builtAt || 0;
    spawnCatalogRebuildChild(reason);
    const waitMs = reason === 'force-refresh' ? PUBLIC_CATALOG_CHILD_WAIT_MS : PUBLIC_CATALOG_COLD_AWAIT_MS;
    const sessions = await pollDiskCatalogUntil(beforeBuiltAt, waitMs);
    if (sessions?.length) return sessions;
    // Keep waiting in background for child; request path must not block ~170s.
    if (catalogCache?.sessions?.length) return catalogCache.sessions;
    const late = await pollDiskCatalogUntil(beforeBuiltAt, Math.min(2_000, waitMs));
    if (late?.length) return late;
    throw new Error(`Public catalog child rebuild not ready within ${waitMs}ms (${reason})`);
  }

  const rebuild = scheduleInlineCatalogRebuild(reason);
  // Cron/CLI force-refresh must wait for full rebuild; cold request-path stays capped.
  if (
    reason === 'force-refresh' ||
    !Number.isFinite(PUBLIC_CATALOG_COLD_AWAIT_MS) ||
    PUBLIC_CATALOG_COLD_AWAIT_MS <= 0
  ) {
    return rebuild;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      rebuild,
      new Promise<PublicSessionDto[]>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Public catalog inline rebuild exceeded ${PUBLIC_CATALOG_COLD_AWAIT_MS}ms (${reason})`));
        }, PUBLIC_CATALOG_COLD_AWAIT_MS);
      }),
    ]);
  } catch (error) {
    if (catalogCache?.sessions?.length) {
      console.warn(
        `Public catalog cold await fallback to stale (${reason}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return catalogCache.sessions;
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function resolveTsxBinary(): string {
  const binName = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
  const candidates = [
    path.join(PROJECT_ROOT, 'apps', 'backend', 'node_modules', '.bin', binName),
    path.join(PROJECT_ROOT, 'node_modules', '.bin', binName),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return binName;
}

function spawnCatalogRebuildChild(reason: string): void {
  const now = Date.now();
  // Coalesce bursts: one spawn per minute unless force/cold needs a new attempt.
  if (now - catalogChildSpawnedAt < 60_000 && reason !== 'force-refresh' && reason !== 'cold') {
    return;
  }
  catalogChildSpawnedAt = now;

  const script = resolveCatalogRebuildScriptPath();
  const lockPath = resolveCatalogRebuildLockPath();
  const tsxBin = resolveTsxBinary();
  const command = process.platform === 'win32' ? tsxBin : 'flock';
  const childArgs =
    process.platform === 'win32'
      ? [script, `--reason=${reason}`]
      : ['-n', lockPath, 'timeout', '--kill-after=15s', '180s', tsxBin, script, `--reason=${reason}`];

  try {
    const child = spawn(command, childArgs, {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        // Child must build inline in its own process, not spawn another child.
        DAIBILET_CATALOG_REBUILD_MODE: 'inline',
        // Avoid inheriting web-port heuristic if parent is Next.
        DAIBILET_WEB_PORT: '',
        NEXT_RUNTIME: '',
      },
    });
    child.unref();
    console.log(`Public catalog DTO rebuild spawned (${reason}) pid=${child.pid ?? 'n/a'}`);
  } catch (error) {
    console.warn(
      `Public catalog child spawn failed (${reason}), falling back to inline: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    void scheduleInlineCatalogRebuild(reason);
  }
}

async function pollDiskCatalogUntil(beforeBuiltAt: number, waitMs: number): Promise<PublicSessionDto[] | null> {
  const deadline = Date.now() + Math.max(0, waitMs);
  while (Date.now() <= deadline) {
    await promoteDiskCacheIfNewerAsync();
    if (catalogCache?.builtAt && catalogCache.builtAt > beforeBuiltAt && catalogCache.sessions?.length) {
      return catalogCache.sessions;
    }
    await sleep(250);
  }
  await promoteDiskCacheIfNewerAsync();
  if (catalogCache?.builtAt && catalogCache.builtAt > beforeBuiltAt && catalogCache.sessions?.length) {
    return catalogCache.sessions;
  }
  return null;
}

function scheduleInlineCatalogRebuild(reason: string): Promise<PublicSessionDto[]> {
  if (catalogBuildPromise) return catalogBuildPromise;

  catalogBuildPromise = (async () => {
    const startedAt = Date.now();
    try {
      const [rows, pinnedEventIds] = await Promise.all([loadPublicCatalogRows(), loadPinnedEventIds()]);
      const separateCityHubs = collectSeparateCityHubNames(rows);
      // Yield between chunks so inline rebuild (API/cron child) does not monopolize the event loop.
      const mapped: PublicSessionDto[] = [];
      for (let i = 0; i < rows.length; i += PUBLIC_CATALOG_MAP_CHUNK) {
        const chunk = rows.slice(i, i + PUBLIC_CATALOG_MAP_CHUNK);
        for (const row of chunk) {
          const session = mapGroupedPublicSession(row, pinnedEventIds, { separateCityHubs });
          if (session) mapped.push(session);
        }
        if (i + PUBLIC_CATALOG_MAP_CHUNK < rows.length) {
          await sleep(0);
        }
      }
      // Do not hydrate all slots into the shared cache — that made every limit=50 cold build pay for thousands of slots.
      const sessions = filterCatalogSessions(
        dedupeCrossSourceCatalogSessions(regroupMappedPublicCatalogSessions(mapped)),
      );
      const now = Date.now();
      const expiresAt = now + Math.max(30_000, PUBLIC_CATALOG_CACHE_MS);
      const staleUntil = now + Math.max(60_000, PUBLIC_CATALOG_STALE_MS);
      let indexes: PublicCatalogDiskIndexes | undefined;
      try {
        const dto = await import('./dto.js');
        if (typeof dto.serializePublicCatalogLegacyIndexes === 'function') {
          indexes = dto.serializePublicCatalogLegacyIndexes(sessions);
        }
      } catch (error) {
        console.warn(
          `Public catalog disk indexes serialize skipped: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      adoptCatalogCache({
        expiresAt,
        staleUntil,
        sessions,
        builtAt: now,
        ...(indexes ? { indexes } : {}),
      });
      writePublicCatalogDiskCache({
        version: indexes ? 2 : 1,
        builtAt: now,
        expiresAt,
        staleUntil,
        sessions,
        ...(indexes ? { indexes } : {}),
      });
      console.log(
        `Public catalog DTO cache rebuilt (${reason}): ${sessions.length} sessions in ${now - startedAt}ms indexes=${indexes ? 'v2' : 'none'}`,
      );
      return sessions;
    } finally {
      catalogBuildPromise = null;
    }
  })().catch((error) => {
    catalogBuildPromise = null;
    console.warn(
      `Public catalog DTO cache rebuild failed (${reason}): ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  });

  return catalogBuildPromise;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) setImmediate(resolve);
    else setTimeout(resolve, ms);
  });
}

async function loadPinnedEventIds(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ eventId: string }>>(sql`
    select distinct "eventId"
    from "LandingMatch"
    where coalesce(reasons->>'manualStatus', '') = 'PINNED'
  `);
  return new Set(rows.map((row) => row.eventId));
}

async function loadPublicCatalogRows(): Promise<PublicCatalogRow[]> {
  return prisma.$queryRaw<PublicCatalogRow[]>(sql`
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
        override."mergeGroupKey" as "overrideMergeGroupKey",
        override.description as "overrideDescription",
        override."shortDescription" as "overrideShortDescription",
        override."imageUrl" as "overrideImageUrl",
        primary_offer."sourceCode" as "offerSourceCode",
        primary_offer.title as "offerTitle",
        primary_offer."priceRub" as "offerPriceRub",
        primary_offer."widgetUrl" as "offerWidgetUrl",
        primary_offer."deeplinkUrl" as "offerDeeplinkUrl",
        min(session."startsAt") filter (where ${raw(ACTIVE_SESSION_SQL)}) as "startsAt",
        min(session."priceFromRub") filter (
          where ${raw(ACTIVE_SESSION_SQL)}
            and session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "sessionPriceFromRub",
        max(session."priceFromRub") filter (
          where ${raw(ACTIVE_SESSION_SQL)}
            and session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "sessionPriceToRub",
        (
          select max(offer."priceRub")
          from "EventOffer" offer
          where offer."eventId" = event.id
            and offer.active = true
            and offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB}
        ) as "offerPriceMaxRub",
        count(distinct session.id) filter (where ${raw(ACTIVE_SESSION_SQL)})::int as "slotCount",
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
        case
          when nullif(trim("overrideMergeGroupKey"), '') is not null then concat_ws(
            '|',
            'merge',
            lower(regexp_replace(trim("overrideMergeGroupKey"), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(venue, '')), '\\s+', ' ', 'g'))
          )
          else concat_ws(
            '|',
            lower(regexp_replace(trim(coalesce("sourceLabel", '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(
              nullif(trim(${raw(CATALOG_GROUP_TITLE_SQL)}), ''),
              trim(coalesce(venue, ''))
            )), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(venue, '')), '\\s+', ' ', 'g'))
          )
        end as "groupKey"
      from normalized
      where "purchaseReady" = true
        and lower(coalesce("sourceStatus", '')) not in (${raw(PUBLIC_SALES_BLOCKED_STATUS_SQL)})
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
          order by case when lower(coalesce("sourceStatus", '')) in (${raw(PUBLIC_SALES_BLOCKED_STATUS_SQL)}) then 1 else 0 end,
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
          order by case when lower(coalesce("sourceStatus", '')) in (${raw(PUBLIC_SALES_BLOCKED_STATUS_SQL)}) then 1 else 0 end,
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

function matchesCatalogCity(session: PublicSessionDto, city: string): boolean {
  if (session.city === city || session.destination === city) return true;
  const requested = city.trim().toLowerCase();
  if (!requested) return true;
  const citySlug = String(session.citySlug || '').trim().toLowerCase();
  const sourceCitySlug = String(session.sourceCitySlug || '').trim().toLowerCase();
  return (
    (Boolean(citySlug) && citySlug === requested) ||
    (Boolean(sourceCitySlug) && sourceCitySlug === requested)
  );
}

function matchesCatalogQuery(
  session: PublicSessionDto,
  query: PublicCatalogQuery,
  ignore: Partial<Record<'city' | 'category' | 'landing' | 'date' | 'price' | 'age' | 'q', boolean>> = {},
): boolean {
  if (query.ids?.length) {
    const keys = new Set(query.ids);
    if (!keys.has(session.id) && !(session.groupKey && keys.has(session.groupKey))) return false;
  }
  const destination = query.destination;
  if (destination && destination !== 'all' && session.destination !== destination) return false;
  if (!ignore.city && query.city && query.city !== 'all' && !matchesCatalogCity(session, query.city)) {
    return false;
  }
  if (
    !ignore.category &&
    query.category &&
    query.category !== 'all' &&
    session.category !== query.category &&
    !pickCatalogSubcategories(session).includes(query.category)
  ) {
    return false;
  }
  if (query.tag && query.tag !== 'all' && !session.tags.includes(query.tag)) return false;
  if (
    !ignore.landing &&
    query.landing &&
    query.landing !== 'all' &&
    !(session.landingSlugs || []).includes(query.landing)
  ) {
    return false;
  }
  if (!ignore.date && query.date && query.date !== 'all' && !matchesCatalogDate(session, query.date)) return false;

  const maxPrice = query.maxPrice ?? query.priceMax;
  if (!ignore.price && !matchesCatalogPrice(session, query.minPrice, maxPrice)) return false;
  if (!ignore.age && query.ageMax != null && query.ageMax >= 0 && !matchesCatalogAgeLimit(session, query.ageMax)) {
    return false;
  }
  if (!ignore.date && !matchesDateRange(session.startsAt, query.from, query.to, session)) return false;

  if (ignore.q) return true;
  const search = query.q?.trim().toLowerCase();
  if (!search) return true;
  return [session.title, session.city, session.destination, session.venue, session.category, ...(session.subcategories || []), ...session.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(search);
}

function buildConditionalCatalogFacets(
  sessions: PublicSessionDto[],
  query: PublicCatalogQuery,
): PublicCatalogDto['facets'] {
  const forCities = sessions.filter((session) => matchesCatalogQuery(session, query, { city: true }));
  const forCategories = sessions.filter((session) => matchesCatalogQuery(session, query, { category: true }));
  const forLandings = sessions.filter((session) => matchesCatalogQuery(session, query, { landing: true }));
  const forPrice = sessions.filter((session) => matchesCatalogQuery(session, query, { price: true }));
  const forSubcategories = forCategories;

  return {
    cities: countCatalogValues(forCities.map((session) => session.destination || session.city))
      .filter(([name, events]) => name !== 'Не указан' && events >= 1)
      .map(([name, events]) => ({ name, events })),
    categories: countCatalogValues(forCategories.map((session) => session.category))
      .filter(([, events]) => events >= 1)
      .map(([name, events]) => ({ name, events })),
    subcategories: countCatalogValues(forSubcategories.flatMap((session) => pickCatalogSubcategories(session, 8)))
      .filter(([name, events]) => name.length <= 32 && events >= 1)
      .slice(0, 24)
      .map(([name, events]) => ({ name, events })),
    landings: countCatalogValues(forLandings.flatMap((session) => session.landingSlugs || []))
      .filter(([, events]) => events >= 1)
      .map(([slug, events]) => {
        const rule = findLandingRule(slug);
        return { slug, title: rule?.title || humanizeSlug(slug), events };
      }),
    priceSteps: buildCatalogPriceSteps(forPrice),
  };
}

function buildCatalogFacets(sessions: PublicSessionDto[]): PublicCatalogDto['facets'] {
  return buildConditionalCatalogFacets(sessions, {});
}

function catalogRandomSeed(query: PublicCatalogQuery): number {
  const bucket = new Date().toISOString().slice(0, 10);
  const parts = [
    bucket,
    query.city || '',
    query.category || '',
    query.landing || '',
    query.q || '',
    query.date || '',
    query.from || '',
    query.to || '',
  ].join('|');
  let hash = 2166136261;
  for (let i = 0; i < parts.length; i += 1) {
    hash ^= parts.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffleSessions<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let state = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function sortCatalogSessions(
  sessions: PublicSessionDto[],
  sort: NonNullable<PublicCatalogQuery['sort']>,
  query: PublicCatalogQuery,
): PublicSessionDto[] {
  const sorted = [...sessions];
  if (sort === 'random') {
    return seededShuffleSessions(sorted, catalogRandomSeed(query));
  }
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
      kind: session.kind ?? null,
      sourceStatus: session.sourceStatus ?? null,
      startsAt: session.startsAt || session.upcomingSlots?.[0]?.startsAt || null,
      purchaseReady: session.purchaseReady ?? false,
      priceFrom: session.priceFrom ?? null,
    }),
  );
}

/**
 * Expand upcomingSlots from EventSession rows for TC/Teplohod groups.
 * Catalog cards keep a small limit; venue PDP passes {@link VENUE_PAGE_SLOT_LIMIT}.
 */
export async function hydrateCatalogUpcomingSlots(
  sessions: PublicSessionDto[],
  slotLimit = CATALOG_HYDRATED_SLOT_LIMIT,
): Promise<PublicSessionDto[]> {
  // Small limits (list/card): stop once we have enough chips. Higher venue limits: fill to cap.
  const targetSlotCount =
    slotLimit > CATALOG_HYDRATED_SLOT_LIMIT
      ? slotLimit
      : Math.min(CATALOG_CARD_SLOT_TARGET, Math.max(1, slotLimit));
  const targets = sessions.filter((session) => {
    const provider = session.purchaseProvider;
    if (provider !== 'TEPLOHOD' && provider !== 'TICKETSCLOUD') return false;
    return (session.upcomingSlots?.length || 0) < targetSlotCount;
  });
  if (!targets.length) return sessions;

  const targetIds = new Set(targets.map((session) => session.id));
  const eventIds = [...new Set(
    targets.flatMap((session) => (session.groupEventIds?.length ? session.groupEventIds : [session.id])),
  )];

  const [eventRows, sessionRows] = await Promise.all([
    prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        providerLinks: {
          where: { entityKind: 'EVENT' },
          include: { source: true },
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    }),
    prisma.eventSession.findMany({
      where: {
        eventId: { in: eventIds },
        isActive: true,
        cancelledAt: null,
        OR: [
          { endsAt: { gte: new Date() } },
          { startsAt: { gte: new Date() } },
        ],
      },
      select: {
        id: true,
        eventId: true,
        startsAt: true,
        endsAt: true,
        sourceStatus: true,
        isActive: true,
        cancelledAt: true,
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    }),
  ]);

  const providerByEventId = new Map<string, PurchaseProvider | null>(
    eventRows.map((event) => [
      event.id,
      providerForSource(event.providerLinks[0]?.source.code),
    ]),
  );

  const rowsByEventId = new Map<string, typeof sessionRows>();
  for (const row of sessionRows) {
    if (!row.startsAt) continue;
    if (!isPublicSessionRowOnSale(row)) continue;
    const bucket = rowsByEventId.get(row.eventId) || [];
    if (bucket.length >= slotLimit) continue;
    bucket.push(row);
    rowsByEventId.set(row.eventId, bucket);
  }

  return sessions.map((session) => {
    if (!targetIds.has(session.id)) return session;

    const provider = session.purchaseProvider;
    const hydrationEventIds = pickHydrationEventIds(session, providerByEventId);
    const hydratedSlots: NonNullable<PublicSessionDto['upcomingSlots']> = [];
    const seenStartsAt = new Set<string>();

    for (const eventId of hydrationEventIds) {
      for (const row of rowsByEventId.get(eventId) || []) {
        const startsAt = normalizeStartsAt(row.startsAt);
        if (!startsAt || seenStartsAt.has(startsAt)) continue;
        seenStartsAt.add(startsAt);
        const timeZone = session.timeZone || resolveCityTimeZone(session.city, session.destination);
        const timeLabel = formatTime(startsAt, timeZone);
        const clockKey = `${startsAt.slice(0, 10)}|${timeLabel}`;
        if (seenStartsAt.has(`clock:${clockKey}`)) continue;
        seenStartsAt.add(`clock:${clockKey}`);
        hydratedSlots.push({
          id: row.id,
          eventId: row.eventId,
          startsAt,
          endsAt: normalizeStartsAt(row.endsAt),
          dateLabel: formatDate(startsAt, timeZone),
          timeLabel,
          timeBucket: timeBucket(startsAt, timeZone),
          timeZone,
          // List consumers strip purchaseUrl; keep for event-level hydrate callers.
          purchaseUrl: session.purchaseUrl ?? null,
        });
        if (hydratedSlots.length >= slotLimit) break;
      }
      if (hydratedSlots.length >= slotLimit) break;
    }

    if (hydratedSlots.length <= (session.upcomingSlots?.length || 0)) return session;

    const primary = hydratedSlots[0];
    return {
      ...session,
      upcomingSlots: hydratedSlots,
      sessionCount: Math.max(session.sessionCount || 0, hydratedSlots.length),
      ...(primary?.startsAt
        ? {
            startsAt: primary.startsAt,
            dateLabel: primary.dateLabel,
            timeLabel: primary.timeLabel,
            timeBucket: primary.timeBucket,
          }
        : {}),
    };
  });
}

function pickHydrationEventIds(
  session: PublicSessionDto,
  providerByEventId: Map<string, PurchaseProvider | null>,
): string[] {
  const provider = session.purchaseProvider;
  const candidates = session.groupEventIds?.length ? session.groupEventIds : [session.id];
  if (!provider) return [session.id];

  const matching = candidates.filter((id) => providerByEventId.get(id) === provider);
  return matching.length ? matching : [session.id];
}
