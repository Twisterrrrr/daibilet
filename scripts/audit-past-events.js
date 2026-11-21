const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet",
  max: 1,
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => pool.end());

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query(`
      WITH session_state AS (
        SELECT
          session."eventId",
          count(*)::int AS "sessionCount",
          count(*) FILTER (WHERE session."endsAt" < now())::int AS "pastSessionCount",
          count(*) FILTER (
            WHERE session."isActive" IS TRUE
              AND session."cancelledAt" IS NULL
              AND session."archivedAt" IS NULL
              AND COALESCE(session."endsAt", session."startsAt") >= now()
          )::int AS "currentOrFutureSessionCount",
          count(*) FILTER (
            WHERE COALESCE(session."endsAt", session."startsAt") >= now()
              AND (
                session."isActive" IS NOT TRUE
                OR session."cancelledAt" IS NOT NULL
                OR session."archivedAt" IS NOT NULL
              )
          )::int AS "inactiveCurrentOrFutureSessionCount"
        FROM "EventSession" session
        GROUP BY session."eventId"
      ), offer_state AS (
        SELECT
          offer."eventId",
          count(*) FILTER (WHERE offer.active IS TRUE)::int AS "activeOfferCount",
          string_agg(DISTINCT offer."sourceCode"::text, ', ' ORDER BY offer."sourceCode"::text)
            FILTER (WHERE offer.active IS TRUE) AS "activeOfferSources"
        FROM "EventOffer" offer
        GROUP BY offer."eventId"
      ), classified AS (
        SELECT
          event.id,
          event.title,
          event.slug,
          event.kind::text AS kind,
          event.status::text AS status,
          COALESCE(city.title, '') AS city,
          COALESCE(venue.title, '') AS venue,
          COALESCE(offer_state."activeOfferCount", 0) AS "activeOfferCount",
          COALESCE(offer_state."activeOfferSources", 'unknown') AS "activeOfferSources",
          COALESCE(session_state."sessionCount", 0) AS "sessionCount",
          COALESCE(session_state."pastSessionCount", 0) AS "pastSessionCount",
          COALESCE(session_state."currentOrFutureSessionCount", 0) AS "currentOrFutureSessionCount",
          COALESCE(session_state."inactiveCurrentOrFutureSessionCount", 0) AS "inactiveCurrentOrFutureSessionCount",
          CASE
            WHEN event.kind::text = 'OPEN_DATE' THEN 'open_date_excluded'
            WHEN COALESCE(session_state."currentOrFutureSessionCount", 0) > 0 THEN 'current_or_future_sessions'
            WHEN COALESCE(session_state."pastSessionCount", 0) > 0 THEN 'past_sessions_only'
            WHEN COALESCE(session_state."inactiveCurrentOrFutureSessionCount", 0) > 0 THEN 'inactive_current_or_future_only'
            WHEN COALESCE(session_state."sessionCount", 0) = 0 THEN 'no_sessions'
            ELSE 'no_current_or_future_schedule'
          END AS "scheduleState"
        FROM "Event" event
        LEFT JOIN "City" city ON city.id = event."primaryCityId"
        LEFT JOIN "Venue" venue ON venue.id = event."venueId"
        LEFT JOIN session_state ON session_state."eventId" = event.id
        LEFT JOIN offer_state ON offer_state."eventId" = event.id
      )
      SELECT
        kind,
        status,
        "scheduleState",
        "activeOfferSources",
        count(*)::int AS "eventCount",
        count(*) FILTER (WHERE "activeOfferCount" > 0)::int AS "eventsWithActiveOffer",
        count(*) FILTER (WHERE "activeOfferCount" > 0 AND "scheduleState" = 'past_sessions_only')::int AS "activeOfferPastOnly",
        count(*) FILTER (WHERE "activeOfferCount" > 0 AND "scheduleState" = 'no_sessions')::int AS "activeOfferNoSessions",
        count(*) FILTER (WHERE "activeOfferCount" > 0 AND "scheduleState" = 'inactive_current_or_future_only')::int AS "activeOfferInactiveScheduleOnly"
      FROM classified
      WHERE kind <> 'OPEN_DATE'
      GROUP BY kind, status, "scheduleState", "activeOfferSources"
      ORDER BY kind, status, "scheduleState", "activeOfferSources"
    `);
    await client.query("ROLLBACK");

    const actionable = result.rows.filter((row) =>
      Number(row.activeOfferPastOnly) > 0
      || Number(row.activeOfferNoSessions) > 0
      || Number(row.activeOfferInactiveScheduleOnly) > 0,
    );
    console.log(JSON.stringify({
      mode: "read-only-audit",
      checkedAt: new Date().toISOString(),
      policy: "Report only; no event, offer, session, indexability, route, canonical, or sitemap changes.",
      openDateExcluded: true,
      actionableGroups: actionable,
    }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function loadRootEnv(projectRoot) {
  const fs = require("fs");
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}
