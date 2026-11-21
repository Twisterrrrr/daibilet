#!/usr/bin/env node
/**
 * Read-only: group the currently ungrouped, live saleable Ticketscloud Events
 * into product pages using the SAME title normalization as the production
 * resolver (normalizeEventPageProductTitle). Reports how many NEW EventPage
 * drafts the orphan tail would need (title/venue split inside each
 * TC parent+city family), without writing anything.
 *
 * Run:
 *   EVENT_MAP_DATABASE_URL=... node apps/backend/node_modules/tsx/dist/cli.mjs scripts/group-ungrouped-events.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeEventPageProductTitle } from '../apps/backend/src/public-event-page-links.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Pool } = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'))('pg');

function loadRootEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('=');
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

const SQL = `
WITH ungrouped AS (
  SELECT e.id, e.title, e."primaryCityId" AS city_id, e."venueId" AS venue_id
  FROM "Event" e
  WHERE NOT EXISTS (SELECT 1 FROM "EventPageEvent" link WHERE link."eventId" = e.id)
    AND EXISTS (SELECT 1 FROM "EventOffer" o WHERE o."eventId" = e.id AND o.active IS NOT FALSE)
    AND EXISTS (SELECT 1 FROM "EventSession" s WHERE s."eventId" = e.id AND s."isActive" IS NOT FALSE
      AND s."archivedAt" IS NULL AND s."cancelledAt" IS NULL AND s."startsAt" >= now()
      AND lower(coalesce(s."sourceStatus",'')) NOT IN
        ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'))
),
tc_identity AS (
  SELECT esl."eventId", min(NULLIF(trim(esl."metaExternalId"), '')) AS meta_external_id
  FROM "EventSourceLink" esl
  JOIN "Source" src ON src.id = esl."sourceId"
  WHERE upper(src.code::text) = 'TICKETSCLOUD'
  GROUP BY esl."eventId"
),
linked_parent_city AS (
  SELECT DISTINCT ti.meta_external_id, e."primaryCityId" AS city_id
  FROM "EventPageEvent" link
  JOIN "Event" e ON e.id = link."eventId"
  JOIN tc_identity ti ON ti."eventId" = e.id
)
SELECT u.id, u.title, u.city_id, u.venue_id, v.title AS venue_title,
       ti.meta_external_id, c.title AS city_title
FROM ungrouped u
JOIN tc_identity ti ON ti."eventId" = u.id
LEFT JOIN "Venue" v ON v.id = u.venue_id
LEFT JOIN "City" c ON c.id = u.city_id
LEFT JOIN linked_parent_city lpc
  ON lpc.meta_external_id = ti.meta_external_id
 AND lpc.city_id IS NOT DISTINCT FROM u.city_id
WHERE lpc.city_id IS NULL
`;

async function main() {
  loadRootEnv(rootDir);
  const databaseUrl = process.env.EVENT_MAP_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('EVENT_MAP_DATABASE_URL or DATABASE_URL must be set');

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const result = await pool.query(SQL);
    const rows = result.rows;

    const families = new Map();
    for (const row of rows) {
      const key = `${row.meta_external_id}\u0000${row.city_id ?? ''}`;
      let family = families.get(key);
      if (!family) {
        family = { parent: row.meta_external_id, city: row.city_title ?? null, cityId: row.city_id ?? null, slots: 0, titles: new Set(), venues: new Set(), title: null, venueTitle: null };
        families.set(key, family);
      }
      family.slots += 1;
      if (!family.title) family.title = row.title;
      if (!family.venueTitle) family.venueTitle = row.venue_title ?? null;
      const normalized = normalizeEventPageProductTitle(row.title);
      if (normalized) family.titles.add(normalized);
      if (row.venue_id) family.venues.add(row.venue_id);
    }

    let unambiguousFamilies = 0;
    let ambiguousFamilies = 0;
    let newProductsEstimate = 0;
    const detail = [];
    for (const family of families.values()) {
      const titleVariants = family.titles.size;
      const venueVariants = family.venues.size;
      // Canon: one page per parent+city only when title_variants=1 AND venue_variants<=1.
      const unambiguous = titleVariants === 1 && venueVariants <= 1;
      const products = unambiguous ? 1 : Math.max(titleVariants, venueVariants, 1);
      if (unambiguous) unambiguousFamilies += 1;
      else ambiguousFamilies += 1;
      newProductsEstimate += products;
      detail.push({
        parent: family.parent,
        city: family.city,
        title: family.title,
        venue: family.venueTitle,
        slots: family.slots,
        titleVariants,
        venueVariants,
        unambiguous,
        products,
      });
    }
    detail.sort((a, b) => b.slots - a.slots);

    process.stdout.write(
      `${JSON.stringify({
        families: families.size,
        events: rows.length,
        unambiguousFamilies,
        ambiguousFamilies,
        newProductsEstimate,
        detail,
      }, null, 2)}\n`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`group-ungrouped-events ERROR: ${error?.stack || error}`);
  process.exit(1);
});