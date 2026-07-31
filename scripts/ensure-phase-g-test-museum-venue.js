#!/usr/bin/env node
/**
 * CF.P2e: ensure catalog Venue slug `phase-g-test-museum` exists (MSK PG).
 * Join key for finance projection venue page admission block.
 *
 * Usage:
 *   node scripts/ensure-phase-g-test-museum-venue.js --dry-run
 *   node scripts/ensure-phase-g-test-museum-venue.js
 */
const path = require("path");
const { createRequire } = require("module");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const VENUE_ID = "ven_phase_g_test_museum_catalog";
const SLUG = "phase-g-test-museum";
const TITLE = "Тестовый музей Дайбилет";
const SHORT_DESCRIPTION =
  "Служебная площадка для smoke admission projection (catalog↔finance).";
const ADDRESS = "Москва (тест)";

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
  const city = await pool.query(`select id, slug, title from "City" where slug = 'moskva' limit 1`);
  if (!city.rows[0]) throw new Error("City slug=moskva not found");
  const cityId = city.rows[0].id;

  const before = await pool.query(
    `select id, slug, title, kind, "pageStatus", "cityId" from "Venue" where slug = $1 limit 1`,
    [SLUG],
  );

  const report = {
    dryRun,
    cityId,
    before: before.rows[0] || null,
    planned: {
      id: VENUE_ID,
      slug: SLUG,
      title: TITLE,
      kind: "MUSEUM_ART_SPACE",
      pageStatus: "PUBLISHED",
      isIndexable: false,
      cityId,
    },
  };

  if (!before.rows[0]) {
    report.action = "insert";
    if (!dryRun) {
      await pool.query(
        `
          insert into "Venue" (
            id, slug, title, "shortDescription", "cityId", address,
            kind, "pageStatus", "isIndexable", "seoH1", "seoTitle", "seoDescription",
            "canonicalPath", "createdAt", "updatedAt"
          ) values (
            $1, $2, $3, $4, $5, $6,
            'MUSEUM_ART_SPACE', 'PUBLISHED', false,
            $3, $7, $8,
            '/venues/phase-g-test-museum', now(), now()
          )
          on conflict (slug) do nothing
        `,
        [
          VENUE_ID,
          SLUG,
          TITLE,
          SHORT_DESCRIPTION,
          cityId,
          ADDRESS,
          `${TITLE} | Дайбилет`,
          "Служебная страница для проверки входных билетов finance projection.",
        ],
      );
    }
  } else {
    report.action = "keep";
  }

  const after = await pool.query(
    `select id, slug, title, kind, "pageStatus", "cityId", "isIndexable" from "Venue" where slug = $1`,
    [SLUG],
  );
  report.after = after.rows[0] || null;
  console.log(JSON.stringify(report, null, 2));
}

function loadRootEnv(root) {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
