import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const catalog = await db.query(`
  with event_base as (
    select e.id, e.title, override.title as "overrideTitle", v.title as venue,
      city.title as city
    from "Event" e
    join "Venue" v on v.id = e."venueId"
    left join "City" city on city.id = e."primaryCityId"
    left join "EventOverride" override on override."eventId" = e.id
    where lower(v.title) like '%гарри%поттер%'
      and override.title = 'Музей Гарри Поттера'
  )
  select distinct e.title, count(*)::int as cnt
  from event_base e
  group by e.title
  order by cnt desc, e.title
`);

console.log('Distinct source titles with merge override:');
for (const row of catalog.rows) {
  console.log(`  ${row.cnt}x | ${row.title}`);
}

const apiCheck = await db.query(`
  select count(distinct concat_ws('|', lower(city), lower(venue), coalesce(override.title, e.title))) as groups
  from "Event" e
  join "Venue" v on v.id = e."venueId"
  left join "City" city on city.id = e."primaryCityId"
  left join "EventOverride" override on override."eventId" = e.id
  where lower(v.title) like '%гарри%поттер%'
    and e.status not in ('HIDDEN', 'DRAFT')
`);

console.log('Title groups at HP venue:', apiCheck.rows[0].groups);
