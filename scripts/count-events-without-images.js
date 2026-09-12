import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const stats = await db.query(`
  select
    count(*)::int as total,
    count(*) filter (
      where coalesce(nullif(trim(e."imageUrl"), ''), '') = ''
        and coalesce(nullif(trim(o."imageUrl"), ''), '') = ''
    )::int as no_image
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  where e.status not in ('HIDDEN', 'DRAFT')
`);

console.log(JSON.stringify(stats.rows[0], null, 2));

const byCategory = await db.query(`
  select coalesce(c.title, 'unknown') as category, count(*)::int as count
  from "Event" e
  left join "EventOverride" o on o."eventId" = e.id
  left join "Category" c on c.id = e."categoryId"
  where e.status not in ('HIDDEN', 'DRAFT')
    and coalesce(nullif(trim(e."imageUrl"), ''), '') = ''
    and coalesce(nullif(trim(o."imageUrl"), ''), '') = ''
  group by c.title
  order by count desc
`);

console.log('By category:');
for (const row of byCategory.rows) console.log(`  ${row.count} | ${row.category}`);
