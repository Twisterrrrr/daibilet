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
  const { rows: spbBus } = await pool.query(`
    select
      count(distinct e.id)::int as events,
      count(distinct es.id) filter (where es."startsAt" >= now())::int as future_sessions,
      count(distinct e.id) filter (
        where exists (
          select 1 from "EventOffer" o
          where o."eventId" = e.id and o.active = true and o."priceRub" >= 100
        )
        and exists (
          select 1 from "EventSession" s
          where s."eventId" = e.id and s."startsAt" >= now()
        )
      )::int as saleable_events
    from "Event" e
    join "City" city on city.id = e."primaryCityId"
    left join "EventSession" es on es."eventId" = e.id
    where city.title = 'Санкт-Петербург'
      and e.title ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж'
  `);
  console.log('SPb bus events DB:', spbBus[0]);

  const { rows: moscowSectors } = await pool.query(`
    select v.title as venue,
      count(distinct e.id)::int as events,
      count(distinct es.id) filter (where es."startsAt" >= now())::int as future_sessions
    from "Venue" v
    left join "Event" e on e."venueId" = v.id
    left join "EventSession" es on es."eventId" = e.id
    where v.title ~* 'сектор'
      and v.title !~* 'причал|пристань'
    group by v.id, v.title
    order by future_sessions desc, events desc
  `);
  console.log('\nMoscow sector venues:');
  for (const r of moscowSectors) {
    console.log(`  future=${r.future_sessions} all=${r.events} | ${r.venue}`);
  }

  const { rows: meetingBus } = await pool.query(`
    select v.title, count(distinct e.id)::int as ev,
      count(distinct es.id) filter (where es."startsAt" >= now())::int as future_slots
    from "Venue" v
    join "Event" e on e."venueId" = v.id
    left join "EventSession" es on es."eventId" = e.id
    where v.kind::text = 'MEETING_POINT'
      and e.title ~* 'автобус'
    group by v.id, v.title
    order by future_slots desc
    limit 20
  `);
  console.log('\nMEETING_POINT venues with bus events:');
  for (const r of meetingBus) console.log(`  future=${r.future_slots} ev=${r.ev} | ${r.title}`);

  const { rows: hiddenBusVenues } = await pool.query(`
    with saleable as (
      select distinct e."venueId" as id
      from "Event" e
      join "EventSession" es on es."eventId" = e.id and es."startsAt" >= now()
      join "EventOffer" o on o."eventId" = e.id and o.active = true and o."priceRub" >= 100
      where e.title ~* 'автобус|hop.?on|city.?tour|сити.?тур|yutong|двухэтаж'
    )
    select v.title, v.kind::text as kind, v."pageStatus"::text as status,
      exists(select 1 from saleable s where s.id = v.id) as has_saleable
    from "Venue" v
    where v.title ~* 'автобус|сектор|yutong|hop|парковка.*турист'
       or v.id in (select id from saleable)
    order by has_saleable desc, v.title
    limit 35
  `);
  console.log('\nBus-related venues saleable flag:');
  for (const r of hiddenBusVenues) {
    console.log(`  ${r.has_saleable ? 'YES' : 'NO '} | ${r.kind} | ${r.title.slice(0, 75)}`);
  }

  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
