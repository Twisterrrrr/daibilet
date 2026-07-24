#!/usr/bin/env node
/**
 * Post-import / backfill: no active Event or visible Venue without a cover.
 *
 * Order:
 *  1) Prefer provider CDN (or local TC override) already on Event / EventOverride
 *  2) Promote that image onto Venue.heroImageUrl when venue hero is empty
 *  3) Only when still empty - generate unique sharp cover under /images/{events|venues}/generated/
 *
 * Usage:
 *   node scripts/ensure-catalog-covers.js
 *   node scripts/ensure-catalog-covers.js --dry-run
 *   node scripts/ensure-catalog-covers.js --venues-only
 *   node scripts/ensure-catalog-covers.js --events-only
 */
import { createDb } from '../apps/backend/src/db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGeneratedCatalogCover } from './lib/catalog-cover-generate.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const venuesOnly = args.has('--venues-only');
const eventsOnly = args.has('--events-only');

const db = createDb(rootDir);

const stats = {
  dryRun,
  eventsGenerated: 0,
  eventsUpdated: 0,
  eventsSkippedExisting: 0,
  venuesPromoted: 0,
  venuesGenerated: 0,
  venuesAlreadyOk: 0,
};

async function ensureEventCovers() {
  const { rows } = await db.query(`
    select
      e.id,
      e.title,
      e.slug,
      coalesce(c.title, 'unknown') as category,
      coalesce(city.title, '') as city
    from "Event" e
    left join "EventOverride" o on o."eventId" = e.id
    left join "Category" c on c.id = e."categoryId"
    left join "City" city on city.id = e."primaryCityId"
    where e.status not in ('HIDDEN', 'DRAFT')
      and coalesce(nullif(trim(e."imageUrl"), ''), '') = ''
      and coalesce(nullif(trim(o."imageUrl"), ''), '') = ''
    order by e.title, e.id
  `);

  /** @type {Map<string, { imageUrl: string, ids: string[] }>} */
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.category}|${row.title}`;
    if (!groups.has(key)) groups.set(key, { imageUrl: '', ids: [] });
    groups.get(key).ids.push(row.id);
  }

  for (const [key, group] of groups) {
    const [category, title] = key.split('|');
    const seed = `event:${key}`;
    if (dryRun) {
      stats.eventsGenerated += 1;
      stats.eventsUpdated += group.ids.length;
      continue;
    }
    const imageUrl = await writeGeneratedCatalogCover(rootDir, {
      kind: 'event',
      seed,
      category,
    });
    group.imageUrl = imageUrl;
    stats.eventsGenerated += 1;

    for (const id of group.ids) {
      await db.query(
        `
          update "Event"
          set "imageUrl" = $2, "updatedAt" = now()
          where id = $1
            and coalesce(nullif(trim("imageUrl"), ''), '') = ''
        `,
        [id, imageUrl],
      );
      stats.eventsUpdated += 1;
    }
    console.log(`event cover ${imageUrl} ← ${group.ids.length}× ${category} | ${title}`);
  }
}

async function ensureVenueCovers() {
  const { rows } = await db.query(`
    with venue_event_image as (
      select distinct on (e."venueId")
        e."venueId",
        coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) as image_url
      from "Event" e
      left join "EventOverride" o on o."eventId" = e.id
      where e.status not in ('HIDDEN', 'DRAFT')
        and coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) is not null
        and coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) !~* '^/images/cities/'
        and coalesce(nullif(trim(o."imageUrl"), ''), nullif(trim(e."imageUrl"), '')) !~* 'placeholder\\.gif'
      order by e."venueId", e."updatedAt" desc nulls last
    )
    select
      v.id,
      v.slug,
      v.title,
      v.kind,
      vei.image_url as event_image
    from "Venue" v
    left join venue_event_image vei on vei."venueId" = v.id
    where v."pageStatus" <> 'HIDDEN'
      and coalesce(nullif(trim(v."heroImageUrl"), ''), '') = ''
    order by v.title, v.id
  `);

  for (const row of rows) {
    const eventImage = String(row.event_image || '').trim();
    if (eventImage) {
      if (!dryRun) {
        await db.query(
          `
            update "Venue"
            set "heroImageUrl" = $2, "updatedAt" = now()
            where id = $1
              and coalesce(nullif(trim("heroImageUrl"), ''), '') = ''
          `,
          [row.id, eventImage],
        );
      }
      stats.venuesPromoted += 1;
      continue;
    }

    if (dryRun) {
      stats.venuesGenerated += 1;
      continue;
    }

    const imageUrl = await writeGeneratedCatalogCover(rootDir, {
      kind: 'venue',
      seed: `venue:${row.id}:${row.slug}`,
      venueKind: row.kind,
    });
    await db.query(
      `
        update "Venue"
        set "heroImageUrl" = $2, "updatedAt" = now()
        where id = $1
          and coalesce(nullif(trim("heroImageUrl"), ''), '') = ''
      `,
      [row.id, imageUrl],
    );
    stats.venuesGenerated += 1;
    console.log(`venue cover ${imageUrl} ← ${row.slug}`);
  }
}

async function main() {
  if (!eventsOnly) {
    // no-op marker: venuesAlreadyOk unused for now but keeps JSON shape stable
    stats.venuesAlreadyOk = 0;
  }
  if (!venuesOnly) await ensureEventCovers();
  if (!eventsOnly) await ensureVenueCovers();

  console.log(JSON.stringify({ ok: true, ...stats }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
