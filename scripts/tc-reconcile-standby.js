#!/usr/bin/env node
/**
 * Reconcile TicketsCloud STAND_BY (sales stopped) into our DB.
 *
 * Full nightly sync used to fetch only PUBLIC. Events that moved to STAND_BY
 * on TC kept stale PUBLIC sourceStatus → public cards still opened TC widget
 * «Продажи временно остановлены организатором».
 *
 * Usage:
 *   node scripts/tc-reconcile-standby.js
 *   node scripts/tc-reconcile-standby.js --dry-run
 */
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(rootDir, ".env") });

const { fetchNormalizedCatalog } = require("./lib/tc-catalog-fetch");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = Date.now();

  const { catalog, endpoint, byStatus } = await fetchNormalizedCatalog({
    statuses: ["STAND_BY"],
    progressEvery: 500,
  });

  const preview = catalog.slice(0, 20).map((event) => ({
    externalId: event.externalId,
    title: event.title,
    status: event.status,
    city: event.venue?.city?.name || null,
  }));

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          endpoint,
          byStatus,
          standByEvents: catalog.length,
          elapsedMs: Date.now() - startedAt,
          sample: preview,
        },
        null,
        2,
      ),
    );
    return;
  }

  const { importCatalogEvents, TICKETSCLOUD_SOURCE_ID } = require("./tc-import-catalog");
  const importStats = await importCatalogEvents(catalog, {
    mode: "tc STAND_BY reconcile",
    skipMissingFromCatalog: true,
    endPool: true,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "standby-reconcile",
        source: TICKETSCLOUD_SOURCE_ID,
        endpoint,
        byStatus,
        standByEvents: catalog.length,
        elapsedMs: Date.now() - startedAt,
        import: importStats,
        sample: preview,
      },
      null,
      2,
    ),
  );
}
