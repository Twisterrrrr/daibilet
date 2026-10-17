#!/usr/bin/env node
/**
 * Seed «Главные места» Перми: 6 Venue (venue/location kinds).
 *
 * Usage:
 *   node scripts/seed-perm-must-see-venues.js --dry-run
 *   node scripts/seed-perm-must-see-venues.js
 *
 * Requires PARK/MONUMENT enum values (migration 20260731130000).
 * Optional hookFact column (migration 20260731140000_event_venue_route_items_hook_fact).
 */
const path = require('path');
const { createRequire } = require('module');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const CITY_SLUG_CANDIDATES = ['perm', 'permi', 'пермь'];

const VENUES = [
  {
    id: 'ven_perm_galereya',
    slug: 'permskaya-galereya',
    title: 'Пермская художественная галерея',
    kind: 'MUSEUM_ART_SPACE',
    pageStatus: 'CANDIDATE',
    shortDescription:
      'Один из крупнейших художественных музеев в регионах России, знаменитый коллекцией деревянной скульптуры.',
    hookFact:
      'Скоро откроет двери в новом футуристичном здании на территории бывшего завода Шпагина.',
    canonicalPath: '/venues/permskaya-galereya',
    isIndexable: false,
  },
  {
    id: 'ven_perm_solenye_ushi',
    slug: 'permsky-solenye-ushi',
    title: 'Памятник «Пермяк солёные уши»',
    kind: 'MONUMENT',
    pageStatus: 'PUBLISHED',
    shortDescription:
      'Жанровая городская скульптура, отражающая исторический промысел края - солеварение.',
    hookFact: 'Официально признан самым странным и самым фотографируемым памятником России.',
    canonicalPath: '/locations/permsky-solenye-ushi',
    isIndexable: true,
  },
  {
    id: 'ven_perm_naberezhnaya',
    slug: 'naberezhnaya-kamy',
    title: 'Набережная Камы',
    kind: 'OUTDOOR_LOCATION',
    pageStatus: 'PUBLISHED',
    shortDescription:
      'Главный прогулочный променад города протяженностью почти 4 километра с амфитеатром и причалами.',
    hookFact: 'Место, где находится знаменитый во всей стране арт-объект «Счастье не за горами».',
    canonicalPath: '/locations/naberezhnaya-kamy',
    isIndexable: true,
  },
  {
    id: 'ven_perm_hohlovka',
    slug: 'muzej-hohlovka',
    title: 'Архитектурно-этнографический музей «Хохловка»',
    kind: 'MUSEUM_ART_SPACE',
    pageStatus: 'PUBLISHED',
    shortDescription:
      'Первый на Урале музей деревянного зодчества под открытым небом на живописном берегу залива.',
    hookFact:
      'Деревянный город-призрак на холме, куда со всего края привозили подлинные избы XVII века.',
    canonicalPath: '/venues/muzej-hohlovka',
    isIndexable: true,
  },
  {
    id: 'ven_perm_teatr',
    slug: 'teatr-teatr',
    title: 'Пермский академический Театр-Театр',
    kind: 'THEATER',
    pageStatus: 'PUBLISHED',
    shortDescription:
      'Многократный лауреат премии «Золотая маска», ломающий стереотипы о классическом театре.',
    hookFact:
      'Театр со сложнейшей в стране сценой-трансформером, которая умеет двигаться во всех плоскостях.',
    canonicalPath: '/venues/teatr-teatr',
    isIndexable: true,
  },
  {
    id: 'ven_perm_esplanada',
    slug: 'permskaya-esplanada',
    title: 'Пермская эспланада',
    kind: 'PARK',
    pageStatus: 'PUBLISHED',
    shortDescription:
      'Главное общественное пространство Перми, разделенное на несколько тематических кварталов.',
    hookFact:
      'Огромное поле в самом центре Сити, превращенное в высокотехнологичный парк с поющими фонтанами.',
    canonicalPath: '/locations/permskaya-esplanada',
    isIndexable: true,
  },
];

const dryRun = process.argv.includes('--dry-run');
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';
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
    throw new Error(`City not found among: ${CITY_SLUG_CANDIDATES.join(', ')}`);
  }

  const hasHookFact = await columnExists('Venue', 'hookFact');
  const report = { dryRun, city, hasHookFact, venues: [] };

  for (const venue of VENUES) {
    const before = await pool.query(
      `select id, slug, title, kind, "pageStatus", "cityId", "isIndexable"
       from "Venue" where slug = $1 limit 1`,
      [venue.slug],
    );
    const rowBefore = before.rows[0] || null;
    const entry = {
      slug: venue.slug,
      before: rowBefore,
      planned: {
        id: venue.id,
        kind: venue.kind,
        pageStatus: venue.pageStatus,
        cityId: city.id,
        isIndexable: venue.isIndexable,
      },
    };

    if (!dryRun) {
      if (rowBefore) {
        if (hasHookFact) {
          await pool.query(
            `
              update "Venue"
              set
                title = $2,
                kind = $3::"VenueKind",
                "pageStatus" = $4::"VenuePageStatus",
                "cityId" = $5,
                "shortDescription" = $6,
                "hookFact" = $7,
                "seoH1" = coalesce(nullif(trim("seoH1"), ''), $2),
                "seoTitle" = coalesce(nullif(trim("seoTitle"), ''), $8),
                "seoDescription" = coalesce(nullif(trim("seoDescription"), ''), $6),
                "canonicalPath" = coalesce(nullif(trim("canonicalPath"), ''), $9),
                "isIndexable" = $10,
                "updatedAt" = now()
              where slug = $1
            `,
            [
              venue.slug,
              venue.title,
              venue.kind,
              venue.pageStatus,
              city.id,
              venue.shortDescription,
              venue.hookFact,
              `${venue.title} | Дайбилет`,
              venue.canonicalPath,
              venue.isIndexable,
            ],
          );
        } else {
          await pool.query(
            `
              update "Venue"
              set
                title = $2,
                kind = $3::"VenueKind",
                "pageStatus" = $4::"VenuePageStatus",
                "cityId" = $5,
                "shortDescription" = $6,
                "seoH1" = coalesce(nullif(trim("seoH1"), ''), $2),
                "seoTitle" = coalesce(nullif(trim("seoTitle"), ''), $7),
                "seoDescription" = coalesce(nullif(trim("seoDescription"), ''), $6),
                "canonicalPath" = coalesce(nullif(trim("canonicalPath"), ''), $8),
                "isIndexable" = $9,
                "updatedAt" = now()
              where slug = $1
            `,
            [
              venue.slug,
              venue.title,
              venue.kind,
              venue.pageStatus,
              city.id,
              venue.shortDescription,
              `${venue.title} | Дайбилет`,
              venue.canonicalPath,
              venue.isIndexable,
            ],
          );
        }
        entry.action = 'updated';
      } else {
        if (hasHookFact) {
          await pool.query(
            `
              insert into "Venue" (
                id, slug, title, kind, "pageStatus", "cityId",
                "shortDescription", "hookFact", "seoH1", "seoTitle", "seoDescription",
                "canonicalPath", "isIndexable", "createdAt", "updatedAt"
              ) values (
                $1, $2, $3, $4::"VenueKind", $5::"VenuePageStatus", $6,
                $7, $8, $3, $9, $7, $10, $11, now(), now()
              )
            `,
            [
              venue.id,
              venue.slug,
              venue.title,
              venue.kind,
              venue.pageStatus,
              city.id,
              venue.shortDescription,
              venue.hookFact,
              `${venue.title} | Дайбилет`,
              venue.canonicalPath,
              venue.isIndexable,
            ],
          );
        } else {
          await pool.query(
            `
              insert into "Venue" (
                id, slug, title, kind, "pageStatus", "cityId",
                "shortDescription", "seoH1", "seoTitle", "seoDescription",
                "canonicalPath", "isIndexable", "createdAt", "updatedAt"
              ) values (
                $1, $2, $3, $4::"VenueKind", $5::"VenuePageStatus", $6,
                $7, $3, $8, $7, $9, $10, now(), now()
              )
            `,
            [
              venue.id,
              venue.slug,
              venue.title,
              venue.kind,
              venue.pageStatus,
              city.id,
              venue.shortDescription,
              `${venue.title} | Дайбилет`,
              venue.canonicalPath,
              venue.isIndexable,
            ],
          );
        }
        entry.action = 'inserted';
      }
    } else {
      entry.action = rowBefore ? 'would-update' : 'would-insert';
    }

    report.venues.push(entry);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function resolveCity() {
  for (const slug of CITY_SLUG_CANDIDATES) {
    const bySlug = await pool.query(
      `select id, slug, title from "City" where lower(slug) = lower($1) limit 1`,
      [slug],
    );
    if (bySlug.rows[0]) return bySlug.rows[0];
  }
  const byTitle = await pool.query(
    `select id, slug, title from "City" where title ilike 'Пермь' limit 1`,
  );
  return byTitle.rows[0] || null;
}

async function columnExists(table, column) {
  const result = await pool.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [table, column],
  );
  return Boolean(result.rows[0]);
}

function loadRootEnv(dir) {
  for (const name of ['.env', '.env.local', '.env.production']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
