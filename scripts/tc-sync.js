#!/usr/bin/env node
/**
 * Ticketscloud catalog sync entrypoint.
 *
 * Full catalog (nightly / maintenance):
 *   npm run tc:sync
 *   npm run tc:full-sync && npm run tc:import
 *
 * On-demand upsert by event ids (not a full-sync replacement):
 *   npm run tc:sync -- --ids=id1,id2,id3
 *   npm run tc:sync -- --ids id1,id2 --dry-run
 *
 * --dry-run: fetch + normalize only, no DB writes / revalidate.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const { fetchNormalizedCatalog } = require("./lib/tc-catalog-fetch");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.ids.length) {
    if (options.dryRun) {
      console.error("--dry-run without --ids is not supported (would fetch entire PUBLIC catalog). Use: npm run tc:sync -- --ids=... --dry-run");
      process.exitCode = 1;
      return;
    }
    runFullSyncPipeline();
    return;
  }

  await runIdsSync(options);
}

async function runIdsSync(options) {
  const { importCatalogEvents, TICKETSCLOUD_SOURCE_ID } = require("./tc-import-catalog");
  const startedAt = Date.now();
  const { catalog, endpoint, missingIds, requestedIds } = await fetchNormalizedCatalog({
    ids: options.ids,
    timeoutMs: Number(process.env.TICKETSCLOUD_IDS_SYNC_TIMEOUT_MS || 120000),
  });

  const preview = catalog.map((event) => ({
    externalId: event.externalId,
    title: event.title,
    status: event.status,
    startsAt: event.startsAt,
    city: event.venue?.city?.name || null,
    venue: event.venue?.name || null,
    priceFrom: event.priceFrom,
    imageUrl: Boolean(event.imageUrl),
  }));

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "ids-dry-run",
          dryRun: true,
          endpoint,
          requestedIds,
          missingIds,
          fetched: catalog.length,
          elapsedMs: Date.now() - startedAt,
          events: preview,
        },
        null,
        2,
      ),
    );
    return;
  }

  const importStats = await importCatalogEvents(catalog, {
    mode: `ids upsert (${requestedIds.length})`,
    skipMissingFromCatalog: true,
  });

  // Persist/promote/generate covers after upsert (CDN first; generate only if empty).
  const covers = spawnSync(process.execPath, [path.join(rootDir, "scripts", "ensure-catalog-covers.js")], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (covers.status) {
    process.exitCode = covers.status;
    return;
  }

  if (!options.skipRevalidate) {
    const revalidate = spawnSync(process.execPath, [path.join(rootDir, "scripts", "post-catalog-sync-warm.mjs")], {
      cwd: rootDir,
      env: {
        ...process.env,
        // ids upsert: always light warm (never full stack after small patch)
        TC_CATALOG_SYNC_FULL_WARM: "0",
      },
      stdio: "inherit",
      windowsHide: true,
    });
    if (revalidate.status) {
      process.exitCode = revalidate.status;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "ids-upsert",
        source: TICKETSCLOUD_SOURCE_ID,
        endpoint,
        requestedIds,
        missingIds,
        fetched: catalog.length,
        elapsedMs: Date.now() - startedAt,
        import: importStats,
        events: preview,
      },
      null,
      2,
    ),
  );
}

function runFullSyncPipeline() {
  const steps = [
    ["scripts/tc-full-sync.js"],
    ["scripts/tc-import-catalog.js"],
    // After import: promote CDN/event images to venues; generate only when truly empty.
    ["scripts/ensure-catalog-covers.js"],
    // Light revalidate/warm by default; set TC_CATALOG_SYNC_FULL_WARM=1 for nightly full warm.
    ["scripts/post-catalog-sync-warm.mjs"],
  ];

  for (const [script] of steps) {
    const result = spawnSync(process.execPath, [path.join(rootDir, script)], {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    if (result.status) {
      process.exit(result.status);
    }
  }
}

function parseArgs(argv) {
  const options = {
    ids: [],
    dryRun: false,
    skipRevalidate: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run" || arg === "--dryRun") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--skip-revalidate") {
      options.skipRevalidate = true;
      continue;
    }
    if (arg === "--ids" || arg.startsWith("--ids=")) {
      const raw = arg === "--ids" ? argv[++i] : arg.slice("--ids=".length);
      options.ids.push(...parseIds(raw));
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      options.help = true;
      process.exitCode = 1;
    }
  }

  options.ids = [...new Set(options.ids.map(String).map((id) => id.trim()).filter(Boolean))];
  return options;
}

function parseIds(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function printHelp() {
  console.log(`Usage:
  npm run tc:sync                              # full PUBLIC fetch + import + light revalidate/warm
  npm run tc:sync -- --ids=id1,id2,id3         # on-demand upsert by Ticketscloud event ids
  npm run tc:sync -- --ids id1,id2 --dry-run   # fetch+normalize only (no DB write)

Flags:
  --ids=... | --ids ...   comma/space-separated Ticketscloud event ids
  --dry-run               with --ids: no DB writes / revalidate
  --skip-revalidate       with --ids: skip Next/API warm after upsert
  -h, --help              show this help

Env:
  TC_CATALOG_SYNC_FULL_WARM=1   full public warm after full sync (venues/cities/landings/admin)
  (default light warm — preferred for nightly timer)

Does not replace nightly/full sync. Existing events are upserted (prices/dates/images refresh).
--ids scopes ProviderLink sync to imported Event ids only.`);
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
