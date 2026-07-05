const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
for (const name of ['.env', 'apps/backend/.env']) {
  const filePath = path.join(rootDir, name);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    if (!process.env[trimmed.slice(0, eq).trim()]) process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

(async () => {
  const { rows } = await pool.query(`
    select v.id, v.slug, v.title, v.kind, c.title as city, v.address,
           coalesce(trim(v."shortDescription"), '') <> '' as has_short,
           coalesce(trim(v.description), '') <> '' as has_desc
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    where v.kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT')
    order by v.title
  `);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
