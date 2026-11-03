import 'dotenv/config';

import { createDb } from '../apps/backend/src/db.js';
import { ensureDraftEventPageForEvent } from '../apps/backend/src/event-pages.js';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';
const database = new URL(databaseUrl);
const apply = process.argv.includes('--apply');

if (!['127.0.0.1', 'localhost', '::1'].includes(database.hostname)) {
  throw new Error(`Refusing non-local EventPage provisioning target: ${database.hostname}`);
}

const db = createDb(process.cwd());
const eligibleEvents = await db.query(`
  SELECT event.id
  FROM "Event" event
  WHERE upper(coalesce(event.status::text, '')) <> 'HIDDEN'
    AND lower(event.id) NOT LIKE 'evt_stub_%'
    AND EXISTS (
      SELECT 1 FROM "EventOffer" offer
      WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE
        AND (
          (upper(event.kind::text) = 'OPEN_DATE'
            AND (event."openDateValidTo" IS NULL OR event."openDateValidTo" >= now()))
          OR EXISTS (
            SELECT 1 FROM "EventSession" session
            WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
              AND session."cancelledAt" IS NULL
              AND lower(coalesce(session."sourceStatus", '')) NOT IN
                ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden', 'stand_by', 'closed', 'sales_closed', 'sale_closed', 'not_for_sale')
              AND (
                (session."startsAt" IS NOT NULL AND session."startsAt" >= now() - interval '15 minutes')
                OR (session."startsAt" IS NOT NULL AND session."endsAt" IS NOT NULL
                  AND session."startsAt" < now() AND session."endsAt" >= now()
                  AND session."endsAt" - session."startsAt" < interval '36 hours')
                OR lower(coalesce(session."sourceStatus", '')) IN ('open_date', 'widget')
              )
          )
        )
    )
  ORDER BY event.id
`);

if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', database: database.pathname, eligibleEvents: eligibleEvents.rowCount }));
  await db.close?.();
} else {
  const stats = { mode: 'apply', database: database.pathname, checked: eligibleEvents.rowCount, created: 0, existing: 0, skipped: 0 };
  for (const row of eligibleEvents.rows) {
    const result = await db.transaction(({ query }) => ensureDraftEventPageForEvent({ query }, row.id));
    if (!result) stats.skipped += 1;
    else if (result.created) stats.created += 1;
    else stats.existing += 1;
  }
  console.log(JSON.stringify(stats));
  await db.close?.();
}
