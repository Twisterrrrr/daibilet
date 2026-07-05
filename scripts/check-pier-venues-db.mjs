import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../apps/backend/src/db.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = await createDb(rootDir);

const summary = await db.query(`
  select coalesce(v.kind::text, 'OTHER') as kind, count(*)::int as venues
  from "Venue" v
  where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
  group by 1
  order by venues desc
`);
console.log('Venue kinds in DB:', summary.rows);

const pierStored = await db.query(`
  select v.id, v.title, v.address, v.kind::text as kind,
    count(e.id)::int as events,
    string_agg(distinct cat.title, ', ' order by cat.title) as categories
  from "Venue" v
  left join "Event" e on e."venueId" = v.id
  left join "Category" cat on cat.id = e."categoryId"
  where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
    and (
      v.kind::text in ('PIER', 'PIER_WATER')
      or v.title ~* 'причал|пристан|сектор|речной вокзал'
      or v.address ~* 'причал|пристан|наб\\.'
    )
  group by v.id, v.title, v.address, v.kind
  order by events desc nulls last
  limit 60
`);

console.log('\nPier-related venues (stored + name):', pierStored.rows.length);
for (const row of pierStored.rows) {
  console.log(`${row.events || 0} ev | kind=${row.kind} | ${row.title} | ${row.categories || '-'}`);
}

process.exit(0);
