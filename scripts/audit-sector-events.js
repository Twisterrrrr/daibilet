const { Pool } = require('pg');
const fs = require('fs');

for (const line of fs.readFileSync('/opt/daibilet/.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t[0] === '#') continue;
  const i = t.indexOf('=');
  if (i > 0 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const { rows } = await pool.query(`
    select e.id, left(e.title, 100) as title, e."sourceStatus",
      count(es.id) filter (where es."startsAt" >= now())::int as future_slots,
      min(o."priceRub") filter (where o.active = true) as min_offer,
      count(o.id) filter (where o.active = true)::int as offers,
      bool_or(o."widgetUrl" is not null or o."deeplinkUrl" is not null) as has_widget,
      sl."externalId", src.code as source
    from "Venue" v
    join "Event" e on e."venueId" = v.id
    left join "EventSession" es on es."eventId" = e.id
    left join "EventOffer" o on o."eventId" = e.id
    left join "EventSourceLink" sl on sl."eventId" = e.id
    left join "Source" src on src.id = sl."sourceId"
    where v.title like '%Устьинский сектор «B»%'
    group by e.id, sl."externalId", src.code
    order by future_slots desc
    limit 8
  `);
  console.log('Events at Китай-город/Устьинский сектор «B»:');
  for (const r of rows) {
    console.log(JSON.stringify(r));
  }

  const { rows: spbGather } = await pool.query(`
    select left(e.title, 90) as title, v.title as venue, v.kind::text,
      count(es.id) filter (where es."startsAt" >= now())::int as slots
    from "Event" e
    join "Venue" v on v.id = e."venueId"
    join "City" c on c.id = e."primaryCityId"
    left join "EventSession" es on es."eventId" = e.id
    where c.title = 'Санкт-Петербург' and e.title ~* 'автобус'
    group by e.id, v.title, v.kind
    order by slots desc
    limit 12
  `);
  console.log('\nTop SPb bus events by slots:');
  for (const r of spbGather) console.log(`  ${r.slots} | ${r.kind} | ${r.venue?.slice(0,40)} | ${r.title}`);

  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
