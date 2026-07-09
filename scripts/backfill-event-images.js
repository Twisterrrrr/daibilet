/**
 * Проставляет imageUrl в EventOverride для событий без обложки.
 * node scripts/backfill-event-images.js [--dry-run]
 *
 * Перед запуском: scripts/tmp-no-image-groups.json (scripts/tmp-group-no-image-events.js)
 * Картинки: /var/www/daibilet/public/images/events/  (локально apps/public/public/images/events/)
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const overridesPath = path.join(__dirname, 'data', 'event-image-overrides.json');
const filesPath = path.join(__dirname, 'data', 'event-image-files.json');
const groupsPath = path.join(__dirname, 'tmp-no-image-groups.json');

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

function resolveImageUrl(group, overrides, filesByKey) {
  const key = group.key || '';
  const title = String(group.title || '').toLowerCase();

  if (filesByKey[key]) {
    return `/images/events/${filesByKey[key]}`;
  }

  for (const [pattern, url] of Object.entries(overrides)) {
    if (key === pattern || key.includes(pattern) || title.includes(pattern)) {
      return url;
    }
  }

  const slug = String(group.sampleSlug || '').trim();
  if (!slug) throw new Error(`No sampleSlug for group: ${group.title}`);
  return `/images/events/${slug}.jpg`;
}

async function main() {
  loadEnv();

  if (!fs.existsSync(groupsPath)) {
    throw new Error(`Missing ${groupsPath}. Run tmp-group-no-image-events.js first.`);
  }

  const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
  const overrides = fs.existsSync(overridesPath)
    ? JSON.parse(fs.readFileSync(overridesPath, 'utf8'))
    : {};
  const filesByKey = fs.existsSync(filesPath)
    ? JSON.parse(fs.readFileSync(filesPath, 'utf8'))
    : {};

  const assignments = groups.map((group) => ({
    title: group.title,
    city: group.city,
    count: group.eventIds.length,
    imageUrl: resolveImageUrl(group, overrides, filesByKey),
    eventIds: group.eventIds,
  }));

  const uniqueUrls = [...new Set(assignments.map((a) => a.imageUrl))];
  console.log(`groups=${assignments.length} events=${assignments.reduce((s, a) => s + a.count, 0)} unique_images=${uniqueUrls.length}`);
  for (const a of assignments) {
    console.log(`${a.count}x ${a.imageUrl} — ${a.title?.slice(0, 60)}`);
  }

  if (dryRun) {
    console.log('DRY RUN — no DB changes');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();

  try {
    await client.query('begin');
    let updated = 0;

    for (const assignment of assignments) {
      for (const eventId of assignment.eventIds) {
        await client.query(
          `
            insert into "EventOverride" (
              id, "eventId", "imageUrl", "editorStatus", "updatedAt"
            )
            values ($1, $2, $3, 'PUBLISHED', now())
            on conflict ("eventId") do update set
              "imageUrl" = excluded."imageUrl",
              "editorStatus" = 'PUBLISHED',
              "updatedAt" = now()
          `,
          [`override_${eventId}`, eventId, assignment.imageUrl],
        );
        updated += 1;
      }
    }

    await client.query('commit');
    console.log(`OK: ${updated} event overrides updated`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
