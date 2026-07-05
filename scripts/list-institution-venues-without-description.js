const { Pool } = require('pg');
const fs = require('fs');

for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t[0] === '#') continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const INSTITUTION_KINDS = [
  'MUSEUM_ART_SPACE',
  'THEATER',
  'CONCERT_HALL',
  'CLUB_BAR_RESTAURANT',
  'BAR',
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const { rows } = await pool.query(
    `
    select v.title, v.address, v.kind::text as kind, c.title as city,
      count(distinct e.id)::int as events
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and coalesce(trim(v.description), '') = ''
      and coalesce(trim(v."shortDescription"), '') = ''
      and v.kind::text = any($1::text[])
    group by v.id, v.title, v.address, v.kind, c.title
    order by events desc, v.title
    `,
    [INSTITUTION_KINDS],
  );

  console.log(`Учреждения без описания: ${rows.length}`);
  rows.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title} | ${r.address || '—'}`);
  });

  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
