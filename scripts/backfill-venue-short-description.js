/**
 * Заполнить shortDescription из description, если short пустой.
 * node scripts/backfill-venue-short-description.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

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

function shortFromDescription(text, max = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const last = slice.lastIndexOf('. ');
  return (last > max * 0.55 ? slice.slice(0, last + 1) : `${slice.trim()}…`).trim();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

(async () => {
  const { rows } = await pool.query(`
    select id, title, description
    from "Venue"
    where coalesce(trim("shortDescription"), '') = ''
      and coalesce(trim(description), '') <> ''
      and coalesce("pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
  `);

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Venues to backfill: ${rows.length}`);

  if (dryRun) {
    rows.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   → ${shortFromDescription(r.description).slice(0, 100)}…`);
    });
    if (rows.length > 10) console.log(`… and ${rows.length - 10} more`);
    await pool.end();
    return;
  }

  let updated = 0;
  for (const row of rows) {
    const shortDescription = shortFromDescription(row.description);
    await pool.query(
      `update "Venue" set "shortDescription" = $2, "seoDescription" = coalesce(nullif(trim("seoDescription"), ''), $2), "updatedAt" = now() where id = $1`,
      [row.id, shortDescription],
    );
    updated += 1;
  }

  console.log(`Updated: ${updated}`);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
