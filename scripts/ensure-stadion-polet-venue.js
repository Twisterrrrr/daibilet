#!/usr/bin/env node
/**
 * Fix Ticketscloud venue «Стадион "Полёт"» (Nizhny Novgorod).
 *
 * Symptom: /locations/stadion-polet → soft-404 («Площадка не найдена»), HTTP 200.
 * Root cause: venue exists (SPORT_ACTIVITY_SPACE) with address + shortDescription,
 * but pageStatus=NONE and 0 catalog sessions → buildPublicVenuePage returns null
 * (location zero-event escape requires status !== NONE|HIDDEN).
 * Search still lists it (excludes only HIDDEN) → broken deep-link UX.
 *
 * Usage (prod/stage with DATABASE_URL):
 *   node scripts/ensure-stadion-polet-venue.js --dry-run
 *   node scripts/ensure-stadion-polet-venue.js
 */
const path = require("path");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromRoot = createRequire(path.join(rootDir, "package.json"));
const { Pool } = requireFromRoot("pg");

const VENUE_ID = "venue_6252fd6a8bafbd8352a63178";
const TC_VENUE_ID = "6252fd6a8bafbd8352a63178";
const CITY_ID = "city_520555";
const TITLE = 'Стадион "Полёт"';
const SLUG = "stadion-polet";
const LEGACY_SLUG = `stadion-polet-${TC_VENUE_ID}`;
const ADDRESS = "улица Чаадаева 16б";
const LATITUDE = 56.3289823;
const LONGITUDE = 43.846895;
const SHORT_DESCRIPTION =
  "Спортивная площадка «Полёт» в Нижнем Новгороде: стадион для тренировок и городских спортивных событий.";

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
  const before = await pool.query(
    `select id, slug, title, kind, "pageStatus", address, latitude, longitude, "cityId",
            left(coalesce("shortDescription", ''), 160) as short
     from "Venue" where id = $1
        or slug = $2
        or slug = $3
     limit 1`,
    [VENUE_ID, SLUG, LEGACY_SLUG],
  );
  const linkedEvents = await pool.query(
    `select count(*)::int as events from "Event" where "venueId" = $1`,
    [VENUE_ID],
  );
  const slugTaken = await pool.query(
    `select id, slug from "Venue" where slug = $1 and id <> $2 limit 1`,
    [SLUG, VENUE_ID],
  );

  const report = {
    dryRun,
    venueId: VENUE_ID,
    before: before.rows[0] || null,
    linkedEvents: linkedEvents.rows[0]?.events || 0,
    slugConflict: slugTaken.rows[0] || null,
    planned: {
      title: TITLE,
      slug: SLUG,
      kind: "SPORT_ACTIVITY_SPACE",
      pageStatus: "CANDIDATE",
      address: ADDRESS,
      cityId: CITY_ID,
    },
    publicPaths: [`/locations/${SLUG}`, `/locations/${LEGACY_SLUG}`],
  };

  if (slugTaken.rows[0]) {
    report.action = "abort_slug_conflict";
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return;
  }

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
          "SPORT_ACTIVITY_SPACE",
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
            slug = $3,
            "shortDescription" = coalesce(nullif(trim("shortDescription"), ''), $4),
            "cityId" = coalesce("cityId", $5),
            address = coalesce(nullif(trim(address), ''), $6),
            latitude = coalesce(latitude, $7),
            longitude = coalesce(longitude, $8),
            kind = 'SPORT_ACTIVITY_SPACE',
            "pageStatus" = case when "pageStatus" = 'PUBLISHED' then "pageStatus" else 'CANDIDATE' end,
            "updatedAt" = now()
          where id = $1
        `,
        [VENUE_ID, TITLE, SLUG, SHORT_DESCRIPTION, CITY_ID, ADDRESS, LATITUDE, LONGITUDE],
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

function loadRootEnv(dir) {
  try {
    const fs = require("fs");
    const envPath = path.join(dir, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  } catch {
    // ignore
  }
}
