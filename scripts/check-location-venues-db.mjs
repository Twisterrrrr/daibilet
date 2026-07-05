import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../apps/backend/src/db.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = await createDb(rootDir);
const result = await db.query(`
  with loc as (
    select
      v.id,
      v.title,
      v.address,
      v.kind,
      case
        when v.title ~* 'причал|пристан|сектор|речной вокзал|наб\\.'
          or v.address ~* 'причал|пристан|наб\\.'
        then true
        else false
      end as pier_like
    from "Venue" v
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and coalesce(v.kind::text, 'OTHER') not in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'MEETING_POINT', 'ONLINE', 'PIER', 'PIER_WATER')
  ),
  agg as (
    select
      l.id,
      l.title,
      l.kind,
      l.pier_like,
      cat.title as category,
      count(*)::int as cnt
    from loc l
    join "Event" e on e."venueId" = l.id
    left join "Category" cat on cat.id = e."categoryId"
    group by 1, 2, 3, 4, 5
  )
  select
    pier_like,
    count(distinct id)::int as venues,
    sum(cnt)::int as events,
    coalesce(string_agg(distinct category, ', ' order by category), '') as categories
  from agg
  group by pier_like
  order by pier_like desc
`);

console.log('Summary by pier_like flag among non-pier stored kind:');
for (const row of result.rows) {
  console.log(row);
}

const samples = await db.query(`
  with loc as (
    select v.id, v.title, v.address, v.kind
    from "Venue" v
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and coalesce(v.kind::text, 'OTHER') in ('VENUE', 'OTHER', 'OUTDOOR_LOCATION', 'SPORT_ACTIVITY_SPACE', 'ATTRACTION')
      and (
        v.title ~* 'причал|пристан|сектор|речной вокзал|наб\\.'
        or v.address ~* 'причал|пристан|наб\\.'
      )
  )
  select l.title, l.address, cat.title as category, count(*)::int as cnt,
    min(e.title) as sample_event
  from loc l
  join "Event" e on e."venueId" = l.id
  left join "Category" cat on cat.id = e."categoryId"
  group by 1, 2, 3
  order by cnt desc
  limit 40
`);

console.log('\nTop pier-like venue-type locations by event category:');
for (const row of samples.rows) {
  console.log(`${row.cnt}x [${row.category}] ${row.title} — ${row.sample_event}`);
}

process.exit(0);
