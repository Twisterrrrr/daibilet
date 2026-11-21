#!/usr/bin/env node
/**
 * Build data/redirects/event-pdp-redirects.json from a GSC "not indexed" export
 * + live catalog. Matches by Event id (not slug), resolves the canonical EventPage
 * slug, validates, and writes with --apply. Dry-run by default.
 * Usage: node apps/web/node_modules/tsx/dist/cli.mjs scripts/build-event-redirect-map.mjs --gsc=file [--apply]
 * DB: EVENT_MAP_DATABASE_URL or DATABASE_URL.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveEventPageSlugsForEventIds } from '../apps/backend/src/public-event-page-links.ts';
import { validateEventRedirectMap } from '../apps/web/src/lib/event-redirect-map.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Pool } = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'))('pg');

/** Parse a GSC CSV/TSV dump into /events/ URLs (header and non-event rows dropped). */
export function extractEventUrls(text) {
  const out = new Set();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const first = t.includes('\t') ? t.split('\t')[0] : t.split(',')[0];
    const url = first.replace(/^"|"$/g, '').trim();
    if (!url.startsWith('http')) continue;
    try {
      const pathname = new URL(url).pathname;
      if (pathname.startsWith('/events/')) out.add(pathname);
    } catch { /* skip malformed */ }
  }
  return [...out];
}

/** Stable identity + source kind from an /events/ path (id-based, not slug). */
export function identityFromEventPath(pathname) {
  let slug = pathname.slice('/events/'.length).split(/[?#]/u, 1)[0] || '';
  try { slug = decodeURIComponent(slug); } catch { /* keep raw */ }
  const lower = slug.toLowerCase();
  const tcHex = lower.match(/^(?:tc-)?([a-f\d]{24})(?:-|$)/iu)?.[1] || lower.match(/-([a-f\d]{24})$/iu)?.[1] || '';
  const tepNum = lower.match(/-(\d{2,6})$/iu)?.[1] || '';
  const internalId = tcHex ? `evt_${tcHex}` : tepNum ? `evt_tep_${tepNum}` : '';
  const kind = tcHex ? 'tc_code' : /[а-яё]/iu.test(slug) ? 'cyrillic' : 'legacy_slug';
  return { slug: lower, internalId, kind };
}

function cliArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [k, ...p] = arg.replace(/^--/, '').split('=');
    args[k] = p.join('=') || true;
  }
  return args;
}

async function main() {
  const args = cliArgs();
  if (typeof args.gsc !== 'string') {
    console.error('Usage: node apps/web/node_modules/tsx/dist/cli.mjs scripts/build-event-redirect-map.mjs --gsc=file [--apply]');
    process.exit(2);
  }
  const apply = Boolean(args.apply);
  const outputPath = typeof args.output === 'string' ? args.output : path.join(rootDir, 'data', 'redirects', 'event-pdp-redirects.json');
  const connectionString = process.env.EVENT_MAP_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Set EVENT_MAP_DATABASE_URL or DATABASE_URL');
    process.exit(2);
  }

  const paths = extractEventUrls(await readFile(args.gsc, 'utf8'));
  if (!paths.length) { console.error('No /events/ URLs found'); process.exit(2); }
  console.log(`GSC event URLs: ${paths.length}`);

  const ids = paths.map(identityFromEventPath);
  const internalIds = [...new Set(ids.map((i) => i.internalId).filter(Boolean))];
  const slugs = [...new Set(ids.map((i) => i.slug))];

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const client = await pool.connect();
    const byId = new Map();
    const bySlug = new Map();
    try {
      await client.query('BEGIN READ ONLY');
      const result = await client.query(
        `SELECT e.id AS "eventId", lower(coalesce(e.slug, '')) AS "slug",
           COALESCE((SELECT count(*)::int FROM "EventSession" s
             WHERE s."eventId" = e.id AND s."isActive" IS TRUE AND s."cancelledAt" IS NULL
               AND s."archivedAt" IS NULL AND COALESCE(s."endsAt", s."startsAt") >= now()), 0) AS "futureSessionCount"
         FROM "Event" e
         WHERE lower(e.id) = ANY($1::text[]) OR lower(e.slug) = ANY($2::text[])`,
        [internalIds, slugs],
      );
      await client.query('ROLLBACK');
      for (const row of result.rows) {
        byId.set(row.eventId, row);
        if (row.slug) bySlug.set(row.slug, row);
      }
    } finally {
      client.release();
    }

    const pageSlugById = await resolveEventPageSlugsForEventIds([...byId.keys()], pool);

    const entriesBySource = new Map();
    const unmatched = [];
    const kept = [];
    for (const idn of ids) {
      const row = byId.get(idn.internalId) || bySlug.get(idn.slug);
      if (!row) { unmatched.push(idn.slug); continue; }
      const sourcePath = `/events/${idn.slug}`;
      const canonical = pageSlugById.get(row.eventId);
      if (!canonical) {
        if (Number(row.futureSessionCount) === 0) {
          entriesBySource.set(sourcePath, { sourcePath, eventId: row.eventId, kind: 'past_slot', status: 410, targetPath: null });
        } else {
          kept.push({ slug: idn.slug, reason: 'no canonical EventPage, has future sessions' });
        }
        continue;
      }
      const targetPath = `/events/${canonical}`;
      if (targetPath === sourcePath) { kept.push({ slug: idn.slug, reason: 'already the canonical URL' }); continue; }
      entriesBySource.set(sourcePath, { sourcePath, eventId: row.eventId, kind: idn.kind, status: 301, targetPath });
    }

    const map = {
      version: 1,
      generatedAt: new Date().toISOString(),
      entries: [...entriesBySource.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)),
    };
    const errors = validateEventRedirectMap(map);
    const summary = {
      inputUrls: paths.length,
      matched301: map.entries.filter((e) => e.status === 301).length,
      matched410: map.entries.filter((e) => e.status === 410).length,
      keptLiveFallback: kept.length,
      unmatched: unmatched.length,
      validationErrors: errors,
      mode: apply ? 'apply' : 'dry-run',
      outputPath,
    };

    if (errors.length) {
      console.log(JSON.stringify(summary, null, 2));
      console.error('Generated map failed validation; nothing written.');
      process.exitCode = 1;
      return;
    }
    if (apply) await writeFile(outputPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ ...summary, preview: map.entries.slice(0, 5) }, null, 2));
    if (!apply) console.warn(`Dry-run: no write. Re-run with --apply to write ${outputPath}.`);
    if (unmatched.length) console.warn(`Unmatched (no catalog row, NOT redirected): ${unmatched.slice(0, 10).join(', ')}${unmatched.length > 10 ? ' …' : ''}`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}