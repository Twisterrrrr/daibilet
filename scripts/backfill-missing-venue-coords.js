#!/usr/bin/env node
/**
 * Backfill missing Venue.latitude/longitude for known locations that owner
 * supplied via editorial / public coords, but which live on parallel TC
 * institution rows (venue_inst_*) or pier stubs that enrich never matched.
 *
 * Usage on MSK:
 *   node scripts/backfill-missing-venue-coords.js --dry-run
 *   node scripts/backfill-missing-venue-coords.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

/** @type {Array<{ slug: string, latitude: number, longitude: number, note?: string }>} */
const COORDS_BY_SLUG = [
  // SPb institution duplicates (editorial used saint-petersburg-* / ermitazh slugs)
  { slug: 'kazanskiy-sobor-7abab1bd1ddf', latitude: 59.9342, longitude: 30.3246 },
  { slug: 'kunstkamera-7781ff68ac5a', latitude: 59.9414, longitude: 30.3046 },
  { slug: 'mariinskiy-teatr-3ffb1e35a442', latitude: 59.9256, longitude: 30.2959 },
  { slug: 'russkiy-muzey-c5b60f6c6057', latitude: 59.9387, longitude: 30.3324 },
  { slug: 'yusupovskiy-dvorec-63986bf7a7df', latitude: 59.9293, longitude: 30.2989 },
  { slug: 'pavlovskiy-dvorec-145de6e04a72', latitude: 59.6854, longitude: 30.4532 },
  { slug: 'isaakievskaya-pl-769', latitude: 59.9319, longitude: 30.3062 },
  {
    slug: 'dvorcovaya-naberezhnaya-18-prichal-no4-681d44a7fc03029d63123730',
    latitude: 59.9415,
    longitude: 30.3155,
  },
  { slug: 'pl-vosstaniya-6a27e5aa03f4b9692e87d7b3', latitude: 59.9314, longitude: 30.3609 },
  {
    slug: 'mesto-vstrechi-na-put-raskolnikova-665433d79147484c839a91d4',
    latitude: 59.9275,
    longitude: 30.335,
  },
  {
    slug: 'ekskursiya-vladimirskii-dvorec-686d044da479b3c07a240887',
    latitude: 59.9408,
    longitude: 30.3142,
  },

  // Moscow institutions / piers
  { slug: 'moskovskiy-zoopark-3013563d956d', latitude: 55.7614, longitude: 37.5783 },
  { slug: 'novaya-tretyakovskaya-galereya-ff57ae659039', latitude: 55.7415, longitude: 37.6059 },
  { slug: 'болотная-пл-у-пам-и-е-репину-653', latitude: 55.7447, longitude: 37.6205 },
  {
    slug: 'москворецкая-ул-парковка-туристического-транспорта-через-дорогу-от-ул-варварка-6-661',
    latitude: 55.752,
    longitude: 37.624,
  },
  {
    slug: 'москворецкая-ул-парковка-туристического-транспорта-через-дорогу-от-ул-варварка-6-1300',
    latitude: 55.752,
    longitude: 37.624,
  },
  {
    slug: 'смотровая-площадка-на-крыше-небоскреба-москва-сити-выше-только-любовь-370',
    latitude: 55.7494,
    longitude: 37.5375,
  },
  {
    slug: 'metro-botanicheskii-sad-67da93abe57d2588613f3d3c',
    latitude: 55.8453,
    longitude: 37.6394,
  },

  // Other cities
  {
    slug: 'площадь-минина-и-пожарского-у-дмитриевскои-башни-кремля-783',
    latitude: 56.3287,
    longitude: 44.0031,
  },
  { slug: 'место-отправления-teplohod-1210', latitude: 55.7894, longitude: 49.1221 }, // Kazan river
  { slug: 'место-отправления-teplohod-1130', latitude: 57.6226, longitude: 39.8975 }, // Yaroslavl river
];

async function main() {
  const apply = process.argv.includes('--apply');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const report = { checked: 0, already: 0, wouldUpdate: 0, updated: 0, missing: [] };

  try {
    for (const item of COORDS_BY_SLUG) {
      report.checked += 1;
      const { rows } = await pool.query(
        `select id, slug, title, latitude, longitude from "Venue" where slug = $1 limit 1`,
        [item.slug],
      );
      if (!rows[0]) {
        report.missing.push(item.slug);
        continue;
      }
      const row = rows[0];
      if (row.latitude != null && row.longitude != null) {
        report.already += 1;
        continue;
      }
      report.wouldUpdate += 1;
      console.log(
        `${apply ? 'UPDATE' : 'DRY'} ${row.slug} (${row.title}) → ${item.latitude}, ${item.longitude}`,
      );
      if (apply) {
        await pool.query(
          `update "Venue" set latitude = $2, longitude = $3, "updatedAt" = now() where id = $1`,
          [row.id, item.latitude, item.longitude],
        );
        report.updated += 1;
      }
    }

    // Also copy coords from editorial twin by exact title when twin has coords.
    const twin = await pool.query(`
      with missing as (
        select v.id, v.title, v."cityId"
        from "Venue" v
        where v."pageStatus" in ('PUBLISHED','CANDIDATE')
          and (v.latitude is null or v.longitude is null)
      ),
      twin as (
        select distinct on (m.id) m.id as missing_id, t.latitude, t.longitude, t.slug as twin_slug
        from missing m
        join "Venue" t
          on t.title = m.title
         and t.id <> m.id
         and t.latitude is not null
         and t.longitude is not null
         and (m."cityId" is null or t."cityId" is null or m."cityId" = t."cityId")
        order by m.id, t."updatedAt" desc
      )
      select * from twin
    `);

    for (const row of twin.rows) {
      report.wouldUpdate += 1;
      console.log(
        `${apply ? 'UPDATE' : 'DRY'} twin-fill id=${row.missing_id} from ${row.twin_slug} → ${row.latitude}, ${row.longitude}`,
      );
      if (apply) {
        await pool.query(
          `update "Venue" set latitude = $2, longitude = $3, "updatedAt" = now() where id = $1 and (latitude is null or longitude is null)`,
          [row.missing_id, row.latitude, row.longitude],
        );
        report.updated += 1;
      }
    }

    const left = await pool.query(`
      select count(*)::int as n
      from "Venue"
      where "pageStatus" in ('PUBLISHED','CANDIDATE')
        and (latitude is null or longitude is null)
    `);
    report.remainingNull = left.rows[0].n;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

function loadRootEnv(dir) {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
