#!/usr/bin/env node
/**
 * Reproducible generator for the active editorial-rewrite register
 * (`data/ticketscloud/editorial/all-active-eventpage-rewrites-production-*.json`).
 *
 * Read-only against the DB. Emits the SAME flat schema as the 2026-11-13
 * snapshot: one row per (EventPage, Event) pair, because one EventPage can
 * group many dated Events.
 *
 * Selection: EventPage status READY with a live
 * `content.activeEditorialText.status = 'ACTIVE_EDITORIAL_REWRITE'` marker
 * (the same predicate the apply script uses in `isActiveEditorial`, covering
 * both the `batch` and `version` marker shapes). The marker object is echoed
 * as `editorialMarker` (raw `content.activeEditorialText`).
 *
 * Sort is deterministic by (slug, eventId). The 13.11 file's row order was an
 * artifact of a one-off generator and is not reproduced.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/build-active-rewrites-register.mjs
 *   node scripts/build-active-rewrites-register.mjs --out=path/to/out.json
 * DB env: EVENT_MAP_DATABASE_URL or DATABASE_URL.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbRoot = process.env.DAIBILET_DB_ROOT || rootDir;
const { Pool } = createRequire(path.join(dbRoot, 'packages', 'db', 'package.json'))('pg');

const DEFAULT_OUT_DIR = path.join(rootDir, 'data', 'ticketscloud', 'editorial');

function loadRootEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('=');
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function cliArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [k, ...p] = arg.replace(/^--/, '').split('=');
    args[k] = p.join('=') || true;
  }
  return args;
}

function localDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Kebab latin slug; EventPage slugs are generated lowercase kebab with no date/code. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const REGISTER_SQL = `
SELECT
  p.id                    AS "eventPageId",
  p.slug                  AS "slug",
  p.title                 AS "title",
  p.status                AS "status",
  p."isIndexable"         AS "isIndexable",
  p."publishedAt"         AS "publishedAt",
  p.content               AS "content",
  link."eventId"          AS "eventId",
  e.title                 AS "eventTitle",
  e.slug                  AS "eventSlug",
  city.title              AS "city",
  venue.title             AS "venue",
  venue.address           AS "address",
  (SELECT src.code::text
     FROM "EventSourceLink" esl
     JOIN "Source" src ON src.id = esl."sourceId"
    WHERE esl."eventId" = link."eventId"
    ORDER BY src.code::text
    LIMIT 1)              AS "source"
FROM "EventPage" p
JOIN "EventPageEvent" link ON link."eventPageId" = p.id
JOIN "Event" e ON e.id = link."eventId"
LEFT JOIN "City" city ON city.id = e."primaryCityId"
LEFT JOIN "Venue" venue ON venue.id = e."venueId"
WHERE p.status = 'READY'
  AND p."publishedAt" IS NOT NULL
  AND p.content -> 'activeEditorialText' ->> 'status' = 'ACTIVE_EDITORIAL_REWRITE'
ORDER BY p.slug ASC, link."eventId" ASC
`;
function toIso(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

/** Map a raw DB row into one register entry, preserving the 13.11 field order. */
function toRegisterEntry(row) {
  return {
    eventPageId: row.eventPageId,
    slug: row.slug,
    title: row.title,
    status: row.status,
    isIndexable: row.isIndexable,
    publishedAt: toIso(row.publishedAt),
    editorialMarker: row.content?.activeEditorialText ?? null,
    eventId: row.eventId,
    eventTitle: row.eventTitle,
    eventSlug: row.eventSlug,
    city: row.city ?? null,
    venue: row.venue ?? null,
    address: row.address ?? null,
    source: row.source ?? null,
  };
}

/**
 * Hard validation. Throws (caller exits 1) on the first broken record: empty or
 * invalid slug, a URL derived from the slug that is empty/`undefined`, an empty
 * eventId (flat-schema equivalent of an empty `sourceEventIds` array), or a
 * missing/incorrect editorial marker.
 */
function validateRegister(entries) {
  const eventIdsByPage = new Map();
  for (const entry of entries) {
    if (!entry.slug || typeof entry.slug !== 'string' || !SLUG_PATTERN.test(entry.slug)) {
      throw new Error(`Invalid slug for eventPageId ${entry.eventPageId}: ${JSON.stringify(entry.slug)}`);
    }
    const url = `/events/${entry.slug}`;
    if (!url || url === 'undefined' || url.includes('undefined')) {
      throw new Error(`Invalid derived URL for eventPageId ${entry.eventPageId}: ${JSON.stringify(url)}`);
    }
    if (!entry.eventId || String(entry.eventId).trim() === '' || String(entry.eventId) === 'undefined') {
      throw new Error(`Empty eventId (sourceEventIds missing) for ${entry.slug} (eventPageId ${entry.eventPageId})`);
    }
    const marker = entry.editorialMarker;
    if (!marker || marker.status !== 'ACTIVE_EDITORIAL_REWRITE') {
      throw new Error(`Missing/incorrect editorialMarker for ${entry.slug}: ${JSON.stringify(marker)}`);
    }
    const ids = eventIdsByPage.get(entry.eventPageId) ?? [];
    ids.push(entry.eventId);
    eventIdsByPage.set(entry.eventPageId, ids);
  }
  for (const [eventPageId, eventIds] of eventIdsByPage) {
    if (eventIds.length === 0) {
      throw new Error(`sourceEventIds array is empty for eventPageId ${eventPageId}`);
    }
  }
  return { eventIdsByPage };
}
async function main() {
  loadRootEnv(dbRoot);
  const args = cliArgs();
  const databaseUrl = process.env.EVENT_MAP_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('EVENT_MAP_DATABASE_URL or DATABASE_URL must be set');

  const defaultOut = path.join(
    DEFAULT_OUT_DIR,
    `all-active-eventpage-rewrites-production-${localDateString()}.json`,
  );
  const outPath = path.resolve(args.out && args.out !== true ? args.out : defaultOut);

  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const identity = await pool.query('SELECT current_database() AS database, now() AS checked_at');
    const { database, checked_at: checkedAt } = identity.rows[0];
    if (database !== 'daibilet') {
      console.warn(`[warn] connected database is "${database}" (expected "daibilet")`);
    }

    const result = await pool.query(REGISTER_SQL);
    const entries = result.rows.map(toRegisterEntry);
    const { eventIdsByPage } = validateRegister(entries);

    const payload = {
      generatedAt: new Date().toISOString(),
      checkedAt: checkedAt instanceof Date ? checkedAt.toISOString() : String(checkedAt),
      database,
      counts: {
        rows: entries.length,
        pages: eventIdsByPage.size,
        events: new Set(entries.map((entry) => entry.eventId)).size,
      },
      entries,
    };

    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    process.stdout.write(
      `${JSON.stringify({ out: outPath, generatedAt: payload.generatedAt, ...payload.counts }, null, 2)}\n`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`build-active-rewrites-register ERROR: ${error?.stack || error}`);
  process.exit(1);
});
