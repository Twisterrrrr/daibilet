#!/usr/bin/env node
/**
 * Rewrite music event descriptions to an artist-first lead.
 *
 * Owner task 2026-10-18: "Сова" and other concert cards opened with generated
 * filler ("мероприятие в Смоленске", "Программа идёт своим ритмом") instead of
 * naming the act. This batch applies the same tested logic as the PDP renderer
 * (apps/web/src/lib/event-description-lead.ts) to every music event: an existing
 * EventOverride wins, otherwise the provider Event.description is used.
 *
 * Apply upserts EventOverride.description. The backup keeps prevOverride=null
 * for rows that did not exist before; rollback means deleting those eventIds.
 *
 * The script never invents facts: it replaces only a generated/wrong lead with
 * title + genre + venue + city (+ verified ARTIST_BIOS entry when present) and
 * keeps real provider copy and the practical block.
 *
 * Usage (from repo root, with the MSK Postgres tunnel on :5433):
 *   node apps/web/node_modules/tsx/dist/cli.mjs scripts/rewrite-music-event-descriptions.js --dry-run
 *   node apps/web/node_modules/tsx/dist/cli.mjs scripts/rewrite-music-event-descriptions.js --apply
 *
 * Flags:
 *   --dry-run (default) | --apply
 *   --limit N      only N music events
 *   --out DIR      report directory (default <repo>/tmp-event-desc-backup/music)
 *   --base-url U   public site for event metadata (default https://daibilet.ru)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
  argValue('--out') || path.join(rootDir, 'tmp-event-desc-backup', 'music');
const baseUrl = String(argValue('--base-url') || 'https://daibilet.ru').replace(/\/+$/, '');

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

async function fetchCatalog() {
  const rows = [];
  for (let offset = 0; ; offset += 200) {
    let res;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      res = await fetch(`${baseUrl}/api/public/events?limit=200&offset=${offset}`);
      if (res.status !== 429) break;
      // The public catalog rate-limits a fast 22-page walk; back off and retry.
      await new Promise((resolve) => setTimeout(resolve, 8000 * (attempt + 1)));
    }
    if (!res.ok) throw new Error(`catalog HTTP ${res.status} at offset ${offset}`);
    const payload = await res.json();
    rows.push(...(payload.items || []));
    if (!payload.hasMore) break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return rows;
}

async function main() {
  loadRootEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required (tunnel to MSK Postgres)');

  const { isMusicEvent } = await import('../apps/web/src/lib/event-music-description.ts');
  const { withConcertLead } = await import('../apps/web/src/lib/event-description-lead.ts');
  const { hasSessionDateLines, stripSessionDateLines } = await import(
    '../apps/web/src/lib/event-description-session-lines.ts'
  );
  const { normalizeUserFacingCopy } = await import(
    '../apps/web/src/lib/event-description-format.ts'
  );

  console.log('Fetching catalog...');
  const catalog = await fetchCatalog();
  const byId = new Map(catalog.map((item) => [String(item.id || ''), item]));
  const bySlug = new Map(catalog.map((item) => [String(item.slug || ''), item]));
  const catalogItem = (row) =>
    byId.get(String(row.id || '')) || bySlug.get(String(row.slug || ''));
  console.log(`catalog items: ${catalog.length}`);

  const pool = new Pool({ connectionString, max: 2, application_name: 'music_desc_rewrite' });
  const client = await pool.connect();
  try {
    const rows = (
      await client.query(
        `
        select e.id, e.slug,
               e.description as source_description,
               o.description as override_description
        from "Event" e
        left join "EventOverride" o on o."eventId" = e.id
        where nullif(btrim(coalesce(o.description, e.description)), '') is not null
        order by e.id
        `,
      )
    ).rows;

    const matchedRows = rows.filter((row) => Boolean(catalogItem(row)));
    const musicRows = matchedRows.filter((row) => isMusicEvent(catalogItem(row)));
    console.log(
      `db events: ${rows.length}, matched catalog: ${matchedRows.length}, music events: ${musicRows.length}`,
    );

    const scoped = limit > 0 ? musicRows.slice(0, limit) : musicRows;
    const changes = [];
    const samples = [];
    const failures = [];
    const quality = {
      stillGeneric: 0,
      hasDateLine: 0,
      hasLongDash: 0,
      tooShort: 0,
      empty: 0,
    };

    for (const row of scoped) {
      const item = catalogItem(row);
      if (!item) continue;
      const hadOverride = Boolean(String(row.override_description || '').trim());
      const before = String(row.override_description || row.source_description || '');
      const event = { ...item, description: before };
      const after = normalizeUserFacingCopy(
        stripSessionDateLines(withConcertLead(event)),
      ).trim();
      if (!after || after === before) continue;

      const lead = after.split(/\n\s*\n/u)[0] || '';
      const bad = {
        empty: !after,
        hasDateLine: hasSessionDateLines(after),
        stillGeneric: /мероприятие в|программа идёт|подойдёт и опытным|после работы/iu.test(lead),
        hasLongDash: /[\u2013\u2014\u2212]/.test(after),
        tooShort: after.length < 160,
      };
      for (const key of Object.keys(bad)) if (bad[key]) quality[key] += 1;
      if (Object.values(bad).some(Boolean)) {
        failures.push({ id: row.id, slug: row.slug, reasons: bad, before, after });
        continue;
      }

      const change = { id: row.id, slug: row.slug, hadOverride, before, after };
      changes.push(change);
      if (samples.length < 25) samples.push(change);
    }

    const report = {
      mode: apply ? 'apply' : 'dry-run',
      catalog: catalog.length,
      events: rows.length,
      musicEvents: musicRows.length,
      withOverride: musicRows.filter((row) => String(row.override_description || '').trim()).length,
      withoutOverride: musicRows.filter((row) => !String(row.override_description || '').trim())
        .length,
      scoped: scoped.length,
      changed: changes.length,
      failed: failures.length,
      quality,
    };

    writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSafe(
      path.join(outDir, 'samples.txt'),
      samples
        .map(
          (s) =>
            `\n\n================ ${s.id} | ${s.slug} ================\n---- BEFORE ----\n${s.before}\n\n---- AFTER ----\n${s.after}`,
        )
        .join('\n'),
    );
    writeFileSafe(
      path.join(outDir, 'changes.tsv'),
      'id\tslug\tbeforeLen\tafterLen\n' +
        changes.map((c) => `${c.id}\t${c.slug}\t${c.before.length}\t${c.after.length}`).join('\n'),
    );
    if (failures.length) {
      writeFileSafe(path.join(outDir, 'failures.json'), JSON.stringify(failures, null, 2));
    }

    console.log(JSON.stringify({ ...report, outDir }, null, 2));
    if (apply === false) {
      console.log('Dry-run only. Review samples.txt, then re-run with --apply.');
      return;
    }

    writeFileSafe(
      path.join(outDir, `backup-${Date.now()}.json`),
      JSON.stringify(
        changes.map(({ id, before, hadOverride }) => ({
          id,
          prevOverride: hadOverride ? before : null,
        })),
      ),
    );

    let updated = 0;
    await client.query('begin');
    try {
      for (const change of changes) {
        await client.query(
          `
          insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
          values ($1, $2, $3, now(), now())
          on conflict ("eventId") do update
            set description = excluded.description,
                "updatedAt" = now()
          `,
          [`eov_${crypto.randomBytes(12).toString('hex')}`, change.id, change.after],
        );
        updated += 1;
        if (updated % 100 === 0) {
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

