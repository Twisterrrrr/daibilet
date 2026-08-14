#!/usr/bin/env node
/**
 * Sinopskaya pier house canon (owner 2026-08-08).
 *
 * Canon: venue_629f8f730fdb465f9b2c54d0
 *   - title  → Причал на Синопской наб., 10А
 *   - address → Синопская наб., 10А
 *
 * Twin: venue_tep_72 (TEP place 72)
 *   - rematch Event.venueId → canon
 *   - pageStatus HIDDEN, isIndexable=false
 *
 * Usage (MSK):
 *   node scripts/ensure-spb-sinopskaya-10a-pier.js --dry-run
 *   node scripts/ensure-spb-sinopskaya-10a-pier.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const CANON_ID = 'venue_629f8f730fdb465f9b2c54d0';
const CANON_SLUG = 'prichal-na-sinopskoi-nab-10-629f8f730fdb465f9b2c54d0';
const TWIN_ID = 'venue_tep_72';

const CANON = {
  title: 'Причал на Синопской наб., 10А',
  address: 'Синопская наб., 10А',
  kind: 'PIER',
};

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pool = new Pool({ connectionString, max: 2 });
  const report = { dryRun, actions: [] };

  try {
    const canonBefore = await pool.query(
      `select id, slug, title, address, "pageStatus"::text as "pageStatus",
              "isIndexable", kind::text as kind
       from "Venue" where id = $1 or slug = $2
       order by case when id = $1 then 0 else 1 end limit 1`,
      [CANON_ID, CANON_SLUG],
    );
    const twinBefore = await pool.query(
      `select id, slug, title, address, "pageStatus"::text as "pageStatus",
              "isIndexable", kind::text as kind
       from "Venue" where id = $1 limit 1`,
      [TWIN_ID],
    );

    if (!canonBefore.rows[0]) {
      throw new Error(`Canon venue not found: ${CANON_ID} / ${CANON_SLUG}`);
    }

    const twinEvents = twinBefore.rows[0]
      ? await pool.query(
          `select id, slug, title from "Event" where "venueId" = $1 order by title`,
          [TWIN_ID],
        )
      : { rows: [] };

    const twinRoutes = twinBefore.rows[0]
      ? await pool.query(
          `select "eventId", role::text as role from event_venue_route_items where "venueId" = $1`,
          [TWIN_ID],
        )
      : { rows: [] };

    report.canonBefore = canonBefore.rows[0];
    report.twinBefore = twinBefore.rows[0] || null;
    report.twinEventCount = twinEvents.rows.length;
    report.twinRouteCount = twinRoutes.rows.length;

    if (dryRun) {
      report.actions.push({
        action: 'would-update-canon',
        id: canonBefore.rows[0].id,
        planned: CANON,
      });
      if (twinBefore.rows[0]) {
        report.actions.push({
          action: 'would-hide-twin',
          id: TWIN_ID,
          rematchEvents: twinEvents.rows.map((row) => row.id),
          rematchRoutes: twinRoutes.rows.length,
        });
      }
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `
          update "Venue"
          set title = $2,
              address = $3,
              kind = 'PIER',
              "updatedAt" = now()
          where id = $1
        `,
        [canonBefore.rows[0].id, CANON.title, CANON.address],
      );
      report.actions.push({ action: 'updated-canon', id: canonBefore.rows[0].id, planned: CANON });

      if (twinBefore.rows[0]) {
        if (twinEvents.rows.length) {
          await client.query(`update "Event" set "venueId" = $1, "updatedAt" = now() where "venueId" = $2`, [
            canonBefore.rows[0].id,
            TWIN_ID,
          ]);
        }
        if (twinRoutes.rows.length) {
          await client.query(
            `
              update event_venue_route_items
              set "venueId" = $1
              where "venueId" = $2
                and not exists (
                  select 1 from event_venue_route_items x
                  where x."eventId" = event_venue_route_items."eventId"
                    and x."venueId" = $1
                    and x.role = event_venue_route_items.role
                )
            `,
            [canonBefore.rows[0].id, TWIN_ID],
          );
          await client.query(`delete from event_venue_route_items where "venueId" = $1`, [TWIN_ID]);
        }

        await client.query(
          `
            update "Venue"
            set "pageStatus" = 'HIDDEN',
                "isIndexable" = false,
                title = $2,
                address = $3,
                "updatedAt" = now()
            where id = $1
          `,
          [TWIN_ID, CANON.title, CANON.address],
        );

        await client.query(
          `
            insert into "VenueAlias" (id, "venueId", "sourceCode", "externalId", title, address)
            values ($1, $2, 'TEPLOHOD', '72', $3, $4)
            on conflict (id) do update set
              "venueId" = excluded."venueId",
              title = excluded.title,
              address = excluded.address
          `,
          [`venue_alias_tep_72`, canonBefore.rows[0].id, CANON.title, CANON.address],
        );

        report.actions.push({
          action: 'hidden-twin',
          id: TWIN_ID,
          rematchEvents: twinEvents.rows.map((row) => row.id),
          rematchRoutes: twinRoutes.rows.length,
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
      `select id, slug, title, address, "pageStatus"::text as "pageStatus", kind::text as kind
       from "Venue" where id = any($1::text[])`,
      [[canonBefore.rows[0].id, TWIN_ID]],
    );
    report.after = after.rows;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
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
