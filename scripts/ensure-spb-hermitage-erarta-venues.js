#!/usr/bin/env node
/**
 * Catalog seed from SPBBOATS `packages/backend/prisma/seed-venues.ts`:
 *   - ermitazh  (Государственный Эрмитаж, MUSEUM)
 *   - erarta    (Эрарта, ART_SPACE → DB kind MUSEUM_ART_SPACE)
 *
 * Does NOT touch TC import venue gosudarstvennyi-ermitazh-* (CONCERT_HALL).
 * Does NOT write finance / AdmissionProduct / YooKassa.
 *
 * Usage:
 *   node scripts/ensure-spb-hermitage-erarta-venues.js --dry-run
 *   node scripts/ensure-spb-hermitage-erarta-venues.js
 */
const path = require("path");
const { createRequire } = require("module");
const fs = require("fs");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

/** Prefer latin prod hub aliases; fall back to Cyrillic slug used on MSK PG. */
const CITY_SLUG_CANDIDATES = ["sankt-peterburg", "saint-petersburg", "санкт-петербург"];

const VENUES = [
  {
    id: "ven_spbboats_ermitazh",
    slug: "ermitazh",
    title: "Государственный Эрмитаж",
    shortDescription: "Крупнейший художественный музей мира в Зимнем дворце",
    description:
      "Один из крупнейших и старейших художественных музеев мира. Коллекция насчитывает около 3 миллионов экспонатов - от древности до наших дней. Главный музейный комплекс расположен в Зимнем дворце на Дворцовой набережной.",
    address: "Дворцовая наб., 34, Санкт-Петербург",
    latitude: 59.9398,
    longitude: 30.3146,
    metroStation: "Адмиралтейская",
    seoH1: "Государственный Эрмитаж",
    seoTitle: "Эрмитаж - билеты, часы работы | Дайбилет",
    seoDescription: "Крупнейший художественный музей мира в Зимнем дворце",
    canonicalPath: "/venues/ermitazh",
    isIndexable: true,
  },
  {
    id: "ven_spbboats_erarta",
    slug: "erarta",
    title: "Музей современного искусства Эрарта",
    shortDescription: "Крупнейший частный музей современного искусства",
    description:
      "Крупнейший частный музей современного искусства в России. Более 2800 произведений в постоянной коллекции и регулярные временные выставки. Расположен на Васильевском острове.",
    address: "29-я линия В.О., 2, Санкт-Петербург",
    latitude: 59.9322,
    longitude: 30.252,
    metroStation: "Василеостровская",
    seoH1: "Музей современного искусства Эрарта",
    seoTitle: "Эрарта - билеты, часы работы | Дайбилет",
    seoDescription: "Крупнейший частный музей современного искусства",
    canonicalPath: "/venues/erarta",
    isIndexable: true,
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

  const report = { dryRun, city, venues: [] };

  for (const venue of VENUES) {
    const before = await pool.query(
      `select id, slug, title, kind, "pageStatus", "cityId", "isIndexable", "heroImageUrl"
       from "Venue" where slug = $1 limit 1`,
      [venue.slug],
    );
    const rowBefore = before.rows[0] || null;
    const entry = {
      slug: venue.slug,
      before: rowBefore,
      planned: {
        id: venue.id,
        kind: "MUSEUM_ART_SPACE",
        pageStatus: "PUBLISHED",
        isIndexable: venue.isIndexable,
        cityId: city.id,
        source: "SPBBOATS packages/backend/prisma/seed-venues.ts",
      },
    };

    if (!rowBefore) {
      entry.action = "insert";
      if (!dryRun) {
        await pool.query(
          `
            insert into "Venue" (
              id, slug, title, description, "shortDescription",
              "cityId", address, latitude, longitude, "metroStation",
              kind, "pageStatus", "isIndexable",
              "seoH1", "seoTitle", "seoDescription", "canonicalPath",
              "createdAt", "updatedAt"
            ) values (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              'MUSEUM_ART_SPACE', 'PUBLISHED', $11,
              $12, $13, $14, $15,
              now(), now()
            )
            on conflict (slug) do nothing
          `,
          [
            venue.id,
            venue.slug,
            venue.title,
            venue.description,
            venue.shortDescription,
            city.id,
            venue.address,
            venue.latitude,
            venue.longitude,
            venue.metroStation,
            venue.isIndexable,
            venue.seoH1,
            venue.seoTitle,
            venue.seoDescription,
            venue.canonicalPath,
          ],
        );
      }
    } else {
      entry.action = "update";
      if (!dryRun) {
        await pool.query(
          `
            update "Venue"
            set
              title = $2,
              description = $3,
              "shortDescription" = $4,
              "cityId" = $5,
              address = $6,
              latitude = coalesce(latitude, $7),
              longitude = coalesce(longitude, $8),
              "metroStation" = coalesce(nullif(trim("metroStation"), ''), $9),
              kind = 'MUSEUM_ART_SPACE',
              "pageStatus" = 'PUBLISHED',
              "isIndexable" = $10,
              "seoH1" = $11,
              "seoTitle" = $12,
              "seoDescription" = coalesce(nullif(trim("seoDescription"), ''), $13),
              "canonicalPath" = coalesce(nullif(trim("canonicalPath"), ''), $14),
              "updatedAt" = now()
            where slug = $1
          `,
          [
            venue.slug,
            venue.title,
            venue.description,
            venue.shortDescription,
            city.id,
            venue.address,
            venue.latitude,
            venue.longitude,
            venue.metroStation,
            venue.isIndexable,
            venue.seoH1,
            venue.seoTitle,
            venue.seoDescription,
            venue.canonicalPath,
          ],
        );
      }
    }

    entry.after = (
      await pool.query(
        `select id, slug, title, kind, "pageStatus", "cityId", "isIndexable", address,
                latitude, longitude, "metroStation", "canonicalPath",
                ("heroImageUrl" is not null) as has_hero
         from "Venue" where slug = $1`,
        [venue.slug],
      )
    ).rows[0] || null;

    report.venues.push(entry);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function resolveCity() {
  for (const slug of CITY_SLUG_CANDIDATES) {
    const res = await pool.query(
      `select id, slug, title from "City" where slug = $1 limit 1`,
      [slug],
    );
    if (res.rows[0]) return res.rows[0];
  }
  const fuzzy = await pool.query(
    `select id, slug, title from "City"
     where title ilike '%Петербург%' or slug ilike '%peterburg%'
     order by title limit 5`,
  );
  return fuzzy.rows[0] || null;
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
