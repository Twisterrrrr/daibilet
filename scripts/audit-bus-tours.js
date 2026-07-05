const http = require('http');
const { Pool } = require('pg');
const fs = require('fs');

for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t[0] === '#') continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4000${path}`, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

const BUS_RE = /автобус|автобусн|hop[\s-]?on|hop[\s-]?off|city[\s-]?tour|сити[\s-]?тур|двухэтажн|садись[\s-]?руляй|yutong|обзорн.*автобус|автобус.*обзорн/i;

(async () => {
  const events = await fetchJson('/api/public/events?limit=500&refresh=1');
  const sessions = events.sessions || events.items || [];
  const busSessions = sessions.filter((s) => {
    const text = [s.title, s.category, ...(s.tags || []), ...(s.subcategories || []), s.venue].filter(Boolean).join(' ');
    return BUS_RE.test(text);
  });

  const venues = await fetchJson('/api/public/venues?limit=500&refresh=1');
  const busLocs = (venues.venues || []).filter((v) => v.type === 'bus');
  const pierLocs = (venues.venues || []).filter((v) => v.type === 'pier');

  console.log('=== Public catalog ===');
  console.log('Total saleable sessions:', sessions.length);
  console.log('Bus-like sessions (title/cat/tags):', busSessions.length);

  const byCity = new Map();
  for (const s of busSessions) {
    byCity.set(s.city, (byCity.get(s.city) || 0) + 1);
  }
  console.log('\nBus sessions by city:');
  [...byCity.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${n} | ${c}`));

  console.log('\nBus locations in /venues:', busLocs.length);
  for (const v of busLocs) console.log(`  ${v.events} ev | ${v.name}`);

  const { rows: dbBusEvents } = await pool.query(`
    select count(distinct e.id)::int as n
    from "Event" e
    left join "Category" cat on cat.id = e."categoryId"
    where coalesce(e.title, '') ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж'
       or coalesce(cat.title, '') ~* 'автобус'
  `);
  console.log('\n=== DB (all events, any status) ===');
  console.log('Events with bus keywords in title/category:', dbBusEvents[0].n);

  const { rows: busVenuesAll } = await pool.query(`
    select v.id, v.title, v.kind::text as kind, v.address,
      count(e.id)::int as all_events
    from "Venue" v
    left join "Event" e on e."venueId" = v.id
    where v.title ~* 'автобус|bus|сектор|yutong|hop|сити.?тур|city.?tour|парковка.*турист|турист.*транспорт'
       or v.address ~* 'автобус|bus|сектор'
    group by v.id
    order by all_events desc
    limit 40
  `);
  console.log('\nVenues with bus-related names (DB):', busVenuesAll.length);
  for (const r of busVenuesAll.slice(0, 25)) {
    console.log(`  ${r.all_events} ev | ${r.kind} | ${r.title.slice(0, 70)}`);
  }

  const { rows: sectorVenues } = await pool.query(`
    select v.title, v.kind::text as kind, count(e.id)::int as ev
    from "Venue" v
    left join "Event" e on e."venueId" = v.id
    where v.title ~* 'сектор\s*[«"'']'
      and v.title !~* 'причал|пристань'
    group by v.id
    order by ev desc
  `);
  console.log('\nSector venues (likely bus stops):', sectorVenues.length);
  for (const r of sectorVenues) console.log(`  ${r.ev} ev | ${r.kind} | ${r.title}`);

  const landing = await fetchJson('/api/public/events?landing=bus-tours&limit=200&refresh=1');
  const landingSessions = landing.sessions || landing.items || [];
  console.log('\n=== Landing bus-tours ===');
  console.log('Sessions on /landings/bus-tours:', landingSessions.length);

  await pool.end();
})().catch(async (e) => { console.error(e); process.exit(1); });
