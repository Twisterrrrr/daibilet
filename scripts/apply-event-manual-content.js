/**
 * Применить ручные описания событий (event-content-user-batch1.json) через EventOverride.
 *
 *   node scripts/apply-event-manual-content.js --dry-run
 *   node scripts/apply-event-manual-content.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const contentPath = path.join(__dirname, 'data', 'event-content-user-batch1.json');
const dryRun = process.argv.includes('--dry-run');

function loadEnv() {
  for (const name of ['.env', 'apps/backend/.env']) {
    const filePath = path.join(rootDir, name);
    if (!fs.existsSync(filePath)) continue;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortFromDescription(text, max = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const last = slice.lastIndexOf('. ');
  return (last > max * 0.55 ? slice.slice(0, last + 1) : `${slice.trim()}…`).trim();
}

function hasDescription(row) {
  return Boolean(
    String(row.override_description || row.description || row.override_short_description || '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function matchRule(rule, row) {
  const title = normalizeText(row.title);
  const city = normalizeText(row.city);

  if (rule.cityMatch) {
    const parts = normalizeText(rule.cityMatch).split('|').map((part) => part.trim()).filter(Boolean);
    if (!parts.some((part) => city.includes(part))) return false;
  }

  if (rule.titlePattern) {
    return new RegExp(rule.titlePattern, 'iu').test(row.title || '');
  }

  if (rule.titleMatch) {
    const needles = String(rule.titleMatch)
      .split('|')
      .map((part) => normalizeText(part))
      .filter(Boolean);
    return needles.every((needle) => title.includes(needle));
  }

  return false;
}

loadEnv();

if (!fs.existsSync(contentPath)) {
  console.error(`Missing ${contentPath}`);
  process.exit(1);
}

const { rules } = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
if (!Array.isArray(rules) || !rules.length) {
  console.error('No rules in content file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

async function upsertOverride(client, eventId, description) {
  const overrideId = `override_${eventId}`;
  const shortDescription = shortFromDescription(description);
  await client.query(
    `
      insert into "EventOverride" (
        id,
        "eventId",
        description,
        "shortDescription",
        "editorStatus",
        "updatedAt"
      )
      values ($1, $2, $3, $4, 'PUBLISHED', now())
      on conflict ("eventId") do update set
        description = excluded.description,
        "shortDescription" = excluded."shortDescription",
        "editorStatus" = 'PUBLISHED',
        "updatedAt" = now()
    `,
    [overrideId, eventId, description, shortDescription],
  );
}

async function main() {
  const client = await pool.connect();
  const { rows } = await client.query(`
    select distinct on (e.id)
      e.id,
      coalesce(o.title, e.title) as title,
      coalesce(o.description, e.description) as description,
      o.description as override_description,
      o."shortDescription" as override_short_description,
      city.title as city
    from "Event" e
    left join "EventOverride" o on o."eventId" = e.id
    left join "City" city on city.id = e."primaryCityId"
    left join "EventSession" session on session."eventId" = e.id
    where e.status is distinct from 'HIDDEN'::"PublishStatus"
      and (
        session."startsAt" is null
        or session."startsAt" >= now()
        or e.kind = 'OPEN_DATE'
        or e."sourceStatus" = 'open_date'
      )
    order by e.id, session."startsAt" asc nulls last
  `);

  const targets = rows.filter((row) => !hasDescription(row));
  const appliedByRule = new Map();
  const unmatched = [];

  if (!dryRun) await client.query('begin');

  let applied = 0;
  for (const row of targets) {
    const rule = rules.find((item) => matchRule(item, row));
    if (!rule) {
      unmatched.push({ id: row.id, title: row.title, city: row.city });
      continue;
    }

    if (!dryRun) {
      await upsertOverride(client, row.id, rule.description);
    }

    applied += 1;
    appliedByRule.set(rule.id, (appliedByRule.get(rule.id) || 0) + 1);
  }

  if (!dryRun) await client.query('commit');

  console.log(
    JSON.stringify(
      {
        dryRun,
        candidatesWithoutDescription: targets.length,
        applied,
        unmatched: unmatched.length,
        byRule: Object.fromEntries(appliedByRule),
        unmatchedSample: unmatched.slice(0, 20),
      },
      null,
      2,
    ),
  );

  client.release();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
