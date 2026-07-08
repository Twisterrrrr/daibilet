/**
 * Сравнить: institution в каталоге API vs описания в БД.
 * node scripts/audit-venues-catalog-missing-desc.js
 */
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

const INST = ['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'BAR'];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

(async () => {
  // Все institution с событиями (как в hub, упрощённо)
  const { rows: withEvents } = await pool.query(
    `
    select v.id, v.title, c.title as city, v.kind::text as kind,
      coalesce(trim(v.description), '') as description,
      coalesce(trim(v."shortDescription"), '') as short_description,
      v."pageStatus"::text as status,
      count(distinct e.id)::int as events
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and v.kind::text = any($1::text[])
    group by v.id, v.title, c.title, v.kind, v.description, v."shortDescription", v."pageStatus"
    having count(distinct e.id) > 0
    order by events desc
    `,
    [INST],
  );

  const noDesc = withEvents.filter((r) => !r.description && !r.short_description);
  const noShort = withEvents.filter((r) => !r.short_description);

  console.log(`Institution venues with events: ${withEvents.length}`);
  console.log(`Without description AND shortDescription: ${noDesc.length}`);
  console.log(`Without shortDescription (catalog cards): ${noShort.length}`);
  console.log('--- Top without any text ---');
  noDesc.slice(0, 30).forEach((r, i) => {
    console.log(`${i + 1}. ${r.title} | ${r.city} | events:${r.events} | ${r.status}`);
  });

  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
