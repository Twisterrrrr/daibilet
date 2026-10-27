import { createDb } from './db.js';
import { resolveProjectRoot } from './project-root.js';

export type PublicEventFreshnessRow = { slug: string; updatedAt: Date | string };
export type PublicEventFreshnessMap = Map<string, Date>;
export type PublicEventFreshnessPayload = { freshness: Record<string, string> };

const projectRoot = resolveProjectRoot(import.meta.url);
const FRESHNESS_CACHE_MS = 5 * 60 * 1000;
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

let legacyDb: ReturnType<typeof createDb> | null = null;
let cache: { expiresAt: number; map: PublicEventFreshnessMap } | null = null;

/** Mirrors the public event slug emitted by backend catalog DTOs. */
export function publicFreshnessSlug(value: string): string {
  return String(value || '').trim().toLowerCase().split('')
    .map((char) => CYRILLIC_MAP[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

export function freshnessMapFromRows(rows: PublicEventFreshnessRow[]): PublicEventFreshnessMap {
  const map: PublicEventFreshnessMap = new Map();
  for (const row of rows) {
    const slug = publicFreshnessSlug(row.slug);
    const date = row.updatedAt ? new Date(row.updatedAt) : null;
    if (!slug || !date || Number.isNaN(date.getTime())) continue;
    const previous = map.get(slug);
    if (!previous || date > previous) map.set(slug, date);
  }
  return map;
}

export function clearPublicEventFreshnessCache(): void {
  cache = null;
}

export function publicEventFreshnessPayload(map: PublicEventFreshnessMap): PublicEventFreshnessPayload {
  return {
    freshness: Object.fromEntries([...map].map(([slug, updatedAt]) => [slug, updatedAt.toISOString()])),
  };
}

/** Supplies sitemap lastmod dates without changing which URLs the sitemap lists. */
export async function buildPublicEventFreshnessMap(forceRefresh = false): Promise<PublicEventFreshnessMap> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) return cache.map;
  try {
    legacyDb ??= createDb(projectRoot);
    const { rows } = await legacyDb.query<PublicEventFreshnessRow>(
      // Description rewrites live in EventOverride and never touch Event.updatedAt,
      // so without the join a mass rewrite hides from sitemap lastmod (2026-10-12:
      // 4118 of 4233 event URLs kept claiming the import-time date after publish).
      `select
         e.slug,
         greatest(e."updatedAt", coalesce(o."updatedAt", e."updatedAt")) as "updatedAt"
       from "Event" e
       left join "EventOverride" o on o."eventId" = e.id
       where e.slug is not null and btrim(e.slug) <> ''`,
    );
    const map = freshnessMapFromRows(rows || []);
    cache = { expiresAt: Date.now() + FRESHNESS_CACHE_MS, map };
    return map;
  } catch (error) {
    // The sitemap can still build if the database is temporarily unavailable.
    console.error('[sitemap] event freshness query failed:', error);
    return new Map();
  }
}
