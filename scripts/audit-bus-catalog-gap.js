const http = require('http');

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:4000${path}`, (res) => {
      let b = '';
      res.on('data', (c) => { b += c; });
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  const all = await fetchJson('/api/public/events?limit=500&refresh=1');
  const landing = await fetchJson('/api/public/events?landing=bus-tours&limit=200&refresh=1');
  const sessions = all.sessions || [];

  const busRe = /автобус|hop[\s-]?on|city[\s-]?tour|сити[\s-]?тур|yutong|двухэтаж/i;
  const busSessions = sessions.filter((s) => busRe.test([s.title, s.category, s.venue, ...(s.tags || [])].join(' ')));

  const uniqueTitles = new Set(busSessions.map((s) => s.title));
  const uniqueVenues = new Set(busSessions.map((s) => s.venue).filter(Boolean));

  console.log('Unique bus products in catalog:', uniqueTitles.size);
  for (const t of [...uniqueTitles].sort()) console.log(' -', t);

  console.log('\nUnique bus venues in catalog:', uniqueVenues.size);
  for (const v of [...uniqueVenues].sort()) console.log(' -', v);

  const landingSessions = landing.sessions || [];
  console.log('\nLanding bus-tours sessions:', landingSessions.length);
  console.log('Landing unique titles:', new Set(landingSessions.map((s) => s.title)).size);

  const onLanding = new Set(landingSessions.map((s) => s.id));
  const missingFromLanding = busSessions.filter((s) => !onLanding.has(s.id));
  console.log('\nIn catalog but NOT on bus-tours landing:', missingFromLanding.length);
  for (const s of missingFromLanding) console.log(` - ${s.city} | ${s.title}`);

  await import('pg').then(async ({ Pool }) => {
    const fs = await import('fs');
    for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t[0] === '#') continue;
      const i = t.indexOf('=');
      if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    const { rows } = await pool.query(`
      select left(e.title, 100) as title, city.title as city
      from "Event" e
      join "City" city on city.id = e."primaryCityId"
      where e.title ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж'
      group by e.title, city.title
      order by city.title, e.title
    `);
    console.log('\nUnique bus event titles in DB:', rows.length);
    const catalogTitles = new Set([...uniqueTitles].map((t) => t.toLowerCase().trim()));
    const notInCatalog = rows.filter((r) => !catalogTitles.has(r.title.toLowerCase().trim()));
    console.log('DB titles not represented in public catalog:', notInCatalog.length);
    for (const r of notInCatalog.slice(0, 20)) console.log(` - ${r.city} | ${r.title}`);
    await pool.end();
  });
})().catch((e) => { console.error(e); process.exit(1); });
