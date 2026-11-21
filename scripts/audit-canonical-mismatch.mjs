#!/usr/bin/env node
/**
 * Investigate the GSC "copy / canonical mismatch" bucket (Google chose a different
 * canonical than ours). Groups crawled event URLs by normalized title + city to
 * surface twins/aliases that break canonical consolidation. Read-only; writes a CSV
 * for editorial review. DB: EVENT_MAP_DATABASE_URL / DATABASE_URL (+ .env).
 * Usage: node apps/web/node_modules/tsx/dist/cli.mjs scripts/audit-canonical-mismatch.mjs --gsc=file [--output=file]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeEventPageProductTitle, resolveEventPageSlugsForEventIds } from '../apps/backend/src/public-event-page-links.ts';
import { extractDaibiletPaths, identityFromEventPath } from './build-event-redirect-map.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Pool } = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'))('pg');

function cliArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [k, ...p] = arg.replace(/^--/, '').split('=');
    args[k] = p.join('=') || true;
  }
  return args;
}

function loadRootEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const sep = t.indexOf('=');
    if (sep <= 0) continue;
    const key = t.slice(0, sep).trim();
    const value = t.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function main() {
  const args = cliArgs();
  if (typeof args.gsc !== 'string') {
    console.error('Usage: node apps/web/node_modules/tsx/dist/cli.mjs scripts/audit-canonical-mismatch.mjs --gsc=file [--output=file]');
    process.exit(2);
  }
  loadRootEnv(rootDir);
  const connectionString = process.env.EVENT_MAP_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Set EVENT_MAP_DATABASE_URL or DATABASE_URL');
    process.exit(2);
  }
  const outputPath = typeof args.output === 'string' ? args.output : path.join(rootDir, 'docs', 'seo', 'canonical-mismatch-review.csv');

  const paths = extractDaibiletPaths(await readFile(args.gsc, 'utf8')).filter((p) => p.startsWith('/events/'));
  const records = paths.map((pathname) => ({ pathname, identity: identityFromEventPath(pathname) }));
  if (!records.length) {
    console.error('No /events/ URLs in the GSC file');
    process.exit(2);
  }

  const internalIds = [...new Set(records.map((r) => r.identity.internalId).filter(Boolean))];
  const slugs = [...new Set(records.map((r) => r.identity.slug))];

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const client = await pool.connect();
    const byId = new Map();
    const bySlug = new Map();
    try {
      await client.query('BEGIN READ ONLY');
      const result = await client.query(
        `SELECT e.id AS "eventId", e.title AS "title", lower(coalesce(e.slug,'')) AS "slug", COALESCE(city.title,'') AS "city"
         FROM "Event" e LEFT JOIN "City" city ON city.id = e."primaryCityId"
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

    const groups = new Map();
    const rows = [];
    for (const rec of records) {
      const idn = rec.identity;
      const row = byId.get(idn.internalId) || bySlug.get(idn.slug);
      const title = (row && row.title) || '';
      const city = ((row && row.city) || '').trim();
      const key = `${normalizeEventPageProductTitle(title)}|${city}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rec.pathname);
      rows.push({
        url: rec.pathname,
        eventId: (row && row.eventId) || '',
        title,
        city,
        groupKey: key,
        canonical: (row && pageSlugById.get(row.eventId)) || '',
      });
    }

    const sizeByKey = new Map([...groups.entries()].map(([k, v]) => [k, v.length]));
    rows.sort((a, b) => (sizeByKey.get(b.groupKey) || 0) - (sizeByKey.get(a.groupKey) || 0));

    const header = ['url', 'eventId', 'title', 'city', 'twin_group_size', 'canonical_slug'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([csv(r.url), csv(r.eventId), csv(r.title), csv(r.city), String(sizeByKey.get(r.groupKey) || 1), csv(r.canonical)].join(','));
    }
    await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');

    const twinGroups = [...groups.values()].filter((v) => v.length >= 2);
    const summary = {
      inputUrls: records.length,
      twinGroups: twinGroups.length,
      twinUrls: twinGroups.reduce((sum, v) => sum + v.length, 0),
      withoutCanonical: rows.filter((r) => !r.canonical).length,
      outputPath,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (twinGroups.length) {
      console.warn(`Top twin groups (canonical-mismatch suspects):`);
      for (const v of twinGroups.slice(0, 8)) console.warn(`  ${v[0]} (${v.length} URLs)`);
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}