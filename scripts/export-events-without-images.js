import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const { rows } = await db.query(`
  select
    e.id,
    e.title,
    e.slug,
    coalesce(c.title, 'unknown') as category,
    coalesce(city.title, '') as city,
    coalesce(v.title, '') as venue
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  left join "Category" c on c.id = e."categoryId"
  left join "City" city on city.id = e."primaryCityId"
  left join "Venue" v on v.id = e."venueId"
  where e.status not in ('HIDDEN', 'DRAFT')
    and coalesce(nullif(trim(e."imageUrl"), ''), '') = ''
    and coalesce(nullif(trim(o."imageUrl"), ''), '') = ''
  order by e.title, e.id
`);

const outPath = path.join(rootDir, 'data', 'events-without-images.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} events to ${outPath}`);
for (const row of rows.slice(0, 20)) {
  console.log(`${row.category} | ${row.city} | ${row.title}`);
}
