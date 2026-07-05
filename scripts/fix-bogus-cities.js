/**
 * Сливает фантомные города (Анкт-петербург, Инопской, …) с каноническими.
 * Запуск: node scripts/fix-bogus-cities.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

const ALIASES = {
  'анкт-петербург': 'Санкт-Петербург',
  'инопской': 'Санкт-Петербург',
  'инопская': 'Санкт-Петербург',
  'пуск': 'Санкт-Петербург',
  'плетни': 'Санкт-Петербург',
  'оляной': 'Санкт-Петербург',
  'аунд': 'Санкт-Петербург',
  'основское': 'Сосновское',
  'ветланская': 'Владивосток',
  'тромынский': 'Москва',
  'партаковская': 'Москва',
  'тороны': 'Москва',
  'ити': 'Владивосток',
  'алиха': 'Казань',
  'ерова': 'Самара',
  'цена': 'Нижний Новгород',
  'вобода': 'Самара',
  'оветская': 'Самара',
  'троителей': 'Тольятти',
  'троение': 'Тольятти',
};

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

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

loadEnv();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
  max: 1,
});

async function findCityByTitle(client, title) {
  const { rows } = await client.query(
    'select id, title, slug from "City" where lower(trim(title)) = lower(trim($1)) limit 1',
    [title],
  );
  return rows[0] || null;
}

async function ensureCity(client, title) {
  const existing = await findCityByTitle(client, title);
  if (existing) return existing;
  const slug = slugify(title);
  const id = `city_fix_${slug}`;
  if (dryRun) {
    console.log(`[dry-run] create City: ${title}`);
    return { id, title, slug };
  }
  await client.query(
    `insert into "City" (id, slug, title, "sourceTitle", "isDestination")
     values ($1, $2, $3, $3, true)
     on conflict (slug) do update set title = excluded.title`,
    [id, slug, title],
  );
  return findCityByTitle(client, title);
}

async function reassignCity(client, fromId, toId) {
  const tables = [
    ['Venue', 'cityId'],
    ['Event', 'primaryCityId'],
    ['Landing', 'cityId'],
    ['Article', 'cityId'],
  ];
  for (const [table, column] of tables) {
    const { rowCount } = await client.query(
      `update "${table}" set "${column}" = $1 where "${column}" = $2`,
      [toId, fromId],
    );
    if (rowCount) console.log(`  ${table}.${column}: ${rowCount} rows`);
  }
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows: allCities } = await client.query('select id, title, slug from "City" order by title');
    const byKey = new Map(allCities.map((row) => [normalizeKey(row.title), row]));

    await client.query('begin');

    for (const row of allCities) {
      const key = normalizeKey(row.title);
      const canonicalTitle = ALIASES[key];
      if (!canonicalTitle) continue;

      const target = byKey.get(normalizeKey(canonicalTitle)) || (await ensureCity(client, canonicalTitle));
      if (row.id === target.id) continue;

      console.log(`Merge "${row.title}" (${row.id}) → "${target.title}" (${target.id})`);
      if (!dryRun) {
        await reassignCity(client, row.id, target.id);
        await client.query('delete from "City" where id = $1', [row.id]);
      }
    }

    if (dryRun) {
      await client.query('rollback');
      console.log('Dry run complete (no changes saved).');
    } else {
      await client.query('commit');
      console.log('City cleanup complete.');
    }
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
