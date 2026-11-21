import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const rawDatabaseUrl = process.env.EVENTPAGE_STAGING_DATABASE_URL;
if (!rawDatabaseUrl) throw new Error('Set EVENTPAGE_STAGING_DATABASE_URL explicitly; this smoke writes only temporary tables.');
const target = new URL(rawDatabaseUrl);
if (target.hostname !== '127.0.0.1' || target.port !== '5438' || target.pathname !== '/daibilet_staging') {
  throw new Error(`Refusing non-staging database target ${target.hostname}:${target.port}${target.pathname}`);
}

const { resolvePublicEventPageEventIds } = await import(pathToFileURL(path.join(root, 'apps/backend/src/event-pages.js')).href);
const requireFromBackend = createRequire(path.join(root, 'apps/backend/package.json'));
const { Pool } = requireFromBackend('pg');
const pool = new Pool({ connectionString: rawDatabaseUrl, max: 1 });
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const tx = { query: (sql, params) => client.query(sql, params) };
  await tx.query(`
      CREATE TEMP TABLE "EventPageEvent" ("eventPageId" text, "eventId" text) ON COMMIT DROP;
      CREATE TEMP TABLE "Event" (id text, title text, "primaryCityId" text, status text, "venueId" text) ON COMMIT DROP;
      CREATE TEMP TABLE "Source" (id text, code text) ON COMMIT DROP;
      CREATE TEMP TABLE "EventSourceLink" ("eventId" text, "sourceId" text, "metaExternalId" text, "externalId" text) ON COMMIT DROP;
      CREATE TEMP TABLE "RawImportRecord" ("sourceId" text, "entityType" text, "externalId" text, payload jsonb) ON COMMIT DROP;
      CREATE TEMP TABLE "EventOffer" ("eventId" text, active boolean) ON COMMIT DROP;
      CREATE TEMP TABLE "EventSession" ("eventId" text, "isActive" boolean, "cancelledAt" timestamptz, "startsAt" timestamptz) ON COMMIT DROP;
      INSERT INTO "Source" VALUES ('tc', 'TICKETSCLOUD');
      INSERT INTO "Event" VALUES
        ('slot-1', '25.11.2026 — River Jazz', 'moscow', 'READY', 'pier-a'),
        ('slot-2', '26.11.2026 — River Jazz', 'moscow', 'READY', 'pier-b'),
        ('other-product', 'Christmas Jazz', 'moscow', 'READY', 'pier-c');
      INSERT INTO "EventSourceLink" VALUES
        ('slot-1', 'tc', 'parent-1', 'source-event-1'),
        ('slot-2', 'tc', 'parent-1', 'source-event-2'),
        ('other-product', 'tc', 'parent-1', 'source-event-3');
      INSERT INTO "RawImportRecord" VALUES
        ('tc', 'event_provider_metadata', 'source-event-1', '{"organizerId":"org-1","seller":{"id":"seller-1"}}'),
        ('tc', 'event_provider_metadata', 'source-event-2', '{"organizerId":"org-1","seller":{"id":"seller-1"}}'),
        ('tc', 'event_provider_metadata', 'source-event-3', '{"organizerId":"org-1","seller":{"id":"seller-1"}}');
      INSERT INTO "EventOffer" VALUES ('slot-1', true), ('slot-2', true), ('other-product', true);
      INSERT INTO "EventSession" VALUES
        ('slot-1', true, null, now() + interval '1 day'),
        ('slot-2', true, null, now() + interval '2 days'),
        ('other-product', true, null, now() + interval '3 days');
      INSERT INTO "EventPageEvent" VALUES ('page-1', 'slot-1');
    `);

    assert.deepEqual(
      await resolvePublicEventPageEventIds(tx, 'page-1', ['slot-1']),
      ['slot-1', 'slot-2'],
      'same provider parent/city/product with matching provider identity should expand both slots',
    );

    await tx.query(`INSERT INTO "EventPageEvent" VALUES ('page-2', 'slot-2')`);
    assert.deepEqual(
      await resolvePublicEventPageEventIds(tx, 'page-1', ['slot-1']),
      ['slot-1'],
      'a product group linked to multiple pages must not be merged automatically',
    );

    await tx.query(`DELETE FROM "EventPageEvent" WHERE "eventPageId" = 'page-2'`);
    await tx.query(`UPDATE "RawImportRecord" SET payload = '{"organizerId":"org-2","seller":{"id":"seller-2"}}' WHERE "externalId" = 'source-event-2'`);
    assert.deepEqual(
      await resolvePublicEventPageEventIds(tx, 'page-1', ['slot-1']),
      ['slot-1'],
      'a provider/organizer conflict must keep the sibling slot separate',
    );

    await tx.query(`UPDATE "RawImportRecord" SET payload = '{"organizerId":"org-1","seller":{"id":"seller-1"}}' WHERE "externalId" = 'source-event-2'`);
    assert.deepEqual(
      await resolvePublicEventPageEventIds(tx, 'page-1', ['slot-1']),
      ['slot-1', 'slot-2'],
      'a different product title under the same provider parent must not contaminate the page',
    );
  await client.query('ROLLBACK');
  console.log(JSON.stringify({ ok: true, staging: '127.0.0.1:5438/daibilet_staging', checks: 4, writes: 'temporary tables only; transaction rolled back' }));
} finally {
  await client.query('ROLLBACK').catch(() => {});
  client.release();
  await pool.end();
}
