import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../apps/backend/src/db.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = await createDb(rootDir);

const stats = await db.query(`
  select count(*)::int as total,
    count(*) filter (where coalesce(trim("shortDescription"), '') <> '')::int as with_short,
    count(*) filter (where coalesce(trim(description), '') <> '')::int as with_desc
  from "Venue"
  where coalesce("pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
`);

const venues = await db.query(`
  select
    v.id,
    v.slug,
    v.title,
    v.kind,
    c.title as city,
    v.address,
    v.latitude,
    v.longitude,
    v."shortDescription",
    v.description,
    v."seoDescription",
    count(distinct e.id)::int as events,
    coalesce(string_agg(distinct cat.title, ', ' order by cat.title), '') as categories
  from "Venue" v
  left join "City" c on c.id = v."cityId"
  left join "Event" e on e."venueId" = v.id
  left join "Category" cat on cat.id = e."categoryId"
  where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
  group by v.id, c.title
  order by c.title nulls last, v.title
`);

console.log('Stats:', stats.rows[0]);
console.log('Venues:', venues.rows.length);

const outDir = path.join(rootDir, 'scripts', 'data');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'venues-export.json');
fs.writeFileSync(outPath, JSON.stringify(venues.rows, null, 2), 'utf8');
console.log('Written:', outPath);

process.exit(0);
