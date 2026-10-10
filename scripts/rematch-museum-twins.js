#!/usr/bin/env node
/**
 * Rematch saleable Event.venueId from TC museum twins → editorial canons.
 * Hide twins after rematch (pageStatus HIDDEN, isIndexable=false).
 *
 * Does NOT rematch theatres/halls that share a name fragment (Hermitage Theatre).
 *
 * Usage (MSK):
 *   node scripts/rematch-museum-twins.js --dry-run
 *   node scripts/rematch-museum-twins.js --apply
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

/**
 * canonSlug / twinSlug|twinId pairs. Only exact venue rows.
 * Skip anything that is a theatre / concert hall when resolving by title.
 */
const PAIRS = [
  {
    canonSlug: 'ermitazh',
    twinSlugs: ['gosudarstvennyi-ermitazh', 'gosudarstvennyi-ermitazh-5c9b99e362f03f000c48bd3d'],
    twinIds: ['venue_5c9b99e362f03f000c48bd3d'],
    // never: ermitazhnyi-teatr
  },
  {
    canonSlug: 'saint-petersburg-russkiy-muzey',
    twinSlugs: ['russkiy-muzey-c5b60f6c6057'],
  },
  {
    canonSlug: 'moscow-tret-yakovskaya-galereya',
    twinSlugs: ['moskva-lavrushinskii-pereulok-10'],
  },
  {
    canonSlug: 'moscow-novaya-tretyakovka',
    twinSlugs: ['novaya-tretyakovskaya-galereya-ff57ae659039'],
  },
  {
    canonSlug: 'saint-petersburg-isaakievskiy-sobor',
    twinSlugs: ['isaakievskiy-sobor-3aeb14ae1a71'],
  },
];

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pool = new Pool({ connectionString, max: 2 });
  const report = { dryRun, pairs: [] };

  try {
    for (const pair of PAIRS) {
      const entry = await processPair(pool, pair);
      report.pairs.push(entry);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

async function processPair(pool, pair) {
  const canonRes = await pool.query(
    `select id, slug, title, kind::text as kind, "pageStatus"::text as "pageStatus"
     from "Venue" where slug = $1 limit 1`,
    [pair.canonSlug],
  );
  const canon = canonRes.rows[0] || null;
  if (!canon) {
    return { canonSlug: pair.canonSlug, error: 'canon-missing' };
  }

  const twinKeys = [...(pair.twinSlugs || []), ...(pair.twinIds || [])];
  const twinRes = await pool.query(
    `select id, slug, title, kind::text as kind, "pageStatus"::text as "pageStatus",
            (select count(*)::int from "Event" e where e."venueId" = v.id) as events_all,
            (select count(*)::int from "Event" e
              where e."venueId" = v.id and e.status not in ('HIDDEN','DRAFT')) as events_active
     from "Venue" v
     where v.slug = any($1::text[]) or v.id = any($1::text[])`,
    [twinKeys],
  );

  const twins = twinRes.rows.filter((row) => row.id !== canon.id);
  const actions = [];

  if (dryRun) {
    for (const twin of twins) {
      const events = await pool.query(
        `select id, slug, title, status::text as status,
                (title ~* 'посещени') as is_visit_tour
         from "Event" where "venueId" = $1 order by title`,
        [twin.id],
      );
      const rematchable = events.rows.filter((e) => !e.is_visit_tour);
      const visitTours = events.rows.filter((e) => e.is_visit_tour);
      actions.push({
        action: 'would-rematch-onsite-hide-twin',
        twinId: twin.id,
        twinSlug: twin.slug,
        twinStatus: twin.pageStatus,
        eventsActive: twin.events_active,
        rematchEventIds: rematchable.map((e) => e.id),
        rematchTitles: rematchable.map((e) => e.title),
        leaveAsVisitTourIds: visitTours.map((e) => e.id),
        leaveAsVisitTourTitles: visitTours.map((e) => e.title),
      });
    }
    return { canon, twins, actions };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const twin of twins) {
      // Tours "с посещением X" stay on twin (or boarding point); only on-site products rematch.
      const rematch = await client.query(
        `update "Event" set "venueId" = $1, "updatedAt" = now()
         where "venueId" = $2
           and title !~* 'посещени'
         returning id, title`,
        [canon.id, twin.id],
      );
      const rematchRoutes = await client.query(
        `
          update event_venue_route_items dest
          set "venueId" = $1
          where "venueId" = $2
            and not exists (
              select 1 from event_venue_route_items other
              where other."eventId" = dest."eventId"
                and other."venueId" = $1
                and other.role = dest.role
            )
          returning "eventId"
        `,
        [canon.id, twin.id],
      );
      const dropDupRoutes = await client.query(
        `delete from event_venue_route_items where "venueId" = $1 returning "eventId"`,
        [twin.id],
      );
      await client.query(
        `update "Venue"
         set "pageStatus" = 'HIDDEN', "isIndexable" = false, "updatedAt" = now()
         where id = $1`,
        [twin.id],
      );
      actions.push({
        action: 'rematched-hide',
        twinId: twin.id,
        twinSlug: twin.slug,
        eventsMoved: rematch.rows.length,
        eventIds: rematch.rows.map((e) => e.id),
        routesMoved: rematchRoutes.rows.length,
        routesDropped: dropDupRoutes.rows.length,
      });
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const after = await pool.query(
    `select id, slug, "pageStatus"::text as "pageStatus",
            (select count(*)::int from "Event" e
              where e."venueId" = v.id and e.status not in ('HIDDEN','DRAFT')) as events_active
     from "Venue" v where id = $1 or id = any($2::text[])`,
    [canon.id, twins.map((t) => t.id)],
  );

  return { canon, twins, actions, after: after.rows };
}

function loadRootEnv(root) {
  for (const name of ['.env', '.env.local']) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      if (process.env[key] != null) continue;
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  }
}
