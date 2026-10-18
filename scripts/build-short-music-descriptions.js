#!/usr/bin/env node
/**
 * Fill short/empty event descriptions with a minimal factual description.
 *
 * Owner task 2026-10-18: 324 music cards have descriptions under 160 chars
 * (often a one-liner or a placeholder). The quality gate of the music batch
 * leaves them untouched, and inventing copy is forbidden by project rules.
 * This batch uses apps/web/src/lib/event-minimal-description.ts, which builds
 * text only from catalogue fields (title, city, venue, address, format,
 * duration, price, age) plus whatever real provider copy remains:
 *
 *   group A  provider remainder (>= 40 chars, no placeholder) -> kept between
 *            the factual opener and the practical block;
 *   group B  empty/placeholder -> the pure minimal description.
 *
 * Apply upserts EventOverride.description. The backup keeps prevOverride=null
 * for rows that did not exist before; rollback means deleting those eventIds.
 *
 * Usage (from repo root, with the MSK Postgres tunnel on :5433):
 *   node apps/web/node_modules/tsx/dist/cli.mjs scripts/build-short-music-descriptions.js --dry-run
 *   node apps/web/node_modules/tsx/dist/cli.mjs scripts/build-short-music-descriptions.js --apply
 *
 * Flags:
 *   --dry-run (default) | --apply
 *   --limit N      only N events (highest-traffic first: most active sessions)
 *   --out DIR      report directory (default <repo>/tmp-event-desc-backup/short-music)
 *   --base-url U   public site for the catalogue walk (default https://daibilet.ru)
 *   --scope music|all   which short events to fill (default music)
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
  argValue('--out') || path.join(rootDir, 'tmp-event-desc-backup', 'short-music');
const baseUrl = String(argValue('--base-url') || 'https://daibilet.ru').replace(/\/+$/, '');
const scope = argValue('--scope') === 'all' ? 'all' : 'music';

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

/** Provider lines that are filler, not copy. */
const PLACEHOLDER_RE =
  /описание\s+(?:маршрута\s+)?в\s+исходных\s+данных\s+не\s+указано|описание\s+отсутствует|нет\s+описания|подробное\s+описание\s+(?:будет|отсутствует)|в\s+разработке|tbd|coming\s+soon|lorem\s+ipsum/iu;

/** Title markers of internal test cards - never touched. */
const TEST_TITLE_RE = /(^|\s)тест(\s|$)|тестов(ая|ое|ый)/iu;

async function fetchCatalog() {
  const rows = [];
  for (let offset = 0; ; offset += 200) {
    let res;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      res = await fetch(`${baseUrl}/api/public/events?limit=200&offset=${offset}`);
      if (res.status !== 429) break;
      // The public catalog rate-limits a fast page walk; back off and retry.
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
  const { buildMinimalEventDescription } = await import(
    '../apps/web/src/lib/event-minimal-description.ts'
  );
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

  const pool = new Pool({ connectionString, max: 2, application_name: 'short_music_desc' });
  const client = await pool.connect();
  try {
    const rows = (
      await client.query(
        `
        select e.id, e.slug, e.title,
               e.description as source_description,
               o.description as override_description,
               (select count(*) from "EventSession" s
                 where s."eventId" = e.id and s."isActive") as session_count,
               (select max(extract(epoch from (s."endsAt" - s."startsAt")) / 60)
                  from "EventSession" s
                 where s."eventId" = e.id and s."isActive"
                   and s."startsAt" is not null and s."endsAt" is not null) as duration_min,
               (select min(s."priceFromRub") from "EventSession" s
                 where s."eventId" = e.id and s."isActive") as price_min
        from "Event" e
        left join "EventOverride" o on o."eventId" = e.id
        order by session_count desc, e.id
        `,
      )
    ).rows;

    // Stable group key -> opener rotation so same-title cards stay unique.
    const groupSeen = new Map();
    const shortlist = [];
    let skippedTest = 0;
    for (const row of rows) {
      const item = catalogItem(row);
      if (!item) continue;
      if (scope === 'music' && !isMusicEvent(item)) continue;
      if (TEST_TITLE_RE.test(String(row.title || ''))) {
        skippedTest += 1;
        continue;
      }
      const effective = String(
        row.override_description || row.source_description || '',
      ).trim();
      const isShort = effective.length < 160;
      const isPlaceholder = !effective || PLACEHOLDER_RE.test(effective);
      if (!isShort && !isPlaceholder) continue;

      // Group A: real provider remainder after removing filler.
      const remainder = stripSessionDateLines(effective)
        .split(/\n\s*\n/u)
        .map((part) => part.trim())
        .filter((part) => part && !PLACEHOLDER_RE.test(part))
        .join('\n\n');
      const groupA = remainder.replace(/\s+/g, ' ').trim().length >= 40;

      const key = `${String(item.title || '').toLowerCase()}||${item.venue || ''}||${item.city || ''}`;
      const variant = groupSeen.get(key) || 0;
      groupSeen.set(key, variant + 1);

      const minimal = buildMinimalEventDescription(
        {
          title: item.title,
          city: item.city,
          venue: item.venue,
          venueAddress: item.venueAddress,
          category: item.category,
          subcategory: item.subcategories?.[0],
          kind: item.kind,
          durationMin: row.duration_min ? Number(row.duration_min) : null,
          priceFromRub: item.priceFrom ?? (row.price_min ? Number(row.price_min) : null),
          ageLimit: item.ageLimit,
        },
        variant,
      );
      if (!minimal) continue;

      // minimal = opener paragraph + practical sections. For group A the real
      // provider remainder goes between them - facts first, copy preserved.
      const blocks = minimal.split(/\n\s*\n/u);
      const after = groupA
        ? [blocks[0], remainder, ...blocks.slice(1)].join('\n\n')
        : minimal;

      shortlist.push({
        id: row.id,
        slug: row.slug,
        group: groupA ? 'A' : 'B',
        variant,
        hadOverride: Boolean(String(row.override_description || '').trim()),
        before: effective,
        after: normalizeUserFacingCopy(after).trim(),
        sessionCount: Number(row.session_count || 0),
      });
    }

    const scoped = limit > 0 ? shortlist.slice(0, limit) : shortlist;
    console.log(
      `db events: ${rows.length}, short in scope: ${shortlist.length} ` +
        `(A=${shortlist.filter((r) => r.group === 'A').length} ` +
        `B=${shortlist.filter((r) => r.group === 'B').length}), scoped: ${scoped.length}`,
    );

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

    for (const item of scoped) {
      const bad = {
        empty: !item.after,
        hasDateLine: hasSessionDateLines(item.after),
        stillGeneric: PLACEHOLDER_RE.test(item.after.split(/\n\s*\n/u)[0] || ''),
        hasLongDash: /[\u2013\u2014\u2212]/.test(item.after),
        tooShort: item.after.length < 160,
      };
      for (const key of Object.keys(bad)) if (bad[key]) quality[key] += 1;
      if (Object.values(bad).some(Boolean)) {
        failures.push({
          id: item.id,
          slug: item.slug,
          reasons: bad,
          before: item.before,
          after: item.after,
        });
        continue;
      }
      if (item.after === item.before) continue;

      changes.push(item);
      if (samples.length < 25) samples.push(item);
    }

    const uniqueTexts = new Set(changes.map((c) => c.after)).size;
    const report = {
      mode: apply ? 'apply' : 'dry-run',
      scope,
      catalog: catalog.length,
      dbEvents: rows.length,
      shortInScope: shortlist.length,
      groupA: shortlist.filter((r) => r.group === 'A').length,
      groupB: shortlist.filter((r) => r.group === 'B').length,
      scoped: scoped.length,
      changed: changes.length,
      uniqueTexts,
      failed: failures.length,
      skippedTest,
      quality,
    };

    writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSafe(
      path.join(outDir, 'samples.txt'),
      samples
        .map(
          (s) =>
            `\n\n================ ${s.id} | ${s.slug} | group ${s.group} | variant ${s.variant} ================\n---- BEFORE ----\n${s.before || '(empty)'}\n\n---- AFTER ----\n${s.after}`,
        )
        .join('\n'),
    );
    writeFileSafe(
      path.join(outDir, 'changes.tsv'),
      'id\tslug\tgroup\tvariant\tbeforeLen\tafterLen\tsessions\n' +
        changes
          .map(
            (c) =>
              `${c.id}\t${c.slug}\t${c.group}\t${c.variant}\t${c.before.length}\t${c.after.length}\t${c.sessionCount}`,
          )
          .join('\n'),
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

