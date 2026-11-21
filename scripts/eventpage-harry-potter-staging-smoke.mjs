import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const rawDatabaseUrl = process.env.EVENTPAGE_STAGING_DATABASE_URL;
if (!rawDatabaseUrl) throw new Error('Set EVENTPAGE_STAGING_DATABASE_URL explicitly');
const target = new URL(rawDatabaseUrl);
if (target.hostname !== '127.0.0.1' || target.port !== '5438' || target.pathname !== '/daibilet_staging') {
  throw new Error(`Refusing non-staging database target ${target.hostname}:${target.port}${target.pathname}`);
}

const require = createRequire(new URL('../apps/backend/package.json', import.meta.url));
const { Pool } = require('pg');
const { createAdminEventPage, ensureDraftEventPageForEvent } = await import('../apps/backend/src/event-pages.js');
const pool = new Pool({ connectionString: rawDatabaseUrl, max: 1 });
const client = await pool.connect();
const suffix = randomUUID();
const comboEvents = [
  { id: 'evt_6acf819270daa8b2b82d2576', number: 1 },
  { id: 'evt_6ad0734070d4290bd2f48a66', number: 2 },
  { id: 'evt_6acfc2b348ee7d8885f48a80', number: 3 },
  { id: 'evt_6ad06774062acd4330f48a66', number: 5 },
  { id: 'evt_6ad059eace44a4071df48a79', number: 6 },
  { id: 'evt_6acfce063b09390146f48a78', number: 7 },
];
const familyEventId = `codex-hp-family-${randomUUID()}`;
const canonicalSlug = 'muzei-garri-pottera-sankt-peterburg';

try {
  await client.query('BEGIN');
  const city = await client.query('SELECT id FROM "City" WHERE id = $1', ['city_498817']);
  assert.equal(city.rows.length, 1, 'fixture city must already exist in staging');
  const pageConflict = await client.query(`
    SELECT 1 FROM "EventPage" WHERE slug = $1
    UNION ALL SELECT 1 FROM "EventPageRoute" WHERE path = $2
    LIMIT 1
  `, [canonicalSlug, `/events/${canonicalSlug}`]);
  assert.equal(pageConflict.rows.length, 0, 'canonical slug must be free for this rollback-only smoke');

  const venue = await client.query('SELECT id FROM "Venue" WHERE id = $1', ['venue_683e8e0935b8fc7a60f565d3']);
  if (!venue.rows.length) {
    await client.query(`
      INSERT INTO "Venue" (id, slug, title, "cityId", "updatedAt")
      VALUES ($1, $2, $3, $4, now())
    `, ['venue_683e8e0935b8fc7a60f565d3', `codex-hp-fixture-${suffix}`, 'Harry Potter fixture venue', 'city_498817']);
  }

  const tx = { query: (sql, params) => client.query(sql, params) };
  const db = { transaction: (callback) => callback(tx) };
  for (const { id: eventId, number } of comboEvents) {
    await tx.query(`
      INSERT INTO "Event" (id, title, slug, kind, status, "primaryCityId", "venueId", "updatedAt")
      VALUES ($1, $2, $3, 'SINGLE', 'READY', 'city_498817', 'venue_683e8e0935b8fc7a60f565d3', now())
    `, [eventId, `Комбо ${number}`, `${eventId}-slug`]);
    await tx.query(`
      INSERT INTO "EventOffer" (id, "eventId", "sourceCode", active)
      VALUES ($1, $2, 'TICKETSCLOUD', true)
    `, [`offer-${eventId}`, eventId]);
    await tx.query(`
      INSERT INTO "EventSession" (id, "eventId", "startsAt", "isActive")
      VALUES ($1, $2, now() + interval '60 days', true)
    `, [`session-${eventId}`, eventId]);
    const shell = await createAdminEventPage(db, {
      slug: `kombo-${number}-sankt-peterburg`,
      title: `Комбо ${number}`,
      summary: null,
      content: { sections: [] },
      seoH1: `Комбо ${number}`,
      seoTitle: `Комбо ${number} | Дайбилет`,
      eventIds: [eventId],
    });
    assert.equal(shell.status, 'DRAFT');
    assert.equal(shell.isIndexable, false);
  }

  for (const { id: eventId, number } of comboEvents) {
    const result = await ensureDraftEventPageForEvent(tx, eventId);
    assert.ok(result, `combo ${number} should be provisioned or grouped`);
    assert.equal(result.slug, canonicalSlug);
  }

  const grouped = await tx.query(`
    SELECT page.id, page.slug, page.status, page."isIndexable", page."publishedAt",
      page.summary, page.content,
      (SELECT count(*)::int FROM "EventPageEvent" link WHERE link."eventPageId" = page.id) AS event_count,
      (SELECT count(*)::int FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) AS revision_count,
      (SELECT count(*)::int FROM "EventPageRoute" route WHERE route."eventPageId" = page.id) AS route_count
    FROM "EventPage" page WHERE page.slug = $1
  `, [canonicalSlug]);
  assert.equal(grouped.rows.length, 1, 'all seven combo products should have one EventPage');
  assert.equal(grouped.rows[0].event_count, 6, 'each current combo should be a purchase option');
  assert.equal(grouped.rows[0].status, 'DRAFT');
  assert.equal(grouped.rows[0].isIndexable, false);
  assert.equal(grouped.rows[0].publishedAt, null);
  assert.equal(grouped.rows[0].summary, null);
  assert.deepEqual(grouped.rows[0].content, { sections: [] });
  assert.equal(grouped.rows[0].route_count, 7, `old candidate routes and the stable route should be retained; got ${JSON.stringify(grouped.rows[0])}`);

  await tx.query(`
    INSERT INTO "Event" (id, title, slug, kind, status, "primaryCityId", "venueId", "updatedAt")
    VALUES ($1, 'Комбо 6 семейное', $2, 'SINGLE', 'READY', 'city_498817', 'venue_683e8e0935b8fc7a60f565d3', now())
  `, [familyEventId, `${familyEventId}-family-slug`]);
  await tx.query(`INSERT INTO "EventOffer" (id, "eventId", "sourceCode", active) VALUES ($1, $2, 'TICKETSCLOUD', true)`, [`offer-${familyEventId}`, familyEventId]);
  await tx.query(`INSERT INTO "EventSession" (id, "eventId", "startsAt", "isActive") VALUES ($1, $2, now() + interval '60 days', true)`, [`session-${familyEventId}`, familyEventId]);
  const familyResult = await ensureDraftEventPageForEvent(tx, familyEventId);
  assert.ok(familyResult?.created, 'the separately named family combo should keep its own page');
  assert.notEqual(familyResult.slug, canonicalSlug);
  const familyOverride = await tx.query('SELECT "mergeGroupKey" FROM "EventOverride" WHERE "eventId" = $1', [familyEventId]);
  assert.equal(familyOverride.rows[0]?.mergeGroupKey ?? null, null);

  await tx.query(`
    UPDATE "EventPage" SET summary = 'Editorial content must be preserved', content = '{"sections":[{"type":"text","body":"Editorial"}]}'::jsonb
    WHERE id = $1
  `, [grouped.rows[0].id]);
  const protectedResult = await ensureDraftEventPageForEvent(tx, comboEvents[0].id);
  assert.equal(protectedResult.id, grouped.rows[0].id, 'reprocessing an existing combo must keep its current page');
  const protectedPage = await tx.query(`
    SELECT summary, content, (SELECT count(*)::int FROM "EventPageEvent" link WHERE link."eventPageId" = page.id) AS event_count
    FROM "EventPage" page WHERE page.id = $1
  `, [grouped.rows[0].id]);
  assert.equal(protectedPage.rows[0].summary, 'Editorial content must be preserved');
  assert.deepEqual(protectedPage.rows[0].content, { sections: [{ type: 'text', body: 'Editorial' }] });
  assert.equal(protectedPage.rows[0].event_count, 6);

  console.log(JSON.stringify({
    ok: true,
    staging: `${target.hostname}:${target.port}${target.pathname}`,
    checks: ['six current numbered combo pages grouped into one draft', 'each combo retained as a purchase option', 'family combo stays separate', 'editorially populated page is protected'],
    writes: 'temporary fixture rows only; transaction rolled back',
  }));
} finally {
  await client.query('ROLLBACK').catch(() => {});
  client.release();
  await pool.end();
}
