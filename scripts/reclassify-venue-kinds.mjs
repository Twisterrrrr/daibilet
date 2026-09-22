#!/usr/bin/env node
/**
 * Reclassify ATTRACTION / MEETING_POINT / OUTDOOR_LOCATION → TEMPLE | BUS.
 *
 * Family stays location (no URL family change). hub_only (pageStatus NONE) → review.
 * Ambiguous / ticketable museum-temples → review.
 *
 * Usage:
 *   node scripts/reclassify-venue-kinds.mjs --dry-run
 *   node scripts/reclassify-venue-kinds.mjs --dry-run --json=docs/drafts/_reclassify-temple-bus-dry.json
 *   node scripts/reclassify-venue-kinds.mjs --apply   # only after owner confirms dry-run
 *
 * Requires DATABASE_URL (MSK Postgres, usually via SSH tunnel :5437).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY || process.argv.includes('--dry-run');
const jsonArg = process.argv.find((a) => a.startsWith('--json='));
const JSON_OUT = jsonArg ? path.resolve(rootDir, jsonArg.slice('--json='.length)) : null;

const SOURCE_KINDS = ['ATTRACTION', 'MEETING_POINT', 'OUTDOOR_LOCATION'];

/** Same patterns as apps/web/src/lib/venue-kind-mapping.ts isTempleLikeVenueName. */
const TEMPLE_RE =
  /(?:собор|церков|храм|монастыр|мечет|синагог|кирх|часовн|костел|обител|\bлавр[аы]\b)/iu;

/** Same patterns as isBusLikeVenueName (+ task terms + brand boarding desks). */
const BUS_RE =
  /(?:автобус|\bbus\b|автовокзал|место посадки|посадка\s+на\s+автобус|экскурсия\s+на\s+автобус|hop[-\s]?on|якарели|yakareli)/iu;

/** Paid cathedral-museums must stay ATTRACTION / museum path — not TEMPLE. */
const TICKETABLE_MUSEUM_TEMPLE_RE = new RegExp(
  [
    'исаакиевск',
    'спас\\s+на\\s+крови',
    'юсуповск',
    'екатерининск\\p{L}*\\s+дворец',
    'павловск\\p{L}*\\s+дворец',
    'гатчинск\\p{L}*\\s+дворец',
    'мраморн\\p{L}*\\s+дворец',
    'михайловск\\p{L}*\\s+замок',
    'петергофск\\p{L}*\\s+дворец',
    'больш\\p{L}*\\s+дворец\\s+петергоф',
  ].join('|'),
  'iu',
);

function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

function isTempleLike(title) {
  return TEMPLE_RE.test(String(title || ''));
}

function isBusLike(title) {
  return BUS_RE.test(String(title || ''));
}

function isTicketableMuseumTemple(title, slug) {
  return TICKETABLE_MUSEUM_TEMPLE_RE.test(`${title || ''} ${slug || ''}`);
}

/**
 * @returns {{ nextKind: 'TEMPLE'|'BUS'|null, reason: string, bucket: 'migrate'|'review'|'skip' }}
 */
function classifyRow(row) {
  const title = row.title || '';
  const slug = row.slug || '';
  const desc = `${row.shortDescription || ''} ${row.description || ''}`;
  const temple = isTempleLike(title);
  const bus = isBusLike(title);

  if (!temple && !bus) {
    return { nextKind: null, reason: 'no_heuristic', bucket: 'skip' };
  }

  if (temple && bus) {
    return { nextKind: null, reason: 'ambiguous_temple_and_bus', bucket: 'review' };
  }

  // hub_only without PDP
  if (row.pageStatus === 'NONE') {
    return {
      nextKind: temple ? 'TEMPLE' : 'BUS',
      reason: 'hub_only_pageStatus_NONE',
      bucket: 'review',
    };
  }

  if (temple && isTicketableMuseumTemple(title, slug)) {
    return { nextKind: null, reason: 'ticketable_museum_temple', bucket: 'review' };
  }

  if (temple && /музей|дворец|palace|museum/iu.test(desc) && !/храм|церков|собор|монастыр/iu.test(desc)) {
    return { nextKind: null, reason: 'description_suggests_museum', bucket: 'review' };
  }

  if (temple && !['ATTRACTION', 'OUTDOOR_LOCATION'].includes(row.kind)) {
    return { nextKind: null, reason: `temple_wrong_source_kind_${row.kind}`, bucket: 'review' };
  }

  if (bus && row.kind !== 'MEETING_POINT') {
    // Bus titles on ATTRACTION are rare — review rather than force.
    return { nextKind: 'BUS', reason: `bus_from_${row.kind}`, bucket: 'review' };
  }

  if (temple) {
    return { nextKind: 'TEMPLE', reason: 'title_temple', bucket: 'migrate' };
  }
  return { nextKind: 'BUS', reason: 'title_bus', bucket: 'migrate' };
}

function expectedPath(slug) {
  return `/locations/${slug}`;
}

async function main() {
  if (APPLY && DRY && !process.argv.includes('--dry-run')) {
    // --apply without --dry-run means apply
  }
  const doApply = APPLY && !process.argv.includes('--dry-run');

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 1,
    connectionTimeoutMillis: 8000,
  });

  let rows;
  try {
    const result = await pool.query(
      `
      SELECT
        v.id,
        v.slug,
        v.title,
        v.kind::text AS kind,
        v."pageStatus"::text AS "pageStatus",
        v."canonicalPath" AS "canonicalPath",
        v."shortDescription" AS "shortDescription",
        v.description,
        c.slug AS city_slug
      FROM "Venue" v
      LEFT JOIN "City" c ON c.id = v."cityId"
      WHERE v.kind::text = ANY($1::text[])
      ORDER BY c.slug NULLS LAST, v.title
    `,
      [SOURCE_KINDS],
    );
    rows = result.rows;
  } catch (err) {
    console.error('DB connect/query failed:', err.message);
    console.error('Need DATABASE_URL or SSH tunnel to MSK Postgres :5437.');
    await pool.end().catch(() => {});
    process.exit(1);
  }

  const migrate = [];
  const review = [];
  const skip = [];

  for (const row of rows) {
    const decision = classifyRow(row);
    const item = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      city: row.city_slug,
      kind: row.kind,
      pageStatus: row.pageStatus,
      canonicalPath: row.canonicalPath,
      nextKind: decision.nextKind,
      reason: decision.reason,
      pathBefore: expectedPath(row.slug),
      pathAfter: expectedPath(row.slug),
      urlChanged: false,
    };
    if (decision.bucket === 'migrate') migrate.push(item);
    else if (decision.bucket === 'review') review.push(item);
    else skip.push(item);
  }

  const templeMigrate = migrate.filter((m) => m.nextKind === 'TEMPLE');
  const busMigrate = migrate.filter((m) => m.nextKind === 'BUS');

  console.log(`scanned source kinds ${SOURCE_KINDS.join(',')}: ${rows.length}`);
  console.log(`migrate TEMPLE: ${templeMigrate.length}`);
  console.log(`migrate BUS:    ${busMigrate.length}`);
  console.log(`review:         ${review.length}`);
  console.log(`no match:       ${skip.length}`);
  console.log(`URL family change: 0 (TEMPLE/BUS → location, same as ATTRACTION/MEETING_POINT)`);

  console.log('\n--- TEMPLE samples (up to 15) ---');
  for (const m of templeMigrate.slice(0, 15)) {
    console.log(`${m.city || '-'} | ${m.kind} → TEMPLE | ${m.slug} | ${m.title}`);
  }
  console.log('\n--- BUS samples (up to 15) ---');
  for (const m of busMigrate.slice(0, 15)) {
    console.log(`${m.city || '-'} | ${m.kind} → BUS | ${m.slug} | ${m.title}`);
  }
  console.log('\n--- REVIEW samples (up to 20) ---');
  for (const m of review.slice(0, 20)) {
    console.log(`${m.reason} | ${m.kind} | ${m.pageStatus} | ${m.slug} | ${m.title}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: doApply ? 'apply' : 'dry-run',
    scanned: rows.length,
    migrateTemple: templeMigrate.length,
    migrateBus: busMigrate.length,
    review: review.length,
    skip: skip.length,
    urlFamilyChanges: 0,
    temple: templeMigrate,
    bus: busMigrate,
    reviewRows: review,
  };

  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
    fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nWrote ${JSON_OUT}`);
  }

  if (!doApply) {
    console.log('\nDry-run only. Re-run with --apply after owner confirmation.');
    await pool.end();
    return;
  }

  // Ensure enum values exist (migration should have run first).
  const enumCheck = await pool.query(
    `SELECT enumlabel FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'VenueKind' AND enumlabel IN ('TEMPLE', 'BUS')`,
  );
  if (enumCheck.rows.length < 2) {
    console.error('Enum TEMPLE/BUS missing. Run prisma migrate deploy first.');
    await pool.end();
    process.exit(1);
  }

  let updated = 0;
  for (const batch of [templeMigrate, busMigrate]) {
    for (const m of batch) {
      const res = await pool.query(
        `UPDATE "Venue"
         SET kind = $1::"VenueKind", "updatedAt" = NOW()
         WHERE id = $2 AND kind::text = $3`,
        [m.nextKind, m.id, m.kind],
      );
      updated += res.rowCount || 0;
    }
  }

  console.log(`\nApply done. Rows updated: ${updated}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
