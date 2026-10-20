#!/usr/bin/env node
/**
 * Post-sync event description pipeline (owner rule 2026-10-20).
 *
 * Runs after TC/TEP catalog import and makes sure every eligible event carries a
 * canonical description:
 * - rows without an override description get composeEventDescription() output
 *   (origin=AUTO + source hash) - the "sanitize new imported events right after
 *   sync" rule;
 * - AUTO rows whose source changed are recomposed;
 * - EDITORIAL / AI rows are NEVER touched (import-guard style protection);
 * - legacy rows (origin null, text present) are only touched with --repair-legacy,
 *   which is structure-only (repairEventDescription, provider wording kept).
 *
 * Also enqueues AI rewrite candidates into EventDescriptionRevision (status
 * QUEUED, priority A/B per docs/event-rewrite-seo-plan.md). Drafts are generated
 * and published only after editorial approval - never automatically.
 *
 * Failures never break the sync: the hook exits 0 on operational errors.
 *
 * Usage (run from repo root, tsx required for the apps/web TS libs):
 *   node apps/web/node_modules/tsx/dist/cli.mjs scripts/post-sync-event-descriptions.js
 *   ... --apply                      # actually write (default is dry-run)
 *   ... --ids=evt_a,evt_b            # limit to specific Event ids
 *   ... --repair-legacy              # structure-only repair of legacy (null origin) rows
 *   ... --skip-enqueue               # do not touch the AI rewrite queue
 *   ... --enqueue-limit=N            # max queue inserts per run (default 500)
 *   ... --limit=N                    # process at most N rows
 *   ... --out=DIR                    # report dir (default tmp-event-descriptions/post-sync)
 *
 * Env:
 *   DATABASE_URL           required
 *   POST_SYNC_DESCRIPTIONS=0   disable entirely (set by callers that opt out)
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

const argv = process.argv.slice(2);
const argValue = (name) => {
  const idx = argv.indexOf(name);
  return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : null;
};
const inlineValue = (name) => {
  const prefix = `${name}=`;
  const found = argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};
const apply = argv.includes('--apply');
const repairLegacy = argv.includes('--repair-legacy');
const skipEnqueue = argv.includes('--skip-enqueue');
const limit = Number(argValue('--limit') || 0) || 0;
const enqueueLimit = Number(argValue('--enqueue-limit') || 500) || 500;
const outDir = argValue('--out') || inlineValue('--out') || path.join(rootDir, 'tmp-event-descriptions', 'post-sync');
const idsArg = inlineValue('--ids') || argValue('--ids');
const onlyIds = idsArg
  ? [...new Set(idsArg.split(/[,;\s]+/).map((value) => value.trim()).filter(Boolean))]
  : [];

/** Source hash canon: normalized line endings + trim, md5 (matches SQL pre-filter). */
function sourceHashOf(source) {
  return crypto.createHash('md5').update(String(source || '').replace(/\r\n?/g, '\n').trim()).digest('hex');
}

/**
 * Eligibility = current sellable events (canon of scripts/event-rewrite-audit.js).
 * The candidate filter limits transfers: rows with no override text, AUTO rows
 * (hash-checked in JS), and - with --repair-legacy - legacy null-origin rows.
 */
function buildCandidateSql({ withIds, legacy, schema }) {
  const conditions = [];
  if (withIds) {
    conditions.push('e.id = any($1::text[])');
  } else {
    const parts = ['(o.id is null or nullif(btrim(o.description), \'\') is null)'];
    if (schema?.origin) {
      parts.push('(o."descriptionOrigin" = \'AUTO\')');
      if (legacy) {
        parts.push('(o."descriptionOrigin" is null and nullif(btrim(o.description), \'\') is not null)');
      }
    } else if (legacy) {
      // Pre-migration: every row with text is a legacy row.
      parts.push('(nullif(btrim(o.description), \'\') is not null)');
    }
    conditions.push(`(${parts.join(' or ')})`);
  }
  const originSelect = schema?.origin
    ? `o."descriptionOrigin"::text as origin,
      o."descriptionSourceHash" as source_hash`
    : `null::text as origin,
      null::text as source_hash`;
  return `
    select
      e.id,
      e.title,
      e.slug,
      e.kind::text as kind,
      e."ageLimit",
      e."priceFromRub",
      e.description as source_description,
      coalesce(o.title, e.title) as eff_title,
      c.title as city,
      v.title as venue,
      v.address as venue_address,
      cat.title as category,
      sub.title as subcategory,
      o.description as override_description,
      ${originSelect},
      ${SOURCE_FP_SQL} as source_fp,
      (
        select min(s."startsAt")
        from "EventSession" s
        where s."eventId" = e.id and s."isActive" is not false and s."cancelledAt" is null
          and s."startsAt" >= now()
      ) as next_session,
      (
        select count(*)::int
        from "EventSession" s
        where s."eventId" = e.id and s."isActive" is not false and s."cancelledAt" is null
          and s."startsAt" >= now()
      ) as future_sessions,
      (
        select array_agg(distinct ((extract(epoch from (s."endsAt" - s."startsAt")) / 60))::int)
        from "EventSession" s
        where s."eventId" = e.id and s."isActive" is not false and s."cancelledAt" is null
          and s."startsAt" >= now() and s."endsAt" > s."startsAt"
      ) as durations
    from "Event" e
    left join "EventOverride" o on o."eventId" = e.id
    left join "City" c on c.id = e."primaryCityId"
    left join "Venue" v on v.id = e."venueId"
    left join "Category" cat on cat.id = e."categoryId"
    left join "Subcategory" sub on sub.id = e."primarySubcategoryId"
    where coalesce(o."editorStatus", e.status)::text not in ('HIDDEN', 'DRAFT')
      and coalesce(o."isIndexable", e."isIndexable", true)
      and exists (
        select 1 from "EventOffer" offer
        where offer."eventId" = e.id and offer.active is not false
          and (nullif(offer."widgetUrl", '') is not null or nullif(offer."deeplinkUrl", '') is not null)
      )
      and (
        (e.kind::text = 'OPEN_DATE' and (e."openDateValidTo" is null or e."openDateValidTo" >= current_date))
        or exists (
          select 1 from "EventSession" s
          where s."eventId" = e.id and s."isActive" is not false and s."cancelledAt" is null
            and (s."startsAt" >= now() - interval '2 hours' or s."endsAt" >= now())
        )
      )
      and ${conditions.join(' and ')}
    order by e."updatedAt" desc
    ${limit > 0 ? `limit ${limit}` : ''}
  `;
}

const ELIGIBLE_FILTER = `
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  where coalesce(o."editorStatus", e.status)::text not in ('HIDDEN', 'DRAFT')
    and coalesce(o."isIndexable", e."isIndexable", true)
    and exists (
      select 1 from "EventOffer" offer
      where offer."eventId" = e.id and offer.active is not false
        and (nullif(offer."widgetUrl", '') is not null or nullif(offer."deeplinkUrl", '') is not null)
    )
    and (
      (e.kind::text = 'OPEN_DATE' and (e."openDateValidTo" is null or e."openDateValidTo" >= current_date))
      or exists (
        select 1 from "EventSession" s
        where s."eventId" = e.id and s."isActive" is not false and s."cancelledAt" is null
          and (s."startsAt" >= now() - interval '2 hours' or s."endsAt" >= now())
      )
    )
`;

/** Same normalization on both sides so JS row fingerprints match the SQL dup map. */
const SOURCE_FP_SQL = `md5(regexp_replace(lower(btrim(regexp_replace(regexp_replace(coalesce(e.description, ''), '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g'))), '[^[:alnum:]]+', '', 'g'))`;

function narrativeInputOf(row) {
  return {
    title: String(row.eff_title || row.title || '').trim(),
    category: row.category || null,
    subcategory: row.subcategory || null,
    kind: row.kind || null,
    ageLimit: row.ageLimit || null,
    futureSessions: Number(row.future_sessions || 0),
    venue: row.venue || null,
    nextSession: row.next_session || null,
  };
}

function composeInputOf(row) {
  const durations = Array.isArray(row.durations) ? row.durations.map(Number).filter(Boolean) : [];
  return {
    ...narrativeInputOf(row),
    city: row.city || null,
    venueAddress: row.venue_address || null,
    priceFromRub: row.priceFromRub ?? null,
    durationMin: durations.length === 1 ? durations[0] : null,
    sourceDescription: row.source_description || '',
    seed: row.id,
  };
}

/** AI rewrite priority per docs/event-rewrite-seo-plan.md (A/B gate). */
function rewritePriorityOf(row, dupCount) {
  const source = String(row.source_description || '').trim();
  const dup = Number(dupCount || 1);
  if (!source || source.length < 160 || dup > 1) return 'A';
  const structured = source.includes('## ') || source.includes('\n- ') || /\n{2,}/.test(source);
  if (source.length < 320 || !structured) return 'B';
  return null;
}

function writeFileSafe(target, content) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

async function detectSchemaSupport(client) {
  const result = await client.query(`
    select
      to_regclass('public."EventDescriptionRevision"') is not null as has_revision,
      exists (
        select 1 from information_schema.columns
        where table_name = 'EventOverride' and column_name = 'descriptionOrigin'
      ) as has_origin
  `);
  return { revisions: Boolean(result.rows[0]?.has_revision), origin: Boolean(result.rows[0]?.has_origin) };
}

async function fetchDupCounts(client) {
  const result = await client.query(`
    select fp, count(*)::int as n
    from (select ${SOURCE_FP_SQL} as fp ${ELIGIBLE_FILTER}) t
    where t.fp <> ''
    group by fp
    having count(*) > 1
  `);
  const map = new Map();
  for (const row of result.rows) map.set(row.fp, Number(row.n || 0));
  return map;
}

async function writeOverride(client, row, text, { origin, hash }, schema) {
  const overrideId = `eov_${crypto.randomBytes(12).toString('hex')}`;
  if (schema.origin) {
    await client.query(
      `insert into "EventOverride" (id, "eventId", description, "descriptionOrigin", "descriptionSourceHash", "createdAt", "updatedAt")
       values ($1, $2, $3, $4::"DescriptionOrigin", $5, now(), now())
       on conflict ("eventId") do update set
         description = excluded.description,
         "descriptionOrigin" = excluded."descriptionOrigin",
         "descriptionSourceHash" = excluded."descriptionSourceHash",
         "updatedAt" = now()`,
      [overrideId, row.id, text, origin ?? null, hash ?? null],
    );
    return;
  }
  await client.query(
    `insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
     values ($1, $2, $3, now(), now())
     on conflict ("eventId") do update set description = excluded.description, "updatedAt" = now()`,
    [overrideId, row.id, text],
  );
}

async function enqueueRevision(client, row, priority, schema) {
  if (!schema.revisions) return false;
  const source = String(row.source_description || '').trim();
  const sourceText = source || String(row.override_description || '').trim();
  const result = await client.query(
    `insert into "EventDescriptionRevision" (id, "eventId", status, priority, "sourceHash", "sourceText", "createdBy", "createdAt", "updatedAt")
     values ($1, $2, 'QUEUED', $3, $4, $5, 'post-sync', now(), now())
     on conflict ("eventId", "sourceHash") do nothing`,
    [`edr_${crypto.randomBytes(12).toString('hex')}`, row.id, priority, sourceHashOf(source), sourceText],
  );
  return (result.rowCount || 0) > 0;
}

async function main() {
  if (process.env.POST_SYNC_DESCRIPTIONS === '0') {
    console.log(JSON.stringify({ ok: true, skipped: 'POST_SYNC_DESCRIPTIONS=0' }));
    return;
  }
  loadRootEnv();
  const { composeEventDescription, repairEventDescription, stableVariant } = await import(
    '../apps/web/src/lib/event-description-compose.ts'
  );

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString, max: 1, application_name: 'post_sync_event_descriptions' });
  const client = await pool.connect();
  const report = {
    mode: apply ? 'apply' : 'dry-run',
    repairLegacy,
    enqueue: !skipEnqueue,
    candidates: 0,
    composed: 0,
    repaired: 0,
    refreshedAuto: 0,
    unchanged: 0,
    protectedRows: 0,
    legacySkipped: 0,
    enqueued: { A: 0, B: 0 },
    errors: 0,
  };
  const samples = [];
  try {
    const schema = await detectSchemaSupport(client);
    if (!schema.origin) {
      console.warn('[post-sync] EventOverride.descriptionOrigin missing - run pnpm db:deploy (legacy write mode)');
    }
    const dupCounts = skipEnqueue ? new Map() : await fetchDupCounts(client);
    const result = await client.query(
      buildCandidateSql({ withIds: onlyIds.length > 0, legacy: repairLegacy, schema }),
      onlyIds.length ? [onlyIds] : [],
    );
    report.candidates = result.rows.length;

    const updates = [];
    for (const row of result.rows) {
      const origin = row.origin || null;
      const currentText = String(row.override_description || '').trim();
      const source = String(row.source_description || '').replace(/\r\n?/g, '\n').trim();
      const hasText = Boolean(currentText);

      if (origin === 'EDITORIAL' || origin === 'AI') {
        report.protectedRows += 1;
        continue;
      }

      if (hasText && origin == null) {
        if (!repairLegacy) {
          report.legacySkipped += 1;
        } else {
          const repaired = repairEventDescription(currentText, narrativeInputOf(row), stableVariant(row.id));
          if (repaired && repaired !== currentText) {
            updates.push({ row, text: repaired, origin: null, hash: null, kind: 'repaired' });
            report.repaired += 1;
            if (samples.length < 20) samples.push({ id: row.id, slug: row.slug, kind: 'repaired', before: currentText.slice(0, 400), after: repaired.slice(0, 400) });
          } else {
            report.unchanged += 1;
          }
        }
      } else if (!hasText) {
        const composed = composeEventDescription(composeInputOf(row));
        if (composed.text) {
          updates.push({ row, text: composed.text, origin: schema.origin ? 'AUTO' : null, hash: schema.origin ? sourceHashOf(source) : null, kind: 'composed' });
          report.composed += 1;
          if (samples.length < 20) samples.push({ id: row.id, slug: row.slug, kind: 'composed', sourceUsed: composed.sourceUsed, after: composed.text.slice(0, 400) });
        }
      } else {
        // AUTO row: recompose only when the source changed.
        const hash = sourceHashOf(source);
        if (row.source_hash && row.source_hash === hash) {
          report.unchanged += 1;
        } else {
          const composed = composeEventDescription(composeInputOf(row));
          if (composed.text && composed.text !== currentText) {
            updates.push({ row, text: composed.text, origin: schema.origin ? 'AUTO' : null, hash: schema.origin ? hash : null, kind: 'refreshed' });
            report.refreshedAuto += 1;
            if (samples.length < 20) samples.push({ id: row.id, slug: row.slug, kind: 'refreshed', before: currentText.slice(0, 200), after: composed.text.slice(0, 400) });
          } else {
            updates.push({ row, text: currentText, origin: schema.origin ? 'AUTO' : null, hash: schema.origin ? hash : null, kind: 'hash-sync' });
            report.unchanged += 1;
          }
        }
      }
    }

    if (apply) {
      for (const update of updates) {
        try {
          await writeOverride(client, update.row, update.text, { origin: update.origin, hash: update.hash }, schema);
        } catch (error) {
          report.errors += 1;
          console.error(`[post-sync] override write failed for ${update.row.id}: ${error.message || error}`);
        }
        if (!skipEnqueue && schema.revisions) {
          try {
            const priority = rewritePriorityOf(update.row, dupCounts.get(String(update.row.source_fp || '')));
            if (priority) {
              const inserted = await enqueueRevision(client, update.row, priority, schema);
              if (inserted) report.enqueued[priority] += 1;
            }
          } catch (error) {
            report.errors += 1;
            console.error(`[post-sync] enqueue failed for ${update.row.id}: ${error.message || error}`);
          }
        }
      }
    } else if (!skipEnqueue) {
      // Dry-run: just count what would land in the AI queue.
      for (const row of result.rows) {
        const priority = rewritePriorityOf(row, dupCounts.get(String(row.source_fp || '')));
        if (priority) report.enqueued[priority] += 1;
      }
    }

    fs.mkdirSync(outDir, { recursive: true });
    writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSafe(path.join(outDir, 'samples.json'), JSON.stringify(samples, null, 2));
    console.log(JSON.stringify({ ...report, outDir }, null, 2));
    // Compact one-line summary for scripts/lib/post-sync-hook.js (last `{...}` line).
    console.log(JSON.stringify(report));
    if (!apply) console.log('Dry-run only. Re-run with --apply to write.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[post-sync] failed:', error && error.stack ? error.stack : error);
  // Never break the catalog sync: report and exit cleanly.
  process.exitCode = 0;
});
