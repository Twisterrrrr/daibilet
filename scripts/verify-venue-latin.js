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
const lat = /[A-Za-z]/;
const ids = [
  'venue_5cb872663ef8f5000bc634bd',
  'venue_5d31acb16534e21caeccade9',
  'venue_61cb88abf769223dda74a528',
  'venue_5e4992bab32f3dbc2a41bb7e',
];

(async () => {
  const { rows } = await pool.query(`
    select v.id, v.title, c.title as city, v.address
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    where v.id = any($1::text[])
  `, [ids]);

  for (const row of rows) {
    const bad = ['title', 'city', 'address'].filter((f) => lat.test(row[f] || ''));
    console.log(`${bad.length ? 'FAIL' : 'OK'} ${row.title}`);
    console.log(`  city=${row.city}`);
    console.log(`  address=${row.address}`);
    if (bad.length) console.log(`  latin in: ${bad.join(', ')}`);
  }

  const { rows: latinRows } = await pool.query(`
    select count(*)::int as n
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    where v.kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT')
      and (
        v.title ~ '[A-Za-z]' or coalesce(v.address, '') ~ '[A-Za-z]' or coalesce(c.title, '') ~ '[A-Za-z]'
      )
  `);
  console.log('---');
  console.log('Institution venues with Latin in title/city/address:', latinRows[0].n);
  await pool.end();
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
