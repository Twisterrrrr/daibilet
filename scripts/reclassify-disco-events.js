import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '../apps/backend/src/db.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { ENTERTAINMENT_DISCO_TAXONOMY, isDiscoOrPartyEvent } = require('./lib/event-taxonomy.js');

const db = createDb(rootDir);
const { categoryId, subcategoryId } = ENTERTAINMENT_DISCO_TAXONOMY;

const { rows } = await db.query(
  `
    select
      e.id,
      e.title,
      e.description,
      c.title as category,
      coalesce(
        array_agg(distinct t.title) filter (where t.title is not null),
        '{}'
      ) as tags
    from "Event" e
    left join "Category" c on c.id = e."categoryId"
    left join "EventTag" et on et."eventId" = e.id
    left join "Tag" t on t.id = et."tagId"
    where e."categoryId" = 'cat_excursions'
    group by e.id, e.title, e.description, c.title
  `,
);

const candidates = rows.filter((row) => isDiscoOrPartyEvent({ title: row.title, description: row.description, tags: row.tags }));

console.log(`Found ${candidates.length} disco/party events in excursions:`);
for (const row of candidates.slice(0, 15)) {
  console.log(`  ${row.id} | ${row.title}`);
}
if (candidates.length > 15) console.log(`  ... and ${candidates.length - 15} more`);

if (!candidates.length) process.exit(0);

const ids = candidates.map((row) => row.id);

await db.query(
  `
    update "Event"
    set "categoryId" = $1,
        "primarySubcategoryId" = $2,
        "updatedAt" = now()
    where id = any($3::text[])
  `,
  [categoryId, subcategoryId, ids],
);

for (const eventId of ids) {
  await db.query(
    `
      insert into "EventSubcategory" ("eventId", "subcategoryId", "isPrimary")
      values ($1, $2, true)
      on conflict ("eventId", "subcategoryId") do update set "isPrimary" = true
    `,
    [eventId, subcategoryId],
  );
}

console.log(`Reclassified ${ids.length} events to «Развлечения».`);
