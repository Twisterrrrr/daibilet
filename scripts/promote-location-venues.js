/**
 * Продвигает публичные локации (причалы, автобусы, парки) в статус CANDIDATE
 * и проставляет canonicalPath, если его нет.
 *
 *   node scripts/promote-location-venues.js --dry-run
 *   node scripts/promote-location-venues.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const INSTITUTION_KINDS = new Set([
  'MUSEUM_ART_SPACE',
  'THEATER',
  'CONCERT_HALL',
  'CLUB_BAR_RESTAURANT',
  'BAR',
]);

const LOCATION_KINDS = new Set(['PIER', 'PIER_WATER', 'BUS', 'OUTDOOR_LOCATION', 'SPORT_ACTIVITY_SPACE', 'ATTRACTION', 'VENUE']);

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

function normalizeSlug(value) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildSlug(row) {
  const fromSlug = normalizeSlug(row.slug);
  if (fromSlug && !/^[a-f0-9]{20,}$/i.test(fromSlug)) return fromSlug;
  const fromTitle = normalizeSlug(row.title);
  const idPart = String(row.id || '').replace(/^venue_/, '');
  if (fromTitle) return `${fromTitle}-${normalizeSlug(idPart) || idPart}`;
  return normalizeSlug(idPart) || idPart;
}

function locationBasePath(kind) {
  return 'locations';
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

(async () => {
  const client = await pool.connect();
  const { rows } = await client.query(`
    select
      v.id,
      v.slug,
      v.title,
      v.kind::text as kind,
      v.address,
      v.description,
      v."shortDescription",
      v."heroImageUrl",
      v."pageStatus"::text as "pageStatus",
      v."canonicalPath",
      count(e.id)::int as events
    from "Venue" v
    left join "Event" e on e."venueId" = v.id
    where coalesce(v."pageStatus"::text, 'PUBLISHED') <> 'HIDDEN'
      and v.kind::text <> all($1::text[])
    group by v.id
    having count(e.id) >= 1
    order by count(e.id) desc, v.title asc
  `, [['MEETING_POINT', 'ONLINE', ...INSTITUTION_KINDS]]);

  let promoted = 0;
  let canonicalUpdated = 0;
  let slugUpdated = 0;

  await client.query('begin');

  for (const row of rows) {
    const kind = String(row.kind || 'OTHER').toUpperCase();
    if (INSTITUTION_KINDS.has(kind)) continue;
    if (!LOCATION_KINDS.has(kind) && kind !== 'OTHER') continue;

    const hasAddress = Boolean(String(row.address || '').trim());
    const hasContent =
      Boolean(String(row.description || '').trim()) ||
      Boolean(String(row.shortDescription || '').trim()) ||
      Boolean(String(row.heroImageUrl || '').trim());
    if (!hasAddress || !hasContent) continue;

    const nextSlug = buildSlug(row);
    const canonicalPath = row.canonicalPath || `/${locationBasePath(kind)}/${nextSlug}`;
    const currentStatus = String(row.pageStatus || 'NONE').toUpperCase();
    const nextStatus = currentStatus === 'PUBLISHED' ? 'PUBLISHED' : 'CANDIDATE';

    const updates = [];
    const values = [];
    let index = 1;

    if (normalizeSlug(row.slug) !== nextSlug) {
      updates.push(`slug = $${index++}`);
      values.push(nextSlug);
      slugUpdated += 1;
    }
    if (!row.canonicalPath) {
      updates.push(`"canonicalPath" = $${index++}`);
      values.push(canonicalPath);
      canonicalUpdated += 1;
    }
    if (currentStatus === 'NONE') {
      updates.push(`"pageStatus" = $${index++}::"VenuePageStatus"`);
      values.push(nextStatus);
      promoted += 1;
    }

    if (!updates.length) continue;

    values.push(row.id);
    const sql = `update "Venue" set ${updates.join(', ')}, "updatedAt" = now() where id = $${index}`;
    if (dryRun) {
      console.log('[dry-run]', row.title, '->', nextStatus, canonicalPath);
    } else {
      await client.query(sql, values);
    }
  }

  if (dryRun) {
    await client.query('rollback');
    console.log(`[dry-run] promoted=${promoted}, canonical=${canonicalUpdated}, slug=${slugUpdated}`);
  } else {
    await client.query('commit');
    console.log(`promoted=${promoted}, canonical=${canonicalUpdated}, slug=${slugUpdated}`);
  }

  client.release();
  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
