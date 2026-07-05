const http = require('http');
const { Pool } = require('pg');
const fs = require('fs');

for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t[0] === '#') continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4000${path}`, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

const strictBusRe = /автобус|hop[\s-]?on|city[\s-]?tour|сити[\s-]?тур|yutong|двухэтаж/i;

(async () => {
  const first = await get('/api/public/events?limit=500&offset=0&refresh=1');
  const second = await get('/api/public/events?limit=500&offset=240&refresh=1');
  const all = [...(first.items || []), ...(second.items || [])];
  const strictBus = all.filter((s) => strictBusRe.test([s.title, s.category, ...(s.tags || []), ...(s.subcategories || [])].join(' ')));
  const pureBus = all.filter((s) => /автобус|hop[\s-]?on|city[\s-]?tour|сити[\s-]?тур|yutong|двухэтаж/i.test(s.title || ''));

  console.log('Full catalog scanned:', all.length, '/', first.total);
  console.log('Strict bus (title/cat/tags):', strictBus.length, '| unique:', new Set(strictBus.map((s) => s.title)).size);
  console.log('Pure bus (title only):', pureBus.length, '| unique:', new Set(pureBus.map((s) => s.title)).size);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const { rows } = await pool.query(`
    select city.title as city, count(distinct e.id)::int as events,
      count(distinct e.title)::int as unique_titles
    from "Event" e
    join "City" city on city.id = e."primaryCityId"
    where e.title ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж'
    group by city.title
    order by events desc
  `);
  console.log('\nDB bus events by city:');
  for (const r of rows) console.log(`  ${r.events} events / ${r.unique_titles} titles | ${r.city}`);

  const { rows: pureTitles } = await pool.query(`
    select city.title as city, left(e.title, 100) as title
    from "Event" e
    join "City" city on city.id = e."primaryCityId"
    where e.title ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж'
    group by city.title, e.title
    order by city.title, e.title
  `);
  console.log('\nAll unique bus titles in DB:', pureTitles.length);
  const catalogTitles = new Set(pureBus.map((s) => s.title.toLowerCase().trim()));
  let missing = 0;
  for (const r of pureTitles) {
    if (!catalogTitles.has(r.title.toLowerCase().trim())) {
      missing++;
      if (missing <= 15) console.log(`  MISSING catalog: ${r.city} | ${r.title}`);
    }
  }
  console.log('Total DB titles missing from catalog:', missing);

  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
