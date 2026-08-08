#!/usr/bin/env node
/**
 * Merge Dvortsovaya nab. 18 pier duplicates (owner 2026-08-09).
 *
 * Canon: venue_681d44a7fc03029d63123730
 *   - title/address → Дворцовая набережная, 18
 *   - kind PIER (supplier wrongly sent CONCERT_HALL)
 *   - keep editorial shortDescription; pier №4 note there
 *   - pageStatus PUBLISHED
 *
 * Twin: venue_tep_65 (TEP place 65) - ship-name shortDescription junk «Москва»
 *   - rematch Event.venueId → canon
 *   - pageStatus HIDDEN, isIndexable=false
 *
 * Usage (MSK):
 *   node scripts/ensure-spb-dvortsovaya-18-pier-merge.js --dry-run
 *   node scripts/ensure-spb-dvortsovaya-18-pier-merge.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const CANON_ID = 'venue_681d44a7fc03029d63123730';
const CANON_SLUG = 'dvorcovaya-naberezhnaya-18-prichal-no4-681d44a7fc03029d63123730';
const TWIN_ID = 'venue_tep_65';
const TWIN_ALIAS_ID = 'venue_alias_tep_65';

const CANON = {
  title: 'Дворцовая набережная, 18',
  address: 'Дворцовая набережная, 18',
  shortDescription:
    'Крупный причал у Ново-Михайловского дворца (причал №4) - «Метеоры» и обзорные теплоходы.',
  description:
    'Крупный причал на Дворцовой набережной у Ново-Михайловского дворца (причал №4). Используется для посадки на «Метеоры» и обзорные теплоходные прогулки по Неве и каналам Петербурга.',
  pageStatus: 'PUBLISHED',
  kind: 'PIER',
  isIndexable: true,
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
      `select id, slug, title, address, "shortDescription", "pageStatus"::text as "pageStatus",
              "isIndexable", kind::text as kind
       from "Venue" where id = $1 or slug = $2
       order by case when id = $1 then 0 else 1 end limit 1`,
      [CANON_ID, CANON_SLUG],
    );
    const twinBefore = await pool.query(
      `select id, slug, title, address, "shortDescription", "pageStatus"::text as "pageStatus",
              "isIndexable", kind::text as kind
       from "Venue" where id = $1 limit 1`,
      [TWIN_ID],
    );

    if (!canonBefore.rows[0]) {
      throw new Error(`Canon venue not found: ${CANON_ID} / ${CANON_SLUG}`);
    }
    if (!twinBefore.rows[0]) {
      report.actions.push({ action: 'twin-missing', id: TWIN_ID });
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
          set
            title = $2,
            address = $3,
            "shortDescription" = $4,
            description = $5,
            kind = 'PIER',
            "pageStatus" = 'PUBLISHED',
            "isIndexable" = true,
            "updatedAt" = now()
          where id = $1
        `,
        [
          canonBefore.rows[0].id,
          CANON.title,
          CANON.address,
          CANON.shortDescription,
          CANON.description,
        ],
      );
      report.actions.push({ action: 'updated-canon', id: canonBefore.rows[0].id });

      if (twinBefore.rows[0]) {
        const rematch = await client.query(
          `update "Event" set "venueId" = $1, "updatedAt" = now()
           where "venueId" = $2
           returning id`,
          [canonBefore.rows[0].id, TWIN_ID],
        );
        report.actions.push({
          action: 'rematched-events',
          count: rematch.rows.length,
          ids: rematch.rows.map((row) => row.id),
        });

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
            returning "eventId", role::text as role
          `,
          [canonBefore.rows[0].id, TWIN_ID],
        );
        const dropDupRoutes = await client.query(
          `delete from event_venue_route_items where "venueId" = $1 returning "eventId"`,
          [TWIN_ID],
        );
        report.actions.push({
          action: 'rematched-routes',
          moved: rematchRoutes.rows.length,
          droppedDupOrOrphan: dropDupRoutes.rows.length,
        });

        await client.query(
          `
            update "Venue"
            set
              "pageStatus" = 'HIDDEN',
              "isIndexable" = false,
              "updatedAt" = now()
            where id = $1
          `,
          [TWIN_ID],
        );
        report.actions.push({ action: 'hidden-twin', id: TWIN_ID });

        await client.query(
          `
            update "VenueAlias"
            set "venueId" = $1
            where id = $2 or ("sourceCode" = 'TEPLOHOD' and "externalId" = '65')
          `,
          [canonBefore.rows[0].id, TWIN_ALIAS_ID],
        );
        report.actions.push({ action: 'repointed-tep-alias', to: canonBefore.rows[0].id });
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const after = await pool.query(
      `select id, slug, title, address, "shortDescription", "pageStatus"::text as "pageStatus",
              "isIndexable", kind::text as kind,
              (select count(*)::int from "Event" e where e."venueId" = v.id and e.status not in ('HIDDEN','DRAFT')) as events_active,
              (select count(*)::int from "Event" e where e."venueId" = v.id) as events_all
       from "Venue" v
       where id in ($1, $2)
       order by id`,
      [canonBefore.rows[0].id, TWIN_ID],
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
