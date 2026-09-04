#!/usr/bin/env node
/**
 * Reconcile cancelled/deleted TicketsCloud events.
 *
 * TC only lists PUBLIC + STAND_BY. Events that left both feeds stay stale in DB
 * and still open the widget («Мероприятие отменено организатором»).
 *
 * Fetches live PUBLIC∪STAND_BY ids and marks everything else cancelled/HIDDEN.
 *
 * Usage:
 *   node scripts/tc-reconcile-missing.js
 *   node scripts/tc-reconcile-missing.js --dry-run
 */
const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(rootDir, ".env") });

const { fetchNormalizedCatalog } = require("./lib/tc-catalog-fetch");
const {
  TICKETSCLOUD_SOURCE_ID,
  deactivateMissingTicketscloudEvents,
} = require("./lib/tc-deactivate-missing");

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = Date.now();

  const { catalog, endpoint, byStatus } = await fetchNormalizedCatalog({
    statuses: ["PUBLIC", "STAND_BY"],
    progressEvery: 1000,
  });

  const liveIds = catalog.map((event) => String(event.externalId || "")).filter(Boolean);

  const connectionString =
    process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
  const pool = new Pool({ connectionString, max: 2 });
  const client = await pool.connect();

  try {
    if (dryRun) {
      const preview = await client.query(
        `
          select esl."externalId", e.slug, e.title, e."sourceStatus"
          from "EventSourceLink" esl
          join "Event" e on e.id = esl."eventId"
          where esl."sourceId" = $1
            and esl."externalId" <> all($2::text[])
            and lower(coalesce(e."sourceStatus", '')) not in (
              'cancelled', 'canceled', 'deleted', 'hidden', 'stand_by'
            )
          order by e."updatedAt" desc nulls last
          limit 30
        `,
        [TICKETSCLOUD_SOURCE_ID, liveIds],
      );

      console.log(
        JSON.stringify(
          {
            ok: true,
            dryRun: true,
            endpoint,
            byStatus,
            liveEvents: liveIds.length,
            wouldDeactivate: preview.rows.length >= 30 ? "30+" : preview.rows.length,
            sample: preview.rows,
            elapsedMs: Date.now() - startedAt,
          },
          null,
          2,
        ),
      );
      return;
    }

    await client.query("BEGIN");
    const deactivated = await deactivateMissingTicketscloudEvents(client, liveIds);
    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "tc-missing-cancelled-reconcile",
          source: TICKETSCLOUD_SOURCE_ID,
          endpoint,
          byStatus,
          liveEvents: liveIds.length,
          elapsedMs: Date.now() - startedAt,
          ...deactivated,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
