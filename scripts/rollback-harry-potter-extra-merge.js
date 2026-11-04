import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = createDb(rootDir);

const VENUE_MATCH = `%${'гарри'}%${'поттер'}%`;

const { rowCount } = await db.query(
  `
    update "EventOverride" override
    set title = null, "updatedAt" = now()
    from "Event" e
    join "Venue" v on v.id = e."venueId"
    where override."eventId" = e.id
      and lower(v.title) like $1
      and override.title = 'Музей Гарри Поттера'
      and lower(e.title) !~ '^комбо [0-9]'
  `,
  [VENUE_MATCH],
);

console.log(`Cleared merge override from ${rowCount} non-numbered combo events.`);
