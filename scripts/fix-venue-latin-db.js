/**
 * Убирает латиницу из title/address/city всех учреждений в БД.
 *
 *   node scripts/fix-venue-latin-db.js --dry-run
 *   node scripts/fix-venue-latin-db.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { normalizePublicText } = require('./lib/latin-to-cyrillic');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

function loadEnv() {
  for (const name of ['.env', 'apps/backend/.env']) {
    const filePath = path.join(rootDir, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

const lat = /[A-Za-z]/;

(async () => {
  const client = await pool.connect();
  const { rows } = await client.query(`
    select v.id, v.title, v.address, c.id as "cityId", c.title as city
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    where v.kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT')
  `);

  let updated = 0;
  await client.query('begin');

  for (const row of rows) {
    const nextTitle = normalizePublicText(row.title);
    const nextAddress = row.address ? normalizePublicText(row.address) : null;
    const nextCity = row.city ? normalizePublicText(row.city) : null;
    const titleChanged = nextTitle !== row.title;
    const addressChanged = nextAddress !== row.address;
    const cityChanged = nextCity && nextCity !== row.city;

    if (!titleChanged && !addressChanged && !cityChanged) continue;

    if (dryRun) {
      console.log(`→ ${row.title}`);
      if (titleChanged) console.log(`  title: ${nextTitle}`);
      if (addressChanged) console.log(`  address: ${nextAddress}`);
      if (cityChanged) console.log(`  city: ${nextCity}`);
      updated += 1;
      continue;
    }

    let cityId = row.cityId;
    if (cityChanged) {
      const cityLookup = await client.query(`select id from "City" where lower(trim(title)) = lower(trim($1)) limit 1`, [nextCity]);
      if (cityLookup.rows[0]) {
        cityId = cityLookup.rows[0].id;
      }
    }

    await client.query(
      `update "Venue" set title = $2, address = $3, "cityId" = coalesce($4, "cityId"), "updatedAt" = now() where id = $1`,
      [row.id, nextTitle, nextAddress, cityChanged ? cityId : null],
    );
    updated += 1;
  }

  if (dryRun) await client.query('rollback');
  else await client.query('commit');

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Updated: ${updated}`);
  client.release();
  await pool.end();
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
