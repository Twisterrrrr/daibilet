#!/usr/bin/env node
/**
 * Promote SPB cathedral mosque from TC MEETING_POINT/NONE stub to must-see location.
 *
 * Root (owner): hub/My Day glued «Санкт-Петербургская соборная мечеть» to
 * МТС Live Холл via namesLooselyMatch geo tokens; users landed on MTS PDP and
 * saw «Анна и Эльза». Real mosque row exists with correct coords but is not
 * public (pageStatus NONE, kind MEETING_POINT), while editorial locationSlug
 * saint-petersburg-sobornaya-mechet 404s.
 *
 * Usage (MSK):
 *   node scripts/fix-spb-sobornaya-mechet-venue.js --dry-run
 *   node scripts/fix-spb-sobornaya-mechet-venue.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const TARGET_SLUG = 'saint-petersburg-sobornaya-mechet';
const LEGACY_ID = 'venue_652d5eced2357a35036f3762';
const LEGACY_SLUG = 'sobornaya-mechet-652d5eced2357a35036f3762';
const EDITORIAL = {
  title: 'Санкт-Петербургская соборная мечеть',
  shortDescription:
    'Северный модерн с лазурным майоликовым куполом у Кронверкского проспекта',
  hookFact:
    'Бирюзовый купол мечети повторяет контуры усыпальницы Тамерлана в Самарканде - редкий для Петербурга восточный акцент рядом с Петропавловской крепостью.',
  description:
    'Действующая соборная мечеть Петербурга, построенная в начале XX века в духе северного модерна. Монументальный фасад и лазурный майоликовый купол делают ее одной из самых узнаваемых культовых точек Петроградской стороны. Сюда приходят за архитектурой, тихим двором и видом на Кронверкский проспект.',
  wayToFind:
    'От метро «Горьковская» пройдите вдоль Кронверкского проспекта мимо зоопарка и Александровского парка - мечеть будет справа у пересечения с Кронверкской улицей.',
  address: 'Кронверкский проспект, 7',
  metroStation: '«Горьковская» (8 минут пешком)',
  latitude: 59.9552,
  longitude: 30.3239,
  heroImageUrl: '/images/venues/saint-petersburg/sobornaya-mechet.jpg',
  // Buildings (mosque/cathedral) → ATTRACTION per owner canon 2026-08-05.
  kind: 'ATTRACTION',
  pageStatus: 'PUBLISHED',
};

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 2,
  });

  try {
    const found = await pool.query(
      `select id, slug, title, kind::text, "pageStatus"::text, latitude, longitude, address,
              "shortDescription", description, "hookFact", "heroImageUrl", "canonicalPath", "cityId"
       from "Venue"
       where id = $1 or slug = $2 or slug = $3
       order by case when id = $1 then 0 when slug = $3 then 1 else 2 end
       limit 1`,
      [LEGACY_ID, LEGACY_SLUG, TARGET_SLUG],
    );
    if (!found.rows[0]) {
      throw new Error('Mosque venue not found (expected TC stub or editorial slug)');
    }
    const row = found.rows[0];

    const slugTaken = await pool.query(
      `select id, slug from "Venue" where slug = $1 and id <> $2 limit 1`,
      [TARGET_SLUG, row.id],
    );
    if (slugTaken.rows[0]) {
      throw new Error(`Target slug already owned by ${slugTaken.rows[0].id}`);
    }

    // Guard: Anna/Elza must stay on MTS, never on mosque.
    const anna = await pool.query(
      `select e.id, e.slug, e.title, e."venueId", v.slug as venue_slug
       from "Event" e
       left join "Venue" v on v.id = e."venueId"
       where e.id = 'evt_6a46c069a30b1356f6ef5518'
          or e.slug ilike '%novogodnee-shou-anna%'
          or e.title ilike '%Анна и Эльза%'
       limit 10`,
    );
    const badLink = anna.rows.find((event) => event.venueId === row.id);
    if (badLink) {
      throw new Error(`Refusing apply: Anna/Elza event ${badLink.id} points at mosque venue`);
    }

    const next = {
      id: row.id,
      fromSlug: row.slug,
      toSlug: TARGET_SLUG,
      title: EDITORIAL.title,
      kind: EDITORIAL.kind,
      pageStatus: EDITORIAL.pageStatus,
      latitude: EDITORIAL.latitude,
      longitude: EDITORIAL.longitude,
      address: EDITORIAL.address,
      metroStation: EDITORIAL.metroStation,
      // TC stub shortDescription is often a fragment («у портала») - replace weak leads.
      shortDescription: isWeakLead(row.shortDescription)
        ? EDITORIAL.shortDescription
        : String(row.shortDescription).trim(),
      description: EDITORIAL.description,
      hookFact: EDITORIAL.hookFact,
      wayToFind: EDITORIAL.wayToFind,
      // Prefer curated venue photo over TC event thumb.
      heroImageUrl: EDITORIAL.heroImageUrl,
      canonicalPath: `/locations/${TARGET_SLUG}`,
      annaSample: anna.rows.slice(0, 3).map((event) => ({
        id: event.id,
        venueId: event.venueId,
        venueSlug: event.venue_slug,
      })),
    };

    if (dryRun) {
      console.log(JSON.stringify({ dryRun: true, before: summarize(row), next }, null, 2));
      return;
    }

    await pool.query(
      `update "Venue" set
         slug = $2,
         title = $3,
         kind = $4::"VenueKind",
         "pageStatus" = $5::"VenuePageStatus",
         latitude = $6,
         longitude = $7,
         address = $8,
         "metroStation" = $9,
         "shortDescription" = $10,
         description = $11,
         "hookFact" = $12,
         "wayToFind" = $13,
         "heroImageUrl" = $14,
         "canonicalPath" = $15,
         "seoH1" = $3,
         "seoTitle" = $16,
         "seoDescription" = $10,
         "isIndexable" = true,
         "updatedAt" = now()
       where id = $1`,
      [
        row.id,
        TARGET_SLUG,
        EDITORIAL.title,
        EDITORIAL.kind,
        EDITORIAL.pageStatus,
        EDITORIAL.latitude,
        EDITORIAL.longitude,
        EDITORIAL.address,
        EDITORIAL.metroStation,
        next.shortDescription,
        EDITORIAL.description,
        EDITORIAL.hookFact,
        EDITORIAL.wayToFind,
        next.heroImageUrl,
        next.canonicalPath,
        `${EDITORIAL.title} | Дайбилет`,
      ],
    );

    const after = await pool.query(
      `select id, slug, title, kind::text, "pageStatus"::text, latitude, longitude, address,
              "canonicalPath", "heroImageUrl"
       from "Venue" where id = $1`,
      [row.id],
    );

    console.log(JSON.stringify({ dryRun: false, before: summarize(row), after: after.rows[0], annaSample: next.annaSample }, null, 2));
  } finally {
    await pool.end();
  }
}

function summarize(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    pageStatus: row.pageStatus,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    canonicalPath: row.canonicalPath,
  };
}

function isWeakLead(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  if (text.length < 24) return true;
  if (/^(легенда|описание|текст|n\/a|нет|—|-)$/i.test(text)) return true;
  return false;
}

function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}
