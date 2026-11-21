#!/usr/bin/env node
/**
 * Family audit batch A - four apply classes (owner 2026-09-22).
 * Canon: docs/catalog-location-venue-canon.md
 * Report: docs/drafts/family-audit-step4-2026-09-22.md
 *
 * Usage (on MSK or via DATABASE_URL):
 *   node scripts/family-audit-batch-a.mjs --batch=path --dry-run
 *   node scripts/family-audit-batch-a.mjs --batch=path --apply
 *   node scripts/family-audit-batch-a.mjs --batch=flips --apply
 *   node scripts/family-audit-batch-a.mjs --batch=hides --apply
 *   node scripts/family-audit-batch-a.mjs --batch=kind --apply
 *
 * Order: path → flips → hides → kind. Do not mix classes in one --apply.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDb('pg');

const APPLY = process.argv.includes('--apply');
const batchArg = process.argv.find((a) => a.startsWith('--batch='));
const BATCH = batchArg ? batchArg.slice('--batch='.length).trim() : '';

/** @typedef {{ slug: string, kind?: string, path?: string | null, pageStatus?: string, note: string }} Patch */

/** @type {Record<string, Patch[]>} */
const BATCHES = {
  path: [
    {
      slug: 'rostov-na-donu-teatral-naya-ploschad',
      kind: 'OUTDOOR_LOCATION',
      path: '/locations/rostov-na-donu-teatral-naya-ploschad',
      note: 'площадь, не THEATER',
    },
    {
      slug: 'якарелия-казанская-ул-2-690af544c28f3978d69b62ba',
      path: '/venues/якарелия-казанская-ул-2-690af544c28f3978d69b62ba',
      note: 'null canonicalPath → /venues (kind уже MUSEUM)',
    },
  ],
  flips: [
    {
      slug: 'moscow-sovremennik',
      kind: 'THEATER',
      path: '/venues/moscow-sovremennik',
      note: 'театр Современник → institution',
    },
    {
      slug: 'saint-petersburg-yusupovskiy-dvorets',
      kind: 'MUSEUM_ART_SPACE',
      path: '/venues/saint-petersburg-yusupovskiy-dvorets',
      note: 'эталон дворца-музея',
    },
    {
      slug: 'saint-petersburg-tsirk-chinizelli',
      kind: 'THEATER',
      path: '/venues/saint-petersburg-tsirk-chinizelli',
      note: 'circus = THEATER до CIRCUS enum',
    },
    {
      slug: 'moscow-petrovskiy-putevoy-dvorets',
      kind: 'MUSEUM_ART_SPACE',
      path: '/venues/moscow-petrovskiy-putevoy-dvorets',
      note: 'дворец-музей / входной продукт',
    },
    {
      slug: 'osobnyak-polovcova-6009628f4511049dd531795d',
      kind: 'CONCERT_HALL',
      path: '/venues/osobnyak-polovcova-6009628f4511049dd531795d',
      note: 'сигнал 1: READY + buy (#В_СВЕЧАХ)',
    },
    {
      slug: 'osobnyak-myasnikova-69d6989a70a3e5c717a370ec',
      kind: 'CONCERT_HALL',
      path: '/venues/osobnyak-myasnikova-69d6989a70a3e5c717a370ec',
      note: 'сигнал 1: READY + buy',
    },
  ],
  hides: [
    {
      slug: 'naprotiv-teatra-sovremennik-625af9838532f4ffe3fefe4b',
      pageStatus: 'HIDDEN',
      note: 'twin title+address с moscow-sovremennik; 301 alias → moscow-sovremennik (не MEETING_POINT)',
    },
    {
      slug: 'yusupovskiy-dvorec-63986bf7a7df',
      pageStatus: 'HIDDEN',
      note: 'twin → HIDDEN; 301 alias → saint-petersburg-yusupovskiy-dvorets',
    },
    {
      slug: 'petrovskii-putevoi-dvorec-5cd1bf3d079a40000c1e0639',
      pageStatus: 'HIDDEN',
      note: 'twin → HIDDEN; 301 alias → moscow-petrovskiy-putevoy-dvorets',
    },
  ],
  kind: [
    {
      slug: 'moscow-depo-lesnaya',
      kind: 'GASTRO',
      path: '/locations/moscow-depo-lesnaya',
      note: 'kind-only: ATTRACTION → GASTRO, URL не едет',
    },
  ],
};

function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function main() {
  if (!BATCHES[BATCH]) {
    console.error(
      `Usage: --batch=path|flips|hides|kind [--dry-run|--apply]\nGot batch=${JSON.stringify(BATCH)}`,
    );
    process.exit(2);
  }

  const patches = BATCHES[BATCH];
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 1,
  });

  console.log(`batch=${BATCH} apply=${APPLY} n=${patches.length}`);

  for (const p of patches) {
    const before = await pool.query(
      `SELECT slug, kind::text AS kind, "canonicalPath", "pageStatus"::text AS status, "isIndexable"
       FROM "Venue" WHERE slug = $1`,
      [p.slug],
    );
    if (!before.rowCount) {
      console.error(`MISSING ${p.slug}`);
      continue;
    }
    const row = before.rows[0];
    console.log(
      `  before ${row.slug}  ${row.kind}  ${row.canonicalPath || 'null'}  ${row.status}  :: ${p.note}`,
    );

    if (!APPLY) continue;

    const sets = ['"updatedAt" = NOW()'];
    const params = [p.slug];
    let i = 2;
    if (p.kind) {
      sets.push(`kind = $${i}::"VenueKind"`);
      params.push(p.kind);
      i += 1;
    }
    if (p.path !== undefined) {
      sets.push(`"canonicalPath" = $${i}`);
      params.push(p.path);
      i += 1;
    }
    if (p.pageStatus) {
      sets.push(`"pageStatus" = $${i}::"VenuePageStatus"`);
      params.push(p.pageStatus);
      i += 1;
      if (p.pageStatus === 'HIDDEN') {
        sets.push('"isIndexable" = false');
      }
    }

    const res = await pool.query(
      `UPDATE "Venue" SET ${sets.join(', ')} WHERE slug = $1
       RETURNING slug, kind::text AS kind, "canonicalPath", "pageStatus"::text AS status, "isIndexable"`,
      params,
    );
    const after = res.rows[0];
    console.log(
      `  after  ${after.slug}  ${after.kind}  ${after.canonicalPath || 'null'}  ${after.status}  indexable=${after.isIndexable}`,
    );
  }

  if (!APPLY) console.log('dry-run only (pass --apply to write)');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
