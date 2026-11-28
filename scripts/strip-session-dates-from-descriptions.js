#!/usr/bin/env node
/**
 * Remove stored "nearest session" date/time lines from EventOverride.description.
 *
 * Owner decision 2026-10-17: the schedule lives in the purchase block, so a
 * stored date is duplicate content that goes stale and used to pin the UTC
 * clock into the copy. This script cleans existing overrides; generators no
 * longer write such lines (see apps/web/src/lib/event-minimal-description.ts).
 *
 * Usage (from repo root, with the MSK Postgres tunnel on :5433):
 *   node --import tsx scripts/strip-session-dates-from-descriptions.js --dry-run
 *   node --import tsx scripts/strip-session-dates-from-descriptions.js --apply
 *
 * Flags:
 *   --dry-run (default) | --apply
 *   --limit N    only N events
 *   --out DIR    report directory (default <repo>/tmp-event-desc-backup/strip-dates)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDb('pg');

function loadRootEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const apply = process.argv.includes('--apply');
const argValue = (name) => {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};
const limit = Number(argValue('--limit') || 0) || 0;
const outDir =
  argValue('--out') || path.join(rootDir, 'tmp-event-desc-backup', 'strip-dates');

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

async function main() {
  loadRootEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required (tunnel to MSK Postgres)');

  const { hasSessionDateLines, stripSessionDateLines } = await import(
    '../apps/web/src/lib/event-description-session-lines.ts'
  );

  const pool = new Pool({ connectionString, max: 2, application_name: 'event_strip_dates' });
  const client = await pool.connect();
  try {
    const rows = (
      await client.query(
        `
        select e.id, e.slug, o.description as override_description
        from "EventOverride" o
        join "Event" e on e.id = o."eventId"
        where nullif(btrim(o.description), '') is not null
        order by e.id
        `,
      )
    ).rows;

    const scoped = limit > 0 ? rows.slice(0, limit) : rows;
    const changes = [];
    const samples = [];
    let matched = 0;

    for (const row of scoped) {
      const before = String(row.override_description || '');
      if (!hasSessionDateLines(before)) continue;
      matched += 1;
      const after = stripSessionDateLines(before);
      if (after === before) continue;
      const change = {
        id: row.id,
        slug: row.slug,
        before,
        after,
        cleared: after.length === 0,
      };
      changes.push(change);
      if (samples.length < 20) samples.push(change);
    }

    const quality = {
      cleared: changes.filter((c) => c.cleared).length,
      stillHasSessionLine: changes.filter((c) => hasSessionDateLines(c.after)).length,
      hasLongDash: changes.filter((c) => /[\u2013\u2014\u2212]/.test(c.after)).length,
    };

    const report = {
      mode: apply ? 'apply' : 'dry-run',
      scanned: scoped.length,
      matched,
      changed: changes.length,
      unchanged: matched - changes.length,
      quality,
    };

    writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSafe(
      path.join(outDir, 'samples.txt'),
      samples
        .map(
          (s) =>
            `\n\n================ ${s.id} | ${s.slug} ================\n---- BEFORE (${s.before.length}) ----\n${s.before}\n\n---- AFTER (${s.after.length || 'cleared'}) ----\n${s.after}`,
        )
        .join('\n'),
    );

    console.log(JSON.stringify({ ...report, outDir }, null, 2));
    if (quality.stillHasSessionLine || quality.hasLongDash) {
      console.warn('WARNING: quality counters above are non-zero - review samples before apply');
    }

    if (!apply) {
      console.log('Dry-run only. Re-run with --apply to update EventOverride.description.');
      return;
    }

    writeFileSafe(
      path.join(outDir, `backup-${Date.now()}.json`),
      JSON.stringify(changes.map(({ id, before }) => ({ id, prevOverride: before }))),
    );

    let updated = 0;
    await client.query('begin');
    try {
      for (const change of changes) {
        await client.query(
          'update "EventOverride" set description = $1, "updatedAt" = now() where "eventId" = $2',
          [change.after || null, change.id],
        );
        updated += 1;
        if (updated % 200 === 0) {
          await client.query('commit');
          await client.query('begin');
          console.log(`applied ${updated}/${changes.length}`);
        }
      }
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    }
    console.log(JSON.stringify({ updated, outDir }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
