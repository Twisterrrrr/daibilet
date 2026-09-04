#!/usr/bin/env node
/**
 * Seed EventVenueRouteItem STOP for excursions that visit a museum by title.
 * Never updates Event.venueId (start stays start). Merge-only.
 *
 * Usage (MSK):
 *   node scripts/seed-museum-stop-links-by-title.js --dry-run
 *   node scripts/seed-museum-stop-links-by-title.js --apply
 */
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

/** Title regex → canon venue slug. Hyphen only in comments. */
const RULES = [
  {
    canonSlug: 'ermitazh',
    titleRe: /посещени.*эрмитаж/i,
  },
  {
    canonSlug: 'saint-petersburg-glavnyy-shtab-ermitazh',
    titleRe: /посещени.*главн\S*\s+штаб/i,
  },
  {
    canonSlug: 'saint-petersburg-russkiy-muzey',
    titleRe: /посещени.*русск\S*\s+музе/i,
  },
  {
    canonSlug: 'saint-petersburg-isaakievskiy-sobor',
    titleRe: /посещени.*исаакиевск/i,
  },
  {
    canonSlug: 'saint-petersburg-petropavlovskaya-krepost',
    titleRe: /посещени.*петропавловск/i,
  },
  {
    canonSlug: 'saint-petersburg-kunstkamera',
    titleRe: /посещени.*кунсткамер/i,
  },
  {
    canonSlug: 'moscow-tret-yakovskaya-galereya',
    titleRe: /посещени.*третьяковск/i,
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
  const report = { dryRun, rules: [] };

  try {
    const eventsRes = await pool.query(
      `
        select e.id, e.slug, e.title, e."venueId",
               v.slug as "startSlug", v.title as "startTitle"
        from "Event" e
        left join "Venue" v on v.id = e."venueId"
        where e.status not in ('HIDDEN', 'DRAFT')
          and (
            e.title ~* 'посещени'
            or e.title ~* 'третьяков'
            or e.title ~* 'главн.*(штаб)'
          )
        order by e.title
        limit 5000
      `,
    );

    for (const rule of RULES) {
      const canonRes = await pool.query(
        `select id, slug, title from "Venue" where slug = $1 limit 1`,
        [rule.canonSlug],
      );
      const canon = canonRes.rows[0];
      if (!canon) {
        report.rules.push({ canonSlug: rule.canonSlug, error: 'canon-missing' });
        continue;
      }

      const matched = eventsRes.rows.filter((ev) => rule.titleRe.test(String(ev.title || '')));
      const toInsert = [];
      let skippedStart = 0;
      let skippedExisting = 0;

      for (const ev of matched) {
        if (ev.venueId === canon.id) {
          skippedStart += 1;
          continue;
        }
        const exists = await pool.query(
          `select 1 from event_venue_route_items
           where "eventId" = $1 and "venueId" = $2 and role = 'STOP'::"RouteItemRole"
           limit 1`,
          [ev.id, canon.id],
        );
        if (exists.rows[0]) {
          skippedExisting += 1;
          continue;
        }
        toInsert.push({
          eventId: ev.id,
          title: ev.title,
          startSlug: ev.startSlug,
        });
      }

      const ruleReport = {
        canonSlug: rule.canonSlug,
        canonId: canon.id,
        matched: matched.length,
        skippedStart,
        skippedExisting,
        wouldInsert: toInsert.length,
        sample: toInsert.slice(0, 8),
      };

      if (!dryRun && toInsert.length) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          let inserted = 0;
          for (const row of toInsert) {
            const id = `evri_${crypto.randomBytes(8).toString('hex')}`;
            await client.query(
              `
                insert into event_venue_route_items (id, "eventId", "venueId", role, "sortOrder", "createdAt", "updatedAt")
                values ($1, $2, $3, 'STOP'::"RouteItemRole", 0, now(), now())
                on conflict do nothing
              `,
              [id, row.eventId, canon.id],
            );
            inserted += 1;
          }
          await client.query('COMMIT');
          ruleReport.inserted = inserted;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      report.rules.push(ruleReport);
    }

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
