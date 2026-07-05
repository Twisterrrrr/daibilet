const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = '/opt/daibilet/.env';
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
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
  const ids = [
    'venue_63cb89057ad8e1bcd59fe024',
    'venue_5cb872663ef8f5000bc634bd',
    'venue_629310d2b0a8b47d0a47e0e7',
    'venue_695d4ab5d8cb433cb116364f',
    'venue_tep_77',
    'venue_686d044da479b3c07a240887',
  ];
  const { rows } = await pool.query(`
    select v.id, v.title, c.title as city, v.address,
           left(v."shortDescription", 80) as short,
           left(v.description, 80) as descr
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    where v.id = any($1::text[])
  `, [ids]);
  for (const row of rows) {
    console.log('---');
    console.log(row.title);
    console.log('city:', row.city);
    console.log('address:', row.address);
    console.log('short:', row.short);
  }
  const { rows: counts } = await pool.query(`
    select count(*)::int as n
    from "Venue"
    where kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT')
      and coalesce("shortDescription", description) is not null
  `);
  console.log('---');
  console.log('Institutions with description:', counts[0].n);
  await pool.end();
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
