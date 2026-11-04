#!/usr/bin/env node
/**
 * Apply latitude/longitude from CITY_INFO.moscow mustSee onto Venue rows
 * that still lack coords. Run on MSK with prod DATABASE_URL.
 *
 *   node scripts/apply-moscow-mustsee-coords.js --dry-run
 *   node scripts/apply-moscow-mustsee-coords.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const dryRun = !process.argv.includes('--apply');
const cityInfoPath = path.join(rootDir, 'apps/web/src/lib/cityInfo.ts');

function loadRootEnv(dir) {
  for (const rel of ['.env', 'apps/backend/.env']) {
    const p = path.join(dir, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

function extractMoscowCoords(src) {
  const start = Math.max(src.indexOf("'moscow':"), src.indexOf('moscow:'));
  if (start < 0) throw new Error('moscow block not found');
  const mustSeeKey = src.indexOf('mustSee:', start);
  const arrStart = src.indexOf('[', mustSeeKey);
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  const block = src.slice(arrStart, arrEnd + 1);
  const rows = [];
  const re = /\{[^{}]*?\}/gs;
  let m;
  while ((m = re.exec(block))) {
    const o = m[0];
    const slug = (o.match(/(?:venueSlug|locationSlug):\s*'([^']+)'/) || [])[1];
    const lat = Number((o.match(/latitude:\s*([-.\d]+)/) || [])[1]);
    const lon = Number((o.match(/longitude:\s*([-.\d]+)/) || [])[1]);
    if (slug && Number.isFinite(lat) && Number.isFinite(lon)) {
      rows.push({ slug, lat, lon });
    }
  }
  return rows;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL required');
  const rows = extractMoscowCoords(fs.readFileSync(cityInfoPath, 'utf8'));
  const requireFromDb = createRequire(path.join(rootDir, 'packages/db/package.json'));
  const { Pool } = requireFromDb('pg');
  const pool = new Pool({ connectionString, max: 1 });

  let updated = 0;
  let already = 0;
  let missing = 0;
  for (const r of rows) {
    const cur = await pool.query(
      `select id, latitude, longitude from "Venue" where slug = $1 limit 1`,
      [r.slug],
    );
    if (!cur.rows[0]) {
      missing += 1;
      continue;
    }
    const v = cur.rows[0];
    if (v.latitude != null && v.longitude != null) {
      already += 1;
      continue;
    }
    if (!dryRun) {
      await pool.query(
        `update "Venue" set latitude = $1, longitude = $2, "updatedAt" = now() where id = $3`,
        [r.lat, r.lon, v.id],
      );
    }
    updated += 1;
  }

  const check = await pool.query(`
    select count(*)::int as total,
      count(*) filter (where latitude is null or longitude is null)::int as no_coords
    from "Venue"
    where slug like 'moscow-%' and "cityId" = 'city_524901'
  `);

  console.log(
    JSON.stringify(
      {
        dryRun,
        fromCityInfo: rows.length,
        wouldOrDidUpdate: updated,
        alreadyHadCoords: already,
        missingVenue: missing,
        db: check.rows[0],
      },
      null,
      2,
    ),
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
