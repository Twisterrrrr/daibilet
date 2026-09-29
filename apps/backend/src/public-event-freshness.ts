import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDb } from './db.js';

/**
 * Slug -> updatedAt for public events, used only to give sitemap entries a real
 * `<lastmod>`.
 *
 * Deliberately a separate, trivial query instead of threading `updatedAt` through
 * the catalog pipeline. The catalog SQL is the most traffic-critical query in the
 * project, and this value only ever feeds a sitemap date - not worth touching
 * that path to move a field across four layers.
 *
 * It deliberately does NOT try to decide which events are indexable. It returns
 * every event that has a slug, and the sitemap looks up the ones it already
 * decided to list. A stale or extra row can therefore never add or remove a URL.
 *
 * Note: `EventSession` has no `updatedAt`, so session-level changes (price,
 * availability) do not move this date. It reflects the last write to the event
 * record, which is the honest signal available without a schema change.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export type PublicEventFreshnessRow = {
  slug: string;
  /** pg returns timestamptz as a Date; older paths hand back an ISO string. */
  updatedAt: Date | string;
};

export type PublicEventFreshnessMap = Map<string, Date>;

const FRESHNESS_CACHE_MS = 5 * 60 * 1000;

let legacyDb: ReturnType<typeof createDb> | null = null;
let cache: { expiresAt: number; map: PublicEventFreshnessMap } | null = null;

function getLegacyDb() {
  if (!legacyDb) legacyDb = createDb(projectRoot);
  return legacyDb;
}

export function clearPublicEventFreshnessCache(): void {
  cache = null;
}

/**
 * Returns slug -> updatedAt. Never throws: a sitemap builder must still produce
 * a usable (if less precise) lastmod when the DB is unavailable at build time.
 */
export async function buildPublicEventFreshnessMap(
  forceRefresh = false,
): Promise<PublicEventFreshnessMap> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) return cache.map;

  const map: PublicEventFreshnessMap = new Map();
  try {
    const { rows } = await getLegacyDb().query<PublicEventFreshnessRow>(
      `select e.slug, e."updatedAt"
       from "Event" e
       where e.slug is not null and btrim(e.slug) <> ''`,
    );
    for (const row of rows || []) {
      const slug = String(row.slug || '').trim();
      if (!slug) continue;
      const date = row.updatedAt ? new Date(row.updatedAt) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const previous = map.get(slug);
      // Grouped events share a slug; keep the freshest so the date is never
      // pulled backwards by a duplicate row.
      if (!previous || date > previous) map.set(slug, date);
    }
  } catch {
    // Empty map -> sitemap falls back to build time, as it did before this existed.
  }

  cache = { expiresAt: Date.now() + FRESHNESS_CACHE_MS, map };
  return map;
}
