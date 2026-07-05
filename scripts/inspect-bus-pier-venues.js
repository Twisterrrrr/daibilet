const { Pool } = require('pg');
const fs = require('fs');

for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!process.env[key]) process.env[key] = value;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const { rows } = await pool.query(`
    select v.id, v.title, v.address, v.kind::text as kind,
      count(e.id)::int as events,
      string_agg(distinct cat.title, ', ' order by cat.title) as categories
    from "Venue" v
    left join "Event" e on e."venueId" = v.id
    left join "Category" cat on cat.id = e."categoryId"
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and (
        v.kind::text = 'PIER'
        or v.title ~* 'причал|пристан'
      )
    group by v.id
    having string_agg(distinct cat.title, ', ') ~* 'автобус|экскурс'
    order by events desc nulls last
    limit 40
  `);
  console.log('Pier-like with excursion categories:', rows.length);
  for (const row of rows) {
    console.log(`${row.events} | ${row.kind} | ${row.title.slice(0,60)} | ${row.categories || '-'}`);
  }

  const zero = await pool.query(`
    select v.id, v.title, v.kind::text as kind, count(e.id)::int as all_events
    from "Venue" v
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and v.kind::text not in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'MEETING_POINT', 'ONLINE')
    group by v.id
    having count(e.id) > 0
    order by all_events desc
    limit 5
  `);
  console.log('\nSample location venues with DB events:', zero.rows.length);

  await pool.end();
})();
