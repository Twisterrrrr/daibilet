/**
 * Применить ручные описания и адреса площадок (venue-content-manual.json).
 *
 *   node scripts/apply-venue-manual-content.js --user-batch2
 *   node scripts/apply-venue-manual-content.js --dry-run --user-batch2
 *   node scripts/apply-venue-manual-content.js --user-batch4
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const manualPath = path.join(__dirname, 'data', 'venue-content-manual.json');
const userBatchPath = path.join(__dirname, 'data', 'venue-content-user-batch.json');
const userBatch2Path = path.join(__dirname, 'data', 'venue-content-user-batch2.json');
const userBatch3Path = path.join(__dirname, 'data', 'venue-content-user-batch3.json');
const userBatch4Path = path.join(__dirname, 'data', 'venue-content-user-batch4.json');
const userCorrectionsPath = path.join(__dirname, 'data', 'venue-content-user-corrections.json');
const dryRun = process.argv.includes('--dry-run');
const onlyUserBatch = process.argv.includes('--user-batch');
const onlyUserBatch2 = process.argv.includes('--user-batch2');
const onlyUserBatch3 = process.argv.includes('--user-batch3');
const onlyUserBatch4 = process.argv.includes('--user-batch4');
const onlyUserCorrections = process.argv.includes('--user-corrections');

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

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/["«»]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(input) {
  return (
    String(input || 'item')
      .toLowerCase()
      .replace(/ё/g, 'e')
      .replace(/[^a-zа-я0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'item'
  );
}

function shortFromDescription(text, max = 220) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const last = slice.lastIndexOf('. ');
  return (last > max * 0.55 ? slice.slice(0, last + 1) : `${slice.trim()}…`).trim();
}

loadEnv();

if (
  !fs.existsSync(manualPath) &&
  !fs.existsSync(userBatchPath) &&
  !fs.existsSync(userBatch2Path) &&
  !fs.existsSync(userBatch3Path) &&
  !fs.existsSync(userBatch4Path) &&
  !fs.existsSync(userCorrectionsPath)
) {
  console.error('Missing venue content files');
  process.exit(1);
}

function loadEntries(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(payload.venues) ? payload.venues : payload;
}

const entries = onlyUserCorrections
  ? loadEntries(userCorrectionsPath)
  : onlyUserBatch4
    ? loadEntries(userBatch4Path)
    : onlyUserBatch3
      ? loadEntries(userBatch3Path)
      : onlyUserBatch2
        ? loadEntries(userBatch2Path)
        : onlyUserBatch
          ? loadEntries(userBatchPath)
          : [
              ...loadEntries(manualPath),
              ...loadEntries(userBatchPath),
              ...loadEntries(userBatch2Path),
              ...loadEntries(userBatch3Path),
              ...loadEntries(userBatch4Path),
              ...loadEntries(userCorrectionsPath),
            ];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

async function findCityId(client, cityName) {
  if (!cityName) return null;
  const { rows } = await client.query(
    `select id from "City" where lower(trim(title)) = lower(trim($1)) limit 1`,
    [cityName],
  );
  if (rows[0]) return rows[0].id;
  const slug = slugify(cityName);
  const id = `city_manual_${slug}`;
  if (dryRun) return id;
  await client.query(
    `insert into "City" (id, slug, title, "sourceTitle", "isDestination")
     values ($1, $2, $3, $3, true)
     on conflict (slug) do update set title = excluded.title
     returning id`,
    [id, slug, cityName],
  );
  const again = await client.query(`select id from "City" where slug = $1 limit 1`, [slug]);
  return again.rows[0]?.id || id;
}

async function main() {
  const client = await pool.connect();
  const { rows: venues } = await client.query(`
    select v.id, v.title, c.title as city, v.address
    from "Venue" v
    left join "City" c on c.id = v."cityId"
    where v.kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT')
  `);

  const byKey = new Map();
  for (const venue of venues) {
    byKey.set(normalizeKey(venue.title), venue);
  }

  let applied = 0;
  let skipped = 0;
  const unmatched = [];

  await client.query('begin');

  for (const entry of entries) {
    const keys = [entry.id, entry.title, ...(entry.match || []), ...(entry.aliases || [])]
      .filter(Boolean)
      .map(normalizeKey);

    let venue = entry.id ? venues.find((v) => v.id === entry.id) : null;
    if (!venue && entry.id) {
      const byId = await client.query(
        `select v.id, v.title, c.title as city, v.address from "Venue" v left join "City" c on c.id = v."cityId" where v.id = $1 limit 1`,
        [entry.id],
      );
      venue = byId.rows[0] || null;
    }
    if (!venue) {
      for (const key of keys) {
        if (byKey.has(key)) {
          venue = byKey.get(key);
          break;
        }
      }
    }
    if (!venue) {
      for (const key of keys) {
        venue = venues.find((v) => normalizeKey(v.title).includes(key) || key.includes(normalizeKey(v.title)));
        if (venue) break;
      }
    }

    if (!venue) {
      unmatched.push(entry.title || entry.match?.[0] || entry.id || '?');
      skipped += 1;
      continue;
    }

    const description = entry.description || null;
    const shortDescription = entry.shortDescription || (description ? shortFromDescription(description) : null);
    const address = entry.address || null;
    const cityName = entry.city || null;
    const publicTitle = entry.title || null;
    let cityId = null;
    if (cityName) cityId = await findCityId(client, cityName);

    if (dryRun) {
      console.log(`→ ${venue.title}`);
      if (publicTitle && publicTitle !== venue.title) console.log(`  title: ${publicTitle}`);
      console.log(`  address: ${address || '(keep)'}`);
      console.log(`  city: ${cityName || '(keep)'}`);
      console.log(`  short: ${(shortDescription || '').slice(0, 100)}…`);
      for (const duplicateId of entry.duplicateIds || []) {
        console.log(`  hide duplicate: ${duplicateId}`);
      }
      applied += 1;
      continue;
    }

    await client.query(
      `
        update "Venue"
        set
          title = coalesce($2, title),
          address = coalesce($3, address),
          "cityId" = coalesce($4, "cityId"),
          "shortDescription" = coalesce($5, "shortDescription"),
          description = coalesce($6, description),
          "seoDescription" = coalesce($7, "seoDescription"),
          "updatedAt" = now()
        where id = $1
      `,
      [
        venue.id,
        publicTitle,
        address,
        cityId,
        shortDescription,
        description,
        entry.seoDescription || shortDescription,
      ],
    );

    if (cityId) {
      await client.query(`update "Event" set "primaryCityId" = $2 where "venueId" = $1 and "primaryCityId" is distinct from $2`, [
        venue.id,
        cityId,
      ]);
    }

    for (const duplicateId of entry.duplicateIds || []) {
      if (dryRun) {
        console.log(`  hide duplicate: ${duplicateId}`);
        continue;
      }
      await client.query(
        `
          update "Venue"
          set "pageStatus" = 'HIDDEN', "updatedAt" = now()
          where id = $1
        `,
        [duplicateId],
      );
    }

    applied += 1;
  }

  if (dryRun) {
    await client.query('rollback');
  } else {
    await client.query('commit');
  }

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Applied: ${applied}, skipped: ${skipped}`);
  if (unmatched.length) {
    console.log('Unmatched:');
    for (const name of unmatched.slice(0, 30)) console.log(`  - ${name}`);
    if (unmatched.length > 30) console.log(`  … and ${unmatched.length - 30} more`);
  }

  client.release();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
