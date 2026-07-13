import { randomUUID } from 'node:crypto';
import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const MERGE_TITLE = 'Музей Гарри Поттера';
const MERGE_GROUP_KEY = 'harry-potter-spb';
const VENUE_MATCH = `%${'гарри'}%${'поттер'}%`;
/** Numbered ticket tiers split by supplier: «Комбо 1», «Комбо 6 семейное», «Все включено», «Комбо-квест», etc. */
const COMBO_TITLE_MATCH = `(^комбо [0-9]|все включено|комбо[- ]?квест)`;

const { rows: events } = await db.query(
  `
    select e.id, e.title, v.title as venue
    from "Event" e
    join "Venue" v on v.id = e."venueId"
    where lower(v.title) like $1
      and (
        lower(e.title) ~ $2
        or lower(e.title) like '%взросл%'
        or lower(e.title) like '%детск%'
      )
      and e.status not in ('HIDDEN', 'DRAFT')
    order by e.title
  `,
  [VENUE_MATCH, COMBO_TITLE_MATCH],
);

console.log(`Found ${events.length} Harry Potter ticket products to merge.`);

let updated = 0;
for (const event of events) {
  await db.query(
    `
      insert into "EventOverride" ("id", "eventId", title, "mergeGroupKey", "updatedAt")
      values ($4, $1, $2, $3, now())
      on conflict ("eventId") do update set
        title = excluded.title,
        "mergeGroupKey" = excluded."mergeGroupKey",
        "updatedAt" = now()
    `,
    [event.id, MERGE_TITLE, MERGE_GROUP_KEY, randomUUID()],
  );
  updated += 1;
  console.log(`  ${event.title}`);
}

console.log(`Applied mergeGroupKey "${MERGE_GROUP_KEY}" to ${updated} events.`);
