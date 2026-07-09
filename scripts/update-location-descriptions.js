/**
 * Обновляет описания, адреса и координаты публичных локаций по slug.
 *
 *   node scripts/update-location-descriptions.js --dry-run
 *   node scripts/update-location-descriptions.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');
const updates = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/location-descriptions.json'), 'utf8'),
);

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

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const client = await pool.connect();
  let updated = 0;
  let missing = 0;

  try {
    for (const item of updates) {
      const { rows } = await client.query(
        `SELECT id, slug, title, address, latitude, longitude, "shortDescription", description
         FROM "Venue" WHERE slug = $1 LIMIT 1`,
        [item.slug],
      );
      const row = rows[0];
      if (!row) {
        missing += 1;
        console.warn(`MISSING: ${item.slug}`);
        continue;
      }

      const fields = [];
      const values = [];
      let idx = 1;

      const setField = (column, value) => {
        if (value === undefined || value === null || value === '') return;
        fields.push(`"${column}" = $${idx++}`);
        values.push(value);
      };

      setField('shortDescription', item.shortDescription);
      setField('description', item.description);
      setField('address', item.address);
      if (typeof item.latitude === 'number') setField('latitude', item.latitude);
      if (typeof item.longitude === 'number') setField('longitude', item.longitude);

      if (!fields.length) continue;

      fields.push(`"updatedAt" = NOW()`);
      values.push(row.id);

      const sql = `UPDATE "Venue" SET ${fields.join(', ')} WHERE id = $${idx}`;
      if (dryRun) {
        console.log(`[dry-run] ${row.title} (${item.slug})`);
        continue;
      }

      await client.query(sql, values);
      updated += 1;
      console.log(`OK: ${row.title}`);
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\nDone: ${updated} updated, ${missing} missing, ${updates.length} total`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
