const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t[0] === '#') continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const INST = ['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'BAR'];
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const { rows } = await pool.query(
    `
    select v.id, v.title, c.title as city,
      length(coalesce(trim(v.description),'')) as desc_len,
      length(coalesce(trim(v."shortDescription"),'')) as short_len,
      count(distinct e.id)::int as events
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text,'PUBLISHED') <> 'HIDDEN'
      and v.kind::text = any($1::text[])
    group by v.id, v.title, c.title, v.description, v."shortDescription"
    having count(distinct e.id) > 0
      and length(coalesce(trim(v."shortDescription"),'')) = 0
    order by events desc
    limit 20
    `,
    [INST],
  );
  console.log('With events but empty shortDescription:', rows.length, '(showing up to 20)');
  rows.forEach((r, i) => console.log(`${i + 1}. ${r.title} | ${r.city} | desc:${r.desc_len} short:${r.short_len} events:${r.events}`));
  await pool.end();
})();
