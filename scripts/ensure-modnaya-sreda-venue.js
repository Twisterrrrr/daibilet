#!/usr/bin/env node
/**
 * Ensure Ticketscloud venue «Модная среда 1823» is public-hub eligible.
 * Symptom: /venues/modnaya-sreda-1823-68d4062e38b75e8343b393ca → soft 404
 * while event cards still link the slug.
 *
 * Usage:
 *   node scripts/ensure-modnaya-sreda-venue.js --dry-run
 *   node scripts/ensure-modnaya-sreda-venue.js
 */
const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const VENUE_ID = "venue_68d4062e38b75e8343b393ca";
const dryRun = process.argv.includes("--dry-run");
const connectionString = process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
const pool = new Pool({ connectionString, max: 2 });

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

async function main() {
  const before = await pool.query(
    `select id, slug, title, kind::text, "pageStatus"::text, address, "shortDescription"
     from "Venue" where id = $1 limit 1`,
    [VENUE_ID],
  );
  const row = before.rows[0];
  if (!row) {
    console.log(JSON.stringify({ dryRun, action: "missing", venueId: VENUE_ID }, null, 2));
    process.exitCode = 2;
    return;
  }

  const planned = {
    pageStatus: "CANDIDATE",
    kind: row.kind === "MEETING_POINT" ? "CLUB_BAR_RESTAURANT" : row.kind,
  };

  const report = { dryRun, venueId: VENUE_ID, before: row, planned };
  if (!dryRun) {
    await pool.query(
      `update "Venue"
       set "pageStatus" = $2::"VenuePageStatus",
           kind = $3::"VenueKind",
           "updatedAt" = now()
       where id = $1`,
      [VENUE_ID, planned.pageStatus, planned.kind],
    );
    const after = await pool.query(
      `select id, slug, title, kind::text, "pageStatus"::text from "Venue" where id = $1`,
      [VENUE_ID],
    );
    report.after = after.rows[0];
    report.action = "update";
  } else {
    report.action = "dry-run";
  }
  console.log(JSON.stringify(report, null, 2));
}

function loadRootEnv(root) {
  const fs = require("fs");
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
