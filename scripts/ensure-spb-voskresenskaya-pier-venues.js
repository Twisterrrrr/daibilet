#!/usr/bin/env node
/**
 * Fix TC pier venues wrongly titled as ship hull names («Москва-99» / «Москва-64»).
 *
 * Root cause: Ticketscloud venue.name = vessel; address was Admiralteyskaya or
 * Voskresenskaya; cityId resolved to Moscow from hull «Москва-N».
 *
 * Canon (owner 2026-08-06): pier = Воскресенская наб., 10, Санкт-Петербург.
 *
 * Usage:
 *   node scripts/ensure-spb-voskresenskaya-pier-venues.js --dry-run
 *   node scripts/ensure-spb-voskresenskaya-pier-venues.js
 */
const path = require("path");
const { createRequire } = require("module");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const CITY_SLUG_CANDIDATES = ["sankt-peterburg", "saint-petersburg", "санкт-петербург"];

const TITLE = "Воскресенская наб., 10";
const ADDRESS = "Воскресенская наб., 10";
const LATITUDE = 59.9496157;
const LONGITUDE = 30.3666904;

const VENUES = [
  {
    id: "venue_6a4d040007d4af979f35e566",
    slugKeep: "teplohod-moskva-99",
  },
  {
    id: "venue_6a60b3e7fcb53dd20fee8144",
    slugKeep: "teplohod-moskva-64",
  },
];

const dryRun = process.argv.includes("--dry-run");
const connectionString =
  process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
const pool = new Pool({ connectionString, max: 2 });

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

async function main() {
  const city = await resolveCity();
  if (!city) {
    throw new Error(`City not found among: ${CITY_SLUG_CANDIDATES.join(", ")}`);
  }

  const report = { dryRun, city, updates: [] };

  for (const item of VENUES) {
    const before = await pool.query(
      `select id, slug, title, address, kind, "pageStatus", "cityId", latitude, longitude
       from "Venue" where id = $1 limit 1`,
      [item.id],
    );
    const row = before.rows[0] || null;
    const planned = {
      id: item.id,
      title: TITLE,
      address: ADDRESS,
      cityId: city.id,
      kind: "PIER",
      latitude: LATITUDE,
      longitude: LONGITUDE,
      slug: row?.slug || item.slugKeep,
    };

    if (!row) {
      report.updates.push({ action: "missing", ...planned, before: null });
      continue;
    }

    report.updates.push({ action: dryRun ? "would-update" : "update", before: row, planned });

    if (!dryRun) {
      await pool.query(
        `
          update "Venue"
          set
            title = $2,
            address = $3,
            "cityId" = $4,
            kind = 'PIER',
            latitude = coalesce(latitude, $5),
            longitude = coalesce(longitude, $6),
            "pageStatus" = case
              when "pageStatus" = 'HIDDEN' then "pageStatus"
              when "pageStatus" = 'PUBLISHED' then "pageStatus"
              else 'CANDIDATE'
            end,
            "updatedAt" = now()
          where id = $1
        `,
        [item.id, TITLE, ADDRESS, city.id, LATITUDE, LONGITUDE],
      );
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

async function resolveCity() {
  for (const slug of CITY_SLUG_CANDIDATES) {
    const result = await pool.query(`select id, slug, title from "City" where slug = $1 limit 1`, [slug]);
    if (result.rows[0]) return result.rows[0];
  }
  const fuzzy = await pool.query(
    `select id, slug, title from "City"
     where title ilike '%петербург%' or title ilike '%petersburg%'
     order by title asc limit 1`,
  );
  return fuzzy.rows[0] || null;
}

function loadRootEnv(root) {
  for (const name of [".env", ".env.local"]) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      if (process.env[key] != null) continue;
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = value;
    }
  }
}
