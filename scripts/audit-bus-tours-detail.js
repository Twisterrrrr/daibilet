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

(async () => {
  const { rows: busEventsDetail } = await pool.query(`
    with future as (
      select es."eventId", count(*)::int as slots,
        min(es."startsAt") filter (where es."startsAt" >= now()) as next_at
      from "EventSession" es
      group by es."eventId"
    ),
    offers as (
      select "eventId", count(*) filter (where active = true)::int as active_offers,
        min("priceRub") filter (where active = true and "priceRub" >= 100) as min_price
      from "EventOffer"
      group by "eventId"
    )
    select
      e.id,
      left(e.title, 80) as title,
      city.title as city,
      v.title as venue,
      v.kind::text as venue_kind,
      coalesce(f.slots, 0) as future_slots,
      f.next_at,
      coalesce(o.active_offers, 0) as offers,
      o.min_price
    from "Event" e
    left join "City" city on city.id = e."primaryCityId"
    left join "Venue" v on v.id = e."venueId"
    left join future f on f."eventId" = e.id
    left join offers o on o."eventId" = e.id
    where coalesce(e.title, '') ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж|обзорн.*автобус'
       or coalesce(e.title, '') ~* 'сектор'
    order by future_slots desc nulls last, city.title, e.title
    limit 80
  `);

  let withFuture = 0;
  let withOffer = 0;
  let inCatalogLikely = 0;
  const missingSectors = [];

  console.log('=== Bus-ish events: saleability breakdown ===');
  for (const r of busEventsDetail) {
    const saleable = r.future_slots > 0 && r.offers > 0 && r.min_price >= 100;
    if (r.future_slots > 0) withFuture++;
    if (r.offers > 0 && r.min_price >= 100) withOffer++;
    if (saleable) inCatalogLikely++;
    if (/сектор/i.test(r.venue || r.title) && !saleable) {
      missingSectors.push(r);
    }
  }
  console.log(`Sampled rows: ${busEventsDetail.length}`);
  console.log(`With future sessions: ${withFuture}`);
  console.log(`With active offer >=100: ${withOffer}`);
  console.log(`Likely in public catalog: ${inCatalogLikely}`);

  console.log('\n=== Saleable bus-ish events ===');
  for (const r of busEventsDetail.filter((x) => x.future_slots > 0 && x.offers > 0 && x.min_price >= 100).slice(0, 20)) {
    console.log(`  ${r.city} | ${r.future_slots} slots | ${r.min_price}₽ | ${r.venue_kind} | ${r.title}`);
  }

  console.log('\n=== Moscow sectors WITHOUT saleable sessions (hidden from /locations) ===');
  for (const r of missingSectors.filter((x) => x.city === 'Москва').slice(0, 15)) {
    console.log(`  slots=${r.future_slots} offers=${r.offers} | ${r.venue} | ${r.title?.slice(0, 50)}`);
  }

  const events = await fetchJson('/api/public/events?limit=500&refresh=1');
  const sessions = events.sessions || [];
  const busInCatalog = sessions.filter((s) => /автобус|hop|city tour|сити.?тур|yutong|двухэтаж/i.test([s.title, s.category, s.venue].join(' ')));

  console.log('\n=== Bus sessions: venue assignment ===');
  const venueCounts = new Map();
  for (const s of busInCatalog) {
    const key = s.venue || '(no venue)';
    venueCounts.set(key, (venueCounts.get(key) || 0) + 1);
  }
  [...venueCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${n} | ${k}`));

  const { rows: cities } = await pool.query(`
    select city.title, count(distinct e.id)::int as bus_events
    from "Event" e
    join "City" city on city.id = e."primaryCityId"
    where e.title ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж'
    group by city.title
    order by bus_events desc
  `);
  console.log('\n=== Bus events by city (DB, all) ===');
  for (const r of cities) console.log(`  ${r.bus_events} | ${r.title}`);

  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
