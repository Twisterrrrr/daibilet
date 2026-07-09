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
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const INSTITUTION = ['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'BAR'];
const KIND_LABEL = {
  PIER: 'причал',
  PIER_WATER: 'причал',
  BUS: 'автобус',
  OUTDOOR_LOCATION: 'открытая',
  ATTRACTION: 'достопримечательность',
  SPORT_ACTIVITY_SPACE: 'спорт',
  VENUE: 'площадка',
  OTHER: 'другое',
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const { rows } = await pool.query(
    `
    select v.title, c.title as city, v.address, v.latitude, v.longitude, v.kind::text as kind, v.slug,
      count(e.id)::int as events
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and v.kind::text <> all($1::text[])
    group by v.id, c.title
    having count(e.id) > 0
    order by c.title, v.title
    `,
    [['MEETING_POINT', 'ONLINE', ...INSTITUTION]],
  );

  const hubIds = new Set();
  const publicRows = [];
  for (const row of rows) {
    const kind = String(row.kind || 'OTHER').toUpperCase();
    if (kind === 'MEETING_POINT' || kind === 'ONLINE') continue;
    publicRows.push(row);
  }

  console.log(JSON.stringify({ total: publicRows.length, rows: publicRows }, null, 0));
  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
