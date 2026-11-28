#!/usr/bin/env node
/**
 * Fix Ticketscloud venue «Арт-пространство Люмьер Холл» (Lumiere Hall, Moscow).
 *
 * Symptom: /venues/art-prostranstvo-lyumer-holl-g-moskva-54cabc2b9cb5385a9f65b95a → 404
 * Root cause: TC import typed venue as MEETING_POINT / pageStatus NONE → excluded from public hub.
 *
 * Usage (prod/stage with DATABASE_URL):
 *   node scripts/ensure-lumiere-hall-venue.js --dry-run
 *   node scripts/ensure-lumiere-hall-venue.js
 */
const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const VENUE_ID = "venue_54cabc2b9cb5385a9f65b95a";
const TC_VENUE_ID = "54cabc2b9cb5385a9f65b95a";
const CITY_ID = "city_tep_1";
const TITLE = "Арт-пространство Люмьер Холл";
const SLUG = `арт-пространство-люмьер-холл-г-москва-${TC_VENUE_ID}`;
const ADDRESS = "Берсеневский пер., д. 2, стр. 1";
const LATITUDE = 55.740846;
const LONGITUDE = 37.609923;
const SHORT_DESCRIPTION =
  "Иммерсивное арт-пространство в центре Москвы: мультимедийные выставки, кинопоказы и концерты.";

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
    `select id, slug, title, kind, "pageStatus", address, latitude, longitude, "cityId"
     from "Venue" where id = $1 limit 1`,
    [VENUE_ID],
  );
  const linkedEvents = await pool.query(
    `select count(*)::int as events from "Event" where "venueId" = $1`,
    [VENUE_ID],
  );

  const report = {
    dryRun,
    venueId: VENUE_ID,
    before: before.rows[0] || null,
    linkedEvents: linkedEvents.rows[0]?.events || 0,
    planned: {
      title: TITLE,
      slug: SLUG,
      kind: "MUSEUM_ART_SPACE",
      pageStatus: "CANDIDATE",
      address: ADDRESS,
      cityId: CITY_ID,
    },
    publicSlug: "art-prostranstvo-lyumer-holl-g-moskva-54cabc2b9cb5385a9f65b95a",
    slugNote:
      "Slug lyumer - техническая транслитерация «Люмьер» (ь выпадает, ю→u). Редирект не нужен: display title = Люмьер.",
  };

  if (!before.rows[0]) {
    report.action = "insert";
    if (!dryRun) {
      await pool.query(
        `
          insert into "Venue" (
            id, slug, title, "shortDescription", "cityId", address, latitude, longitude,
            kind, "pageStatus", "createdAt", "updatedAt"
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
        `,
        [
          VENUE_ID,
          SLUG,
          TITLE,
          SHORT_DESCRIPTION,
          CITY_ID,
          ADDRESS,
          LATITUDE,
          LONGITUDE,
          "MUSEUM_ART_SPACE",
          "CANDIDATE",
        ],
      );
    }
  } else {
    report.action = "update";
    if (!dryRun) {
      await pool.query(
        `
          update "Venue"
          set
            title = $2,
            "shortDescription" = coalesce(nullif(trim("shortDescription"), ''), $3),
            "cityId" = coalesce("cityId", $4),
            address = coalesce(nullif(trim(address), ''), $5),
            latitude = coalesce(latitude, $6),
            longitude = coalesce(longitude, $7),
            kind = 'MUSEUM_ART_SPACE',
            "pageStatus" = case when "pageStatus" = 'PUBLISHED' then "pageStatus" else 'CANDIDATE' end,
            "updatedAt" = now()
          where id = $1
        `,
        [VENUE_ID, TITLE, SHORT_DESCRIPTION, CITY_ID, ADDRESS, LATITUDE, LONGITUDE],
      );
    }
  }

  if (!dryRun) {
    report.after = (
      await pool.query(
        `select id, slug, title, kind, "pageStatus", address, latitude, longitude, "cityId"
         from "Venue" where id = $1 limit 1`,
        [VENUE_ID],
      )
    ).rows[0];
  }

  console.log(JSON.stringify(report, null, 2));
}

function loadRootEnv(root) {
  const envPath = path.join(root, ".env");
  try {
    const fs = require("fs");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}
