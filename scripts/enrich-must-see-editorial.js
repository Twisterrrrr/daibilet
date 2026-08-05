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
 *   node scripts/enrich-must-see-editorial.js --apply --file=scripts/data/spb-kgd-venue-coords.json
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const DATA_PATH = (() => {
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  if (fileArg) {
    const rel = fileArg.slice('--file='.length).trim();
    return path.isAbsolute(rel) ? rel : path.join(rootDir, rel);
  }
  return path.join(rootDir, 'scripts/data/must-see-editorial.json');
})();

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
  astrahan: ['astrahan', 'astrakhan', 'астрахань'],
  barnaul: ['barnaul', 'барнаул'],
  belgorod: ['belgorod', 'белгород'],
  'blagoveschensk-amurskaya-oblast': [
    'blagoveschensk-amurskaya-oblast',
    'blagoveshchensk-amurskaya-oblast',
    'благовещенск-амурская-область',
    'благовещенск',
  ],
  bryansk: ['bryansk', 'брянск'],
  ivanovo: ['ivanovo', 'иваново'],
  'yoshkar-ola': ['yoshkar-ola', 'иошкар-ола', 'йошкар-ола'],
  kaluga: ['kaluga', 'калуга'],
  kemerovo: ['kemerovo', 'кемерово'],
  'kirov-kirovskaya-oblast': [
    'kirov-kirovskaya-oblast',
    'kirov',
    'киров-кировская-область',
    'киров',
  ],
  kostroma: ['kostroma', 'кострома'],
  kurgan: ['kurgan', 'курган'],
  kursk: ['kursk', 'курск'],
  lipeck: ['lipeck', 'lipetsk', 'липецк'],
  murmansk: ['murmansk', 'мурманск'],
  saransk: ['saransk', 'саранск'],
  smolensk: ['smolensk', 'смоленск'],
  syktyvkar: ['syktyvkar', 'сыктывкар'],
  tambov: ['tambov', 'тамбов'],
  habarovsk: ['habarovsk', 'khabarovsk', 'хабаровск'],
  cheboksary: ['cheboksary', 'чебоксары'],
  chita: ['chita', 'чита'],
  'yuzhno-sahalinsk': [
    'yuzhno-sahalinsk',
    'yuzhno-sakhalinsk',
    'южно-сахалинск',
  ],
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
  astrahan: ['Астрахань'],
  barnaul: ['Барнаул'],
  belgorod: ['Белгород'],
  'blagoveschensk-amurskaya-oblast': ['Благовещенск (Амурская область)', 'Благовещенск'],
  bryansk: ['Брянск'],
  ivanovo: ['Иваново'],
  'yoshkar-ola': ['Йошкар-Ола'],
  kaluga: ['Калуга'],
  kemerovo: ['Кемерово'],
  'kirov-kirovskaya-oblast': ['Киров'],
  kostroma: ['Кострома'],
  kurgan: ['Курган'],
  kursk: ['Курск'],
  lipeck: ['Липецк'],
  murmansk: ['Мурманск'],
  saransk: ['Саранск'],
  smolensk: ['Смоленск'],
  syktyvkar: ['Сыктывкар'],
  tambov: ['Тамбов'],
  habarovsk: ['Хабаровск'],
  cheboksary: ['Чебоксары'],
  chita: ['Чита'],
  'yuzhno-sahalinsk': ['Южно-Сахалинск'],
};

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const writeCityInfo = process.argv.includes('--write-cityinfo');
const writeCityInfoOnly = process.argv.includes('--write-cityinfo-only');
const citiesFilter = parseCitiesFilter(process.argv);
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function normalizeInput(raw) {
  if (Array.isArray(raw)) return raw;
  if (!Array.isArray(raw?.places)) throw new Error('Editorial JSON must be an array or owner { places } pack');

  const blurbs = loadCityInfoBlurbs();
  return raw.places.map(([ownerId, cityKey, title, address, latitude, longitude]) => {
    const blurb = blurbs.get(normalizePlaceTitle(title)) || '';
    return {
      ownerId,
      cityKey,
      title,
      slug: `${cityKey}-${slugify(title)}`,
      address,
      latitude,
      longitude,
      shortDescription: blurb || title,
      description: blurb || title,
      // The owner rows contain verified logistics data; no fabricated transit copy.
      wayToFind: null,
      metroStation: null,
    };
  });
}

function loadCityInfoBlurbs() {
  const result = new Map();
  const cityInfoPath = path.join(rootDir, 'apps', 'web', 'src', 'lib', 'cityInfo.ts');
  if (!fs.existsSync(cityInfoPath)) return result;
  const source = fs.readFileSync(cityInfoPath, 'utf8');
  const re = /\{\s*name:\s*'((?:\\'|[^'])*)'[^{}]*?desc:\s*'((?:\\'|[^'])*)'/g;
  let match;
  while ((match = re.exec(source))) {
    result.set(normalizePlaceTitle(match[1].replace(/\\'/g, "'")), match[2].replace(/\\'/g, "'"));
  }
  return result;
}

function normalizePlaceTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()[\],.]/g, ' ')
    .replace(/\b(улица|ул|проспект|пр|набережная|наб)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVenueIdentity(value) {
  return normalizePlaceTitle(value)
    .replace(/\b(бар|ресторан|кафе|арт|клуб|спикизи|паб|гастробар|фудмолл)\b/g, ' ')
    .replace(/\bна\s+(невском|рубинштейна|жуковского|большой конюшенной)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAddress(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()[\],.]/g, ' ')
    .replace(/\b(улица|ул|проспект|пр|набережная|наб|дом|д)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanceMeters(left, right) {
  const latA = Number(left?.latitude);
  const lngA = Number(left?.longitude);
  const latB = Number(right?.latitude);
  const lngB = Number(right?.longitude);
  if (![latA, lngA, latB, lngB].every(Number.isFinite)) return null;
  const radians = Math.PI / 180;
  const latDelta = (latB - latA) * radians;
  const lngDelta = (lngB - lngA) * radians;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA * radians) * Math.cos(latB * radians) * Math.sin(lngDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findExistingVenueCandidate(rows, item) {
  const itemIdentity = normalizeVenueIdentity(item.title);
  const itemAddress = normalizeAddress(item.address);
  let best = null;

  for (const row of rows) {
    const rowIdentity = normalizeVenueIdentity(row.title);
    const rowAddress = normalizeAddress(row.address);
    const distance = distanceMeters(row, item);
    const titleMatch =
      itemIdentity.length >= 8 &&
      rowIdentity.length >= 8 &&
      (itemIdentity === rowIdentity || itemIdentity.includes(rowIdentity) || rowIdentity.includes(itemIdentity));
    const addressMatch = itemAddress.length >= 8 && itemAddress === rowAddress;
    // Nearby alone is not enough: island parks vs temples, twin monuments
    // at one campus would otherwise overwrite an unrelated slug.
    const exactSlug = row.slug === item.slug;
    if (!titleMatch && !addressMatch && !exactSlug) continue;
    const nearby = distance != null && distance <= 100;

    const score =
      (titleMatch ? 10_000 : 0) +
      (addressMatch ? 5_000 : 0) +
      (nearby ? Math.max(0, 1_000 - Math.round(distance || 0)) : 0) +
      (exactSlug ? 100 : 0);
    if (!best || score > best.score) best = { row, score };
  }
  return best?.row || null;
}

function slugify(value) {
  const map = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' };
  return String(value || '').toLowerCase().split('').map((char) => map[char] ?? char).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 72);
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Missing data file: ${DATA_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const all = normalizeInput(raw);
  if (!Array.isArray(all) || !all.length) throw new Error('Editorial JSON empty');

  const rows = citiesFilter.size
    ? all.filter((row) => citiesFilter.has(row.cityKey))
    : all;

  if (writeCityInfoOnly) {
    const resolvedRows = rows.map((item) => ({
      item,
      family: inferKindAndFamily(item.title, item).family,
    }));
    console.log(
      JSON.stringify(
        {
          dryRun: false,
          total: rows.length,
          cityInfo: writeOwnerCityInfo(resolvedRows, false),
          note: 'cityInfo-only mode does not access the database',
        },
        null,
        2,
      ),
    );
    return;
  }

  const pool = new Pool({ connectionString, max: 2 });
  const cityCache = new Map();
  const report = { dryRun, total: rows.length, byAction: {}, sample: [], missingCity: [] };
  const resolvedRows = [];

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

      const inferred = inferKindAndFamily(item.title, item);
      const pageStatus = 'PUBLISHED';
      let canonicalPath =
        inferred.family === 'institution' ? `/venues/${item.slug}` : `/locations/${item.slug}`;

      // One physical point has one entity. Exact slug matching alone is not
      // enough: editorial packs often spell a bar or mansion differently from
      // the imported event venue. Match normalized title, verified address or
      // coordinates within 100m before creating anything new.
      const candidates = await pool.query(
        `select id, slug, title, "shortDescription", description, "hookFact", latitude, longitude,
                address, "metroStation", "wayToFind", kind, "pageStatus", "cityId"
         from "Venue"
         where "cityId" = $1`,
        [city.id],
      );
      const existing = findExistingVenueCandidate(candidates.rows, item);
      const action = existing ? 'update' : 'insert';
      // Existing public links remain canonical. The owner row enriches that
      // entity instead of producing a twin under a newly generated slug.
      if (existing && existing.slug !== item.slug) item.slug = existing.slug;
      canonicalPath =
        inferred.family === 'institution' ? `/venues/${item.slug}` : `/locations/${item.slug}`;
      resolvedRows.push({ item, family: inferred.family });

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
    if (writeCityInfo) report.cityInfo = writeOwnerCityInfo(resolvedRows, dryRun);
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify(report, null, 2));
}

function writeOwnerCityInfo(rows, dryRun) {
  const filePath = path.join(rootDir, 'apps', 'web', 'src', 'lib', 'cityInfo.ts');
  if (!fs.existsSync(filePath)) return { changed: false, reason: 'missing' };
  const before = fs.readFileSync(filePath, 'utf8');
  let wired = 0;
  const after = before.replace(/\{[^{}]*name:\s*'((?:\\'|[^'])*)'[^{}]*\}/g, (block, rawName) => {
    if (/\b(?:venueSlug|locationSlug):/.test(block)) return block;
    const target = rows.find(({ item }) => placeNamesMatch(rawName, item.title));
    if (!target) return block;
    const key = target.family === 'institution' ? 'venueSlug' : 'locationSlug';
    wired += 1;
    return block.replace(/\s*\}$/, `, ${key}: '${target.item.slug}' }`);
  });
  if (!dryRun && after !== before) fs.writeFileSync(filePath, after, 'utf8');
  return { changed: after !== before, wired, dryRun };
}

function placeNamesMatch(left, right) {
  const a = normalizePlaceTitle(left)
    .replace(/\bв развод\b|\bулица\b/g, '').replace(/\s+/g, ' ').trim();
  const b = normalizePlaceTitle(right)
    .replace(/\bулица\b/g, '').replace(/\s+/g, ' ').trim();
  return a === b || (Math.min(a.length, b.length) >= 12 && (a.includes(b) || b.includes(a)));
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
  const seoTitle = item.seoTitle || `${item.title} | Дайбилет`;
  const seoH1 = item.seoH1 || item.title;
  const seoDescription = item.seoDescription || item.shortDescription || null;
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
    '"seoH1" = $11',
    '"seoTitle" = $12',
    '"seoDescription" = $13',
    '"canonicalPath" = coalesce(nullif(trim("canonicalPath"), \'\'), $14)',
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
    seoH1,
    seoTitle,
    seoDescription,
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
  if (item.heroImageUrl) {
    params.push(item.heroImageUrl);
    sets.push(`"heroImageUrl" = coalesce(nullif(trim("heroImageUrl"), ''), $${params.length})`);
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
  const seoTitle = item.seoTitle || `${item.title} | Дайбилет`;
  const seoH1 = item.seoH1 || item.title;
  const seoDescription = item.seoDescription || item.shortDescription || null;

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
    '$12',
    '$13',
    '$14',
    '$15',
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
    seoH1,
    seoTitle,
    seoDescription,
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
  if (item.heroImageUrl) {
    cols.push('"heroImageUrl"');
    params.push(item.heroImageUrl);
    vals.push(`$${params.length}`);
  }

  await pool.query(
    `insert into "Venue" (${cols.join(', ')}) values (${vals.join(', ')})`,
    params,
  );
}

function inferKindAndFamily(name, item = null) {
  if (item && item.kind) {
    const family =
      item.familyHint ||
      (['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'VENUE'].includes(
        item.kind,
      )
        ? 'institution'
        : 'location');
    return { kind: item.kind, family };
  }
  const n = String(name || '').toLowerCase();
  if (/кафе|ресторан|бар|трактир|пельмен|пицц|гастро|кофе/.test(n)) {
    return { kind: 'CLUB_BAR_RESTAURANT', family: 'institution' };
  }
  if (/парк|сад\b|эспланад|зарядье|вднх|петергоф|столб|зоопарк|академгородок|хутор|лесопарк/.test(n)) {
    return { kind: 'PARK', family: 'location' };
  }
  if (/памятник|скульптур|бюст|катер/.test(n)) {
    return { kind: 'MONUMENT', family: 'location' };
  }
  if (/театр|оперн|балет|новат/.test(n)) {
    return { kind: 'THEATER', family: 'institution' };
  }
  if (
    /музей|галере|эрмитаж|третьяков|пряник|оружия|ельцин|погребаль|суриков|пароход|комбинат|октава|космическ|арсенал|гцси/.test(
      n,
    )
  ) {
    return { kind: 'MUSEUM_ART_SPACE', family: 'institution' };
  }
  if (
    /набережн|площад|кремл|крепост|собор|храм|церков|монастыр|улиц|мост|лестниц|остров|фонтан|сити|стрелка|ворот|башня|костёл|костел|бункер|часовн|деревн|коса|плотн|городок|кластер|пакгауз|ярмарк|усадьб|палат|вокзал|домик|банк/.test(
      n,
    )
  ) {
    return { kind: 'OUTDOOR_LOCATION', family: 'location' };
  }
  if (item && item.familyHint === 'institution') {
    return { kind: 'VENUE', family: 'institution' };
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
