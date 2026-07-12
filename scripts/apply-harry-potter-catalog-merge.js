import { randomUUID } from 'node:crypto';
import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const MERGE_TITLE = 'Музей Гарри Поттера';
const VENUE_MATCH = `%${'гарри'}%${'поттер'}%`;
/** Numbered ticket tiers split by supplier: «Комбо 1», «Комбо 6 семейное», etc. */
const COMBO_TITLE_MATCH = `^комбо [0-9]`;

const { rows: events } = await db.query(
  `
    select e.id, e.title, v.title as venue
    from "Event" e
    join "Venue" v on v.id = e."venueId"
    where lower(v.title) like $1
      and lower(e.title) ~ $2
      and e.status not in ('HIDDEN', 'DRAFT')
    order by e.title
  `,
  [VENUE_MATCH, COMBO_TITLE_MATCH],
);

console.log(`Found ${events.length} numbered combo events at Harry Potter museum.`);

let updated = 0;
for (const event of events) {
  await db.query(
    `
      insert into "EventOverride" ("id", "eventId", title, "updatedAt")
      values ($3, $1, $2, now())
      on conflict ("eventId") do update set
        title = excluded.title,
        "updatedAt" = now()
    `,
    [event.id, MERGE_TITLE, randomUUID()],
  );
  updated += 1;
}

console.log(`Applied override title "${MERGE_TITLE}" to ${updated} events.`);
