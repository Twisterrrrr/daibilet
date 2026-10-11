#!/usr/bin/env node
/**
 * Reformat current event descriptions into structured text stored in
 * EventOverride.description (protected from TC/TEP import).
 *
 * Owner task 2026-10-11:
 * - visual section titles -> H3 ("## Title");
 * - walls of text -> paragraphs / bullet lists;
 * - long/medium dashes -> plain hyphen;
 * - keep the work in EventOverride so re-import never wipes it.
 *
 * Usage (run from repo root):
 *   pwsh scripts/mcp-postgres-tunnel.ps1 -Background
 *   $env:DATABASE_URL = "postgresql://USER:PASS@127.0.0.1:5433/daibilet"   # tunnel
 *   node --import tsx scripts/format-current-event-descriptions.js --dry-run
 *   node --import tsx scripts/format-current-event-descriptions.js --apply
 *
 * Flags:
 *   --dry-run (default) | --apply
 *   --limit N          only N events (longest effective descriptions first)
 *   --samples N        how many before/after samples per report (default 30)
 *   --out DIR          report directory (default <repo>/tmp-event-descriptions)
 *   --only FILE        file with event ids, one per line
 *   --skip-overrides   do not touch events that already have override description
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

const dryRun = !process.argv.includes('--apply');
const skipOverrides = process.argv.includes('--skip-overrides');
const argValue = (name) => {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};
const limit = Number(argValue('--limit') || 0) || 0;
const sampleCount = Number(argValue('--samples') || 30) || 30;
const outDir = argValue('--out') || path.join(rootDir, 'tmp-event-descriptions');
const onlyFile = argValue('--only');

/**
 * Eligible = current events, same canon as scripts/event-rewrite-audit.js:
 * not HIDDEN/DRAFT, indexable, sellable offer, active/upcoming session or open date.
 */
const ELIGIBLE_SQL = `
  select
    e.id,
    e.title,
    e.slug,
    coalesce(src.code, 'UNKNOWN') as source_code,
    nullif(btrim(e.description), '') as source_description,
    nullif(btrim(o.description), '') as override_description,
    case
      when nullif(btrim(o.description), '') is not null then 'override'
      else 'source'
    end as effective_origin
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  left join lateral (
    select s.code::text as code
    from "EventSourceLink" link
    join "Source" s on s.id = link."sourceId"
    where link."eventId" = e.id
    order by case s.code::text when 'TEPLOHOD' then 1 when 'TICKETSCLOUD' then 2 else 3 end
    limit 1
  ) src on true
  where coalesce(o."editorStatus", e.status)::text not in ('HIDDEN', 'DRAFT')
    and coalesce(o."isIndexable", e."isIndexable", true)
    and exists (
      select 1
      from "EventOffer" offer
      where offer."eventId" = e.id
        and offer.active is not false
        and (nullif(offer."widgetUrl", '') is not null or nullif(offer."deeplinkUrl", '') is not null)
    )
    and (
      (
        e.kind::text = 'OPEN_DATE'
        and (e."openDateValidTo" is null or e."openDateValidTo" >= current_date)
      )
      or exists (
        select 1
        from "EventSession" session
        where session."eventId" = e.id
          and session."isActive" is not false
          and session."cancelledAt" is null
          and (
            session."startsAt" >= now() - interval '2 hours'
            or session."endsAt" >= now()
          )
      )
    )
`;


function qualityChecks(text) {
  const lines = text.split('\n');
  const headingBad = lines.filter(
    (l) => l.startsWith('## ') && (l.length - 3 > 72 || /[.!?…]$/.test(l.trim())),
  );
  return {
    hasHtmlTag: /<[a-z][\s\S]*>/i.test(text),
    hasLongDash: /[\u2013\u2014\u2212]/.test(text),
    badHeadings: headingBad.length,
    maxLineLen: lines.reduce((m, l) => Math.max(m, l.length), 0),
  };
}

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

async function main() {
  loadRootEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required (use scripts/mcp-postgres-tunnel.ps1 + 5433)');
  }

  const { reformatEventDescription } = await import('../apps/web/src/lib/event-description-reformat.ts');

  const pool = new Pool({ connectionString, max: 2, application_name: 'event_desc_reformat' });
  const client = await pool.connect();

  try {
    const rows = (await client.query(`select * from (${ELIGIBLE_SQL}) t`)).rows;
    let candidates = rows;

    if (onlyFile) {
      const ids = new Set(
        fs.readFileSync(onlyFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      );
      candidates = candidates.filter((r) => ids.has(r.id));
    }
    candidates = candidates
      .map((r) => {
        const effective = (r.override_description || r.source_description || '').trim();
        return { ...r, effective };
      })
      .filter((r) => r.effective)
      .sort((a, b) => b.effective.length - a.effective.length);
    if (skipOverrides) candidates = candidates.filter((r) => !r.override_description);
    if (limit > 0) candidates = candidates.slice(0, limit);

    const report = {
      mode: dryRun ? 'dry-run' : 'apply',
      eligibleTotal: rows.length,
      candidates: candidates.length,
      changed: 0,
      unchanged: 0,
      emptyResult: 0,
      fromOverride: 0,
      fromSource: 0,
      quality: { hasHtmlTag: 0, hasLongDash: 0, badHeadings: 0, maxLineLen: 0 },
      bySource: {},
    };

    const changes = [];
    const samples = [];
    const backup = [];

    for (const row of candidates) {
      const reformatted = reformatEventDescription(row.effective);
      if (!reformatted) {
        report.emptyResult += 1;
        continue;
      }
      if (reformatted === row.effective) {
        report.unchanged += 1;
        continue;
      }
      const q = qualityChecks(reformatted);
      report.quality.hasHtmlTag += q.hasHtmlTag ? 1 : 0;
      report.quality.hasLongDash += q.hasLongDash ? 1 : 0;
      report.quality.badHeadings += q.badHeadings ? 1 : 0;
      report.quality.maxLineLen = Math.max(report.quality.maxLineLen, q.maxLineLen);

      report.changed += 1;
      if (row.effective_origin === 'override') report.fromOverride += 1;
      else report.fromSource += 1;
      const key = `${row.source_code}:${row.effective_origin}`;
      report.bySource[key] = (report.bySource[key] || 0) + 1;

      changes.push({
        id: row.id,
        slug: row.slug,
        source: row.source_code,
        origin: row.effective_origin,
        lenBefore: row.effective.length,
        lenAfter: reformatted.length,
      });
      backup.push({ id: row.id, prevOverride: row.override_description ?? null });
      if (samples.length < sampleCount) {
        samples.push({
          id: row.id,
          slug: row.slug,
          source: row.source_code,
          origin: row.effective_origin,
          before: row.effective,
          after: reformatted,
        });
      }
    }

    fs.mkdirSync(outDir, { recursive: true });
    writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSafe(
      path.join(outDir, 'samples.txt'),
      samples
        .map(
          (s) =>
            `\n\n================ ${s.id} | ${s.source} | ${s.origin} ================\nslug: ${s.slug}\n---- BEFORE (${s.before.length}) ----\n${s.before}\n\n---- AFTER (${s.after.length}) ----\n${s.after}`,
        )
        .join('\n'),
    );
    writeFileSafe(
      path.join(outDir, 'changes.tsv'),
      'id\tslug\tsource\torigin\tlenBefore\tlenAfter\n' +
        changes
          .map((c) => `${c.id}\t${c.slug}\t${c.source}\t${c.origin}\t${c.lenBefore}\t${c.lenAfter}`)
          .join('\n'),
    );

    console.log(JSON.stringify({ ...report, outDir }, null, 2));
    if (report.quality.hasHtmlTag || report.quality.hasLongDash || report.quality.badHeadings) {
      console.warn('WARNING: non-zero quality counters above - review samples before apply');
    }

    if (dryRun) {
      console.log('Dry-run only. Re-run with --apply to write EventOverride.description.');
      return;
    }

    // Apply: upsert override.description only; other override fields stay intact.
    writeFileSafe(path.join(outDir, `backup-${Date.now()}.json`), JSON.stringify(backup));
    let updated = 0;
    const batchSize = 200;
    await client.query('begin');
    try {
      for (const item of changes) {
        const row = candidates.find((r) => r.id === item.id);
        const reformatted = reformatEventDescription(row.effective);
        const overrideId = `eov_${crypto.randomBytes(12).toString('hex')}`;
        await client.query(
          `
          insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
          values ($1, $2, $3, now(), now())
          on conflict ("eventId") do update
            set description = excluded.description,
                "updatedAt" = now()
          `,
          [overrideId, item.id, reformatted],
        );
        updated += 1;
        if (updated % batchSize === 0) {
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

