#!/usr/bin/env node
/**
 * Enrich must-see Venue entities with editorial profile:
 * hookFact, description (О локации), wayToFind, coords, address, metroStation.
 *
 * NEVER overwrites non-empty shortDescription (card lead from cityInfo).
 * Creates missing Venue rows (PUBLISHED) when city resolves.
 *
 * Usage:
 *   node scripts/enrich-must-see-editorial.js --dry-run
 *   node scripts/enrich-must-see-editorial.js --apply
 *   node scripts/enrich-must-see-editorial.js --apply --cities=moscow,saint-petersburg
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const DATA_PATH = path.join(rootDir, 'scripts/data/must-see-editorial.json');

const CITY_SLUG_ALIASES = {
  moscow: ['moscow', 'moskva', 'москва'],
  'saint-petersburg': [
    'saint-petersburg',
    'sankt-peterburg',
    'spb',
    'petersburg',
    'санкт-петербург',
  ],
  kazan: ['kazan', 'казань'],
  kaliningrad: ['kaliningrad', 'калининград'],
  vladimir: ['vladimir', 'владимир'],
  yaroslavl: ['yaroslavl', 'ярославль'],
  ekaterinburg: ['ekaterinburg', 'yekaterinburg', 'екатеринбург'],
  'nizhny-novgorod': [
    'nizhny-novgorod',
    'nizhniy-novgorod',
    'нижний-новгород',
    'нижнии-новгород',
  ],
  novosibirsk: ['novosibirsk', 'новосибирск'],
  krasnoyarsk: ['krasnoyarsk', 'красноярск'],
  tula: ['tula', 'тула'],
  samara: ['samara', 'самара'],
  omsk: ['omsk', 'омск'],
  ufa: ['ufa', 'уфа'],
  'veliky-novgorod': [
    'veliky-novgorod',
    'velikiy-novgorod',
    'великий-новгород',
    'великии-новгород',
  ],
  tver: ['tver', 'тверь'],
  krasnodar: ['krasnodar', 'краснодар'],
  sochi: ['sochi', 'сочи'],
  tyumen: ['tyumen', 'тюмень'],
  voronezh: ['voronezh', 'воронеж'],
  'rostov-na-donu': ['rostov-na-donu', 'rostov-on-don', 'ростов-на-дону'],
  vladivostok: ['vladivostok', 'владивосток'],
  vologda: ['vologda', 'вологда'],
  irkutsk: ['irkutsk', 'иркутск'],
  perm: ['perm', 'permi', 'пермь'],
  sortavala: ['sortavala', 'сортавала'],
  saratov: ['saratov', 'саратов'],
  'ulan-ude': ['ulan-ude', 'улан-удэ', 'улан-уде'],
  chelyabinsk: ['chelyabinsk', 'челябинск'],
  ryazan: ['ryazan', 'рязань'],
  stavropol: ['stavropol', 'ставрополь'],
  tomsk: ['tomsk', 'томск'],
  ulyanovsk: ['ulyanovsk', 'ульяновск'],
  izhevsk: ['izhevsk', 'ижевск'],
  orel: ['orel', 'oryol', 'орёл', 'орел'],
  orenburg: ['orenburg', 'оренбург'],
  abakan: ['abakan', 'абакан'],
  pskov: ['pskov', 'псков'],
  sevastopol: ['sevastopol', 'севастополь'],
  simferopol: ['simferopol', 'симферополь'],
  penza: ['penza', 'пенза'],
  volgograd: ['volgograd', 'волгоград'],
  arhangelsk: ['arhangelsk', 'arkhangelsk', 'архангельск'],
};

const CITY_TITLE_ALIASES = {
  moscow: ['Москва'],
  'saint-petersburg': ['Санкт-Петербург'],
  kazan: ['Казань'],
  kaliningrad: ['Калининград'],
  vladimir: ['Владимир'],
  yaroslavl: ['Ярославль'],
  ekaterinburg: ['Екатеринбург'],
  'nizhny-novgorod': ['Нижний Новгород'],
  novosibirsk: ['Новосибирск'],
  krasnoyarsk: ['Красноярск'],
  tula: ['Тула'],
  samara: ['Самара'],
  omsk: ['Омск'],
  ufa: ['Уфа'],
  'veliky-novgorod': ['Великий Новгород'],
  tver: ['Тверь'],
  krasnodar: ['Краснодар'],
  sochi: ['Сочи'],
  tyumen: ['Тюмень'],
  voronezh: ['Воронеж'],
  'rostov-na-donu': ['Ростов-на-Дону'],
  vladivostok: ['Владивосток'],
  vologda: ['Вологда'],
  irkutsk: ['Иркутск'],
  perm: ['Пермь'],
  sortavala: ['Сортавала'],
  saratov: ['Саратов'],
  'ulan-ude': ['Улан-Удэ'],
  chelyabinsk: ['Челябинск'],
  ryazan: ['Рязань'],
  stavropol: ['Ставрополь'],
  tomsk: ['Томск'],
  ulyanovsk: ['Ульяновск'],
  izhevsk: ['Ижевск'],
  orel: ['Орёл', 'Орел'],
  orenburg: ['Оренбург'],
  abakan: ['Абакан'],
  pskov: ['Псков'],
  sevastopol: ['Севастополь'],
  simferopol: ['Симферополь'],
  penza: ['Пенза'],
  volgograd: ['Волгоград'],
  arhangelsk: ['Архангельск'],
};

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const citiesFilter = parseCitiesFilter(process.argv);
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Missing data file: ${DATA_PATH}`);
  }
  const all = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  if (!Array.isArray(all) || !all.length) throw new Error('Editorial JSON empty');

  const rows = citiesFilter.size
    ? all.filter((row) => citiesFilter.has(row.cityKey))
    : all;

  const pool = new Pool({ connectionString, max: 2 });
  const cityCache = new Map();
  const report = { dryRun, total: rows.length, byAction: {}, sample: [], missingCity: [] };

  try {
    const hasHookFact = await columnExists(pool, 'Venue', 'hookFact');
    const hasWayToFind = await columnExists(pool, 'Venue', 'wayToFind');
    const hasMetro = await columnExists(pool, 'Venue', 'metroStation');
    report.columns = { hasHookFact, hasWayToFind, hasMetro };

    for (const item of rows) {
      const city = await resolveCity(pool, cityCache, item.cityKey);
      if (!city) {
        report.missingCity.push({ slug: item.slug, cityKey: item.cityKey });
        bump(report.byAction, 'skip-no-city');
        continue;
      }

      const inferred = inferKindAndFamily(item.title);
      const pageStatus = 'PUBLISHED';
      const canonicalPath =
        inferred.family === 'institution' ? `/venues/${item.slug}` : `/locations/${item.slug}`;

      const before = await pool.query(
        `select id, slug, "shortDescription", description, "hookFact", latitude, longitude,
                address, "metroStation", "wayToFind", kind, "pageStatus", "cityId"
         from "Venue" where slug = $1 limit 1`,
        [item.slug],
      );
      const existing = before.rows[0] || null;
      const action = existing ? 'update' : 'insert';

      if (!dryRun) {
        if (existing) {
          await updateVenue(pool, {
            item,
            existing,
            cityId: city.id,
            kind: inferred.kind,
            pageStatus,
            canonicalPath,
            hasHookFact,
            hasWayToFind,
            hasMetro,
          });
        } else {
          await insertVenue(pool, {
            item,
            cityId: city.id,
            kind: inferred.kind,
            pageStatus,
            canonicalPath,
            family: inferred.family,
            hasHookFact,
            hasWayToFind,
            hasMetro,
          });
        }
      }

      bump(report.byAction, action);
      if (report.sample.length < 12) {
        report.sample.push({
          slug: item.slug,
          action,
          city: city.slug,
          preservedShort: Boolean(existing && String(existing.shortDescription || '').trim()),
        });
      }
    }
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify(report, null, 2));
}

async function updateVenue(pool, ctx) {
  const {
    item,
    existing,
    cityId,
    kind,
    pageStatus,
    canonicalPath,
    hasHookFact,
    hasWayToFind,
    hasMetro,
  } = ctx;
  const seoTitle = `${item.title} | Дайбилет`;
  // Preserve non-empty shortDescription; fill only if blank.
  const shortKeep = String(existing.shortDescription || '').trim();
  const shortNext = shortKeep || item.shortDescription || null;

  const sets = [
    'title = $2',
    'kind = $3::"VenueKind"',
    '"pageStatus" = $4::"VenuePageStatus"',
    '"cityId" = $5',
    '"shortDescription" = $6',
    'description = $7',
    'address = $8',
    'latitude = $9',
    'longitude = $10',
    '"seoH1" = coalesce(nullif(trim("seoH1"), \'\'), $2)',
    '"seoTitle" = coalesce(nullif(trim("seoTitle"), \'\'), $11)',
    '"seoDescription" = coalesce(nullif(trim("seoDescription"), \'\'), $6)',
    '"canonicalPath" = coalesce(nullif(trim("canonicalPath"), \'\'), $12)',
    '"isIndexable" = true',
    '"updatedAt" = now()',
  ];
  const params = [
    item.slug,
    item.title,
    kind,
    pageStatus,
    cityId,
    shortNext,
    item.description,
    item.address,
    item.latitude,
    item.longitude,
    seoTitle,
    canonicalPath,
  ];

  if (hasHookFact) {
    params.push(item.hookFact);
    sets.push(`"hookFact" = $${params.length}`);
  }
  if (hasWayToFind) {
    params.push(item.wayToFind);
    sets.push(`"wayToFind" = $${params.length}`);
  }
  if (hasMetro) {
    params.push(item.metroStation || null);
    sets.push(`"metroStation" = $${params.length}`);
  }

  await pool.query(`update "Venue" set ${sets.join(', ')} where slug = $1`, params);
}

async function insertVenue(pool, ctx) {
  const {
    item,
    cityId,
    kind,
    pageStatus,
    canonicalPath,
    hasHookFact,
    hasWayToFind,
    hasMetro,
  } = ctx;
  const id = `ven_ms_${crypto.createHash('sha1').update(item.slug).digest('hex').slice(0, 16)}`;
  const seoTitle = `${item.title} | Дайбилет`;

  const cols = [
    'id',
    'slug',
    'title',
    'kind',
    '"pageStatus"',
    '"cityId"',
    '"shortDescription"',
    'description',
    'address',
    'latitude',
    'longitude',
    '"seoH1"',
    '"seoTitle"',
    '"seoDescription"',
    '"canonicalPath"',
    '"isIndexable"',
    '"createdAt"',
    '"updatedAt"',
  ];
  const vals = [
    '$1',
    '$2',
    '$3',
    '$4::"VenueKind"',
    '$5::"VenuePageStatus"',
    '$6',
    '$7',
    '$8',
    '$9',
    '$10',
    '$11',
    '$3',
    '$12',
    '$7',
    '$13',
    'true',
    'now()',
    'now()',
  ];
  const params = [
    id,
    item.slug,
    item.title,
    kind,
    pageStatus,
    cityId,
    item.shortDescription || null,
    item.description,
    item.address,
    item.latitude,
    item.longitude,
    seoTitle,
    canonicalPath,
  ];

  if (hasHookFact) {
    cols.push('"hookFact"');
    params.push(item.hookFact);
    vals.push(`$${params.length}`);
  }
  if (hasWayToFind) {
    cols.push('"wayToFind"');
    params.push(item.wayToFind);
    vals.push(`$${params.length}`);
  }
  if (hasMetro) {
    cols.push('"metroStation"');
    params.push(item.metroStation || null);
    vals.push(`$${params.length}`);
  }

  await pool.query(
    `insert into "Venue" (${cols.join(', ')}) values (${vals.join(', ')})`,
    params,
  );
}

function inferKindAndFamily(name) {
  const n = String(name || '').toLowerCase();
  if (/парк|сад\b|эспланад|зарядье|вднх|петергоф|столб|зоопарк|академгородок/.test(n)) {
    return { kind: 'PARK', family: 'location' };
  }
  if (/памятник|скульптур|бюст/.test(n)) {
    return { kind: 'MONUMENT', family: 'location' };
  }
  if (/театр|оперн|балет|новат/.test(n)) {
    return { kind: 'THEATER', family: 'institution' };
  }
  if (
    /музей|галере|эрмитаж|третьяков|пряник|оружия|ельцин|погребаль|суриков|пароход|комбинат|октава|космическ/.test(
      n,
    )
  ) {
    return { kind: 'MUSEUM_ART_SPACE', family: 'institution' };
  }
  if (
    /набережн|площад|кремл|крепост|собор|храм|улиц|мост|лестниц|остров|фонтан|сити|стрелка|ворот|башня|костёл|костел|бункер|часовн|деревн|коса|плотн|городок|кластер/.test(
      n,
    )
  ) {
    return { kind: 'OUTDOOR_LOCATION', family: 'location' };
  }
  return { kind: 'OUTDOOR_LOCATION', family: 'location' };
}

async function resolveCity(pool, cache, cityKey) {
  if (cache.has(cityKey)) return cache.get(cityKey);
  const index = await loadCityIndex(pool, cache);
  const candidates = CITY_SLUG_ALIASES[cityKey] || [cityKey];

  for (const slug of candidates) {
    const hit =
      index.bySlug.get(String(slug).toLowerCase()) ||
      index.bySlugNorm.get(normalizeCityToken(slug));
    if (hit) {
      cache.set(cityKey, hit);
      return hit;
    }
  }

  const titleCandidates = [
    ...(CITY_TITLE_ALIASES[cityKey] || []),
    ...candidates.filter((c) => /[а-яё]/i.test(c)),
  ];
  for (const title of titleCandidates) {
    const hit =
      index.byTitle.get(String(title).toLowerCase()) ||
      index.byTitleNorm.get(normalizeCityToken(title));
    if (hit) {
      cache.set(cityKey, hit);
      return hit;
    }
  }

  cache.set(cityKey, null);
  return null;
}

async function loadCityIndex(pool, cache) {
  if (cache.has('__city_index__')) return cache.get('__city_index__');
  const result = await pool.query(`select id, slug, title from "City"`);
  const rows = result.rows;
  const bySlug = new Map();
  const bySlugNorm = new Map();
  const byTitle = new Map();
  const byTitleNorm = new Map();
  for (const row of rows) {
    if (row.slug) {
      bySlug.set(String(row.slug).toLowerCase(), row);
      bySlugNorm.set(normalizeCityToken(row.slug), row);
    }
    if (row.title) {
      byTitle.set(String(row.title).toLowerCase(), row);
      byTitleNorm.set(normalizeCityToken(row.title), row);
    }
  }
  const index = { rows, bySlug, bySlugNorm, byTitle, byTitleNorm };
  cache.set('__city_index__', index);
  return index;
}

function normalizeCityToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/й/g, 'и');
}

async function columnExists(pool, table, column) {
  const result = await pool.query(
    `select 1 from information_schema.columns
     where table_schema = 'public' and table_name = $1 and column_name = $2
     limit 1`,
    [table, column],
  );
  return result.rowCount > 0;
}

function parseCitiesFilter(argv) {
  const arg = argv.find((a) => a.startsWith('--cities='));
  if (!arg) return new Set();
  return new Set(
    arg
      .slice('--cities='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function bump(obj, key) {
  obj[key] = (obj[key] || 0) + 1;
}

function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] != null) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
