/**
 * Нормализация названий и адресов всех public-площадок в БД.
 *
 *   node scripts/apply-venue-address-normalize.js --dry-run
 *   node scripts/apply-venue-address-normalize.js
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

loadEnv();

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

async function loadOverrides() {
  const filePath = path.join(__dirname, 'data', 'venue-address-overrides.json');
  if (!fs.existsSync(filePath)) return new Map();
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const map = new Map();
  for (const entry of payload.venues || []) {
    const keys = [entry.id, entry.title, ...(entry.match || []), ...(entry.aliases || [])].filter(Boolean);
    for (const key of keys) map.set(key, entry);
  }
  return map;
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

function findOverride(overrides, venue) {
  const keys = [venue.id, venue.title].filter(Boolean).map(normalizeKey);
  for (const key of keys) {
    if (overrides.has(key)) return overrides.get(key);
  }
  for (const [key, entry] of overrides.entries()) {
    if (keys.some((item) => item.includes(key) || key.includes(item))) return entry;
  }
  return null;
}

async function main() {
  const { normalizePublicVenueRecord } = await import('../apps/backend/src/venue-normalize.js');
  const overrides = await loadOverrides();
  const client = await pool.connect();
  const { rows: venues } = await client.query(`
    select v.id, v.title, v.address, v.kind, v."cityId", c.title as city
    from "Venue" v
    left join "City" c on c.id = v."cityId"
  `);

  let updated = 0;
  let unchanged = 0;

  await client.query('begin');

  for (const venue of venues) {
    const override = findOverride(overrides, venue);
    const normalized = normalizePublicVenueRecord({
      id: venue.id,
      title: venue.title,
      address: venue.address,
      city: venue.city,
    });

    const nextTitle = normalized.title || venue.title;
    const nextAddress = normalized.address || venue.address;
    const nextCity = normalized.city || venue.city;
    const nextKind = override?.kind || venue.kind;
    let nextCityId = venue.cityId;

    if (nextCity && nextCity !== venue.city) {
      nextCityId = await findCityId(client, nextCity);
    }

    const titleChanged = nextTitle !== venue.title;
    const addressChanged = (nextAddress || '') !== (venue.address || '');
    const cityChanged = nextCityId && nextCityId !== venue.cityId;
    const kindChanged = nextKind && nextKind !== venue.kind;

    if (!titleChanged && !addressChanged && !cityChanged && !kindChanged) {
      unchanged += 1;
      continue;
    }

    if (dryRun) {
      console.log(`→ ${venue.title}`);
      if (titleChanged) console.log(`  title: ${nextTitle}`);
      if (addressChanged) console.log(`  address: ${venue.address || '(empty)'} → ${nextAddress || '(empty)'}`);
      if (cityChanged) console.log(`  city: ${venue.city || '(empty)'} → ${nextCity}`);
      if (kindChanged) console.log(`  kind: ${venue.kind || '(empty)'} → ${nextKind}`);
      updated += 1;
      continue;
    }

    await client.query(
      `
        update "Venue"
        set
          title = $2,
          address = $3,
          kind = coalesce($4, kind),
          "cityId" = coalesce($5, "cityId"),
          "updatedAt" = now()
        where id = $1
      `,
      [venue.id, nextTitle, nextAddress, kindChanged ? nextKind : null, cityChanged ? nextCityId : null],
    );

    if (cityChanged && nextCityId) {
      await client.query(
        `update "Event" set "primaryCityId" = $2 where "venueId" = $1 and "primaryCityId" is distinct from $2`,
        [venue.id, nextCityId],
      );
    }

    updated += 1;
  }

  if (dryRun) {
    await client.query('rollback');
  } else {
    await client.query('commit');
  }

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Updated: ${updated}, unchanged: ${unchanged}`);
  client.release();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
