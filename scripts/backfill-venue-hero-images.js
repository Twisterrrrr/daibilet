/**
 * Заполнить heroImageUrl площадок из обложек событий в афише.
 *
 *   node scripts/backfill-venue-hero-images.js --dry-run
 *   node scripts/backfill-venue-hero-images.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
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

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

async function main() {
  const client = await pool.connect();
  const { rows } = await client.query(`
    select
      v.id,
      v.title,
      v."heroImageUrl" as current_image,
      picked.image_url as next_image
    from "Venue" v
    join lateral (
      select coalesce(override."imageUrl", e."imageUrl") as image_url
      from "Event" e
      left join "EventOverride" override on override."eventId" = e.id
      where e."venueId" = v.id
        and coalesce(override."imageUrl", e."imageUrl") ~* '^https?://'
      order by e."updatedAt" desc nulls last
      limit 1
    ) picked on true
    where coalesce(v."heroImageUrl", '') = ''
       or v."heroImageUrl" !~* '^https?://'
  `);

  let updated = 0;
  await client.query('begin');

  for (const row of rows) {
    if (!row.next_image || row.current_image === row.next_image) continue;
    if (dryRun) {
      console.log(`→ ${row.title}`);
      console.log(`  ${row.current_image || '(empty)'} → ${row.next_image}`);
      updated += 1;
      continue;
    }
    await client.query(
      `update "Venue" set "heroImageUrl" = $2, "updatedAt" = now() where id = $1`,
      [row.id, row.next_image],
    );
    updated += 1;
  }

  if (dryRun) {
    await client.query('rollback');
  } else {
    await client.query('commit');
  }

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Updated: ${updated}`);
  client.release();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
