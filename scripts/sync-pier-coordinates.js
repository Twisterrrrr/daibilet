/**
 * Синхронизирует координаты причалов в БД: сдвиг с берега на воду + overrides из location-descriptions.json.
 *
 *   node scripts/sync-pier-coordinates.js --dry-run
 *   node scripts/sync-pier-coordinates.js
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

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

(async () => {
  const { resolvePublicVenueCoordinates, isPierVenueKind } = await import(
    path.join(rootDir, 'apps/backend/src/dto.js')
  );

  const client = await pool.connect();
  let updated = 0;

  try {
    const { rows } = await client.query(
      `SELECT v.id, v.slug, v.title, v.kind, v.latitude, v.longitude, v.address, c.title AS city
       FROM "Venue" v
       LEFT JOIN "City" c ON c.id = v."cityId"
       WHERE v.kind = 'PIER'
         AND v.latitude IS NOT NULL
         AND v.longitude IS NOT NULL
         AND ABS(v.latitude) > 1
         AND ABS(v.longitude) > 1`,
    );

    for (const row of rows) {
      const kind = 'pier';
      if (!isPierVenueKind(kind)) continue;

      const resolved = resolvePublicVenueCoordinates(row, { resolvedType: kind });
      if (!resolved) continue;

      const oldLat = Number(row.latitude);
      const oldLng = Number(row.longitude);
      const { latitude: newLat, longitude: newLng } = resolved;

      const moved =
        Math.abs(oldLat - newLat) > 0.00001 || Math.abs(oldLng - newLng) > 0.00001;
      if (!moved) continue;

      console.log(
        `${dryRun ? '[dry-run] ' : ''}${row.slug}\n  ${oldLat}, ${oldLng} → ${newLat}, ${newLng}`,
      );

      if (!dryRun) {
        await client.query(
          `UPDATE "Venue" SET latitude = $1, longitude = $2, "updatedAt" = NOW() WHERE id = $3`,
          [String(newLat), String(newLng), row.id],
        );
      }
      updated += 1;
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'}: ${updated} pier(s)`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
