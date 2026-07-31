#!/usr/bin/env node
/**
 * Bulk seed «Главные места» (mustSee) from cityInfo → Venue entities.
 *
 * For each mustSee: upsert Venue (infer kind), optionally patch cityInfo
 * with venueSlug (institution) or locationSlug (park/monument/outdoor).
 *
 * Usage:
 *   node scripts/seed-cityinfo-must-see-venues.js --dry-run
 *   node scripts/seed-cityinfo-must-see-venues.js --dry-run --cities=moscow,saint-petersburg
 *   node scripts/seed-cityinfo-must-see-venues.js --write-cityinfo
 *   node scripts/seed-cityinfo-must-see-venues.js --apply --write-cityinfo
 *
 * Requires PARK/MONUMENT enum + optional hookFact (migrations 20260731*).
 * Listing visibility needs backend hub-gate (isContentPlaceHubEligible) deployed.
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const CITY_INFO_PATHS = [
  path.join(rootDir, 'apps/web/src/lib/cityInfo.ts'),
  path.join(rootDir, 'apps/public/src/lib/cityInfo.ts'),
];

const CITY_SLUG_ALIASES = {
  // MSK/prod City.slug is mostly Cyrillic; cityInfo keys are Latin hub ids.
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
  orel: ['orel', 'орел', 'орёл'],
  orenburg: ['orenburg', 'оренбург'],
  abakan: ['abakan', 'абакан'],
  pskov: ['pskov', 'псков'],
  sevastopol: ['sevastopol', 'севастополь'],
  simferopol: ['simferopol', 'симферополь'],
  penza: ['penza', 'пенза'],
  volgograd: ['volgograd', 'волгоград'],
  smolensk: ['smolensk', 'смоленск'],
  syktyvkar: ['syktyvkar', 'сыктывкар'],
  'yuzhno-sahalinsk': ['yuzhno-sahalinsk', 'yuzhno-sakhalinsk', 'южно-сахалинск'],
  kaluga: ['kaluga', 'калуга'],
  kostroma: ['kostroma', 'кострома'],
  murmansk: ['murmansk', 'мурманск'],
  kursk: ['kursk', 'курск'],
  'yoshkar-ola': ['yoshkar-ola', 'иошкар-ола', 'йошкар-ола'],
  bryansk: ['bryansk', 'брянск'],
  'blagoveschensk-amurskaya-oblast': [
    'blagoveschensk-amurskaya-oblast',
    'blagoveshchensk-amurskaya-oblast',
    'благовещенск-амурская-область',
    'благовещенск',
  ],
  belgorod: ['belgorod', 'белгород'],
  astrahan: ['astrahan', 'astrakhan', 'астрахань'],
  arhangelsk: ['arhangelsk', 'arkhangelsk', 'архангельск'],
  tambov: ['tambov', 'тамбов'],
  chita: ['chita', 'чита'],
  'kirov-kirovskaya-oblast': [
    'kirov-kirovskaya-oblast',
    'kirov',
    'киров-кировская-область',
    'киров',
  ],
  kurgan: ['kurgan', 'курган'],
  lipeck: ['lipeck', 'lipetsk', 'липецк'],
  ivanovo: ['ivanovo', 'иваново'],
  kemerovo: ['kemerovo', 'кемерово'],
  cheboksary: ['cheboksary', 'чебоксары'],
  barnaul: ['barnaul', 'барнаул'],
  saransk: ['saransk', 'саранск'],
  habarovsk: ['habarovsk', 'khabarovsk', 'хабаровск'],
};

/** Russian City.title candidates for hubs (MSK title match fallback). */
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
  smolensk: ['Смоленск'],
  syktyvkar: ['Сыктывкар'],
  'yuzhno-sahalinsk': ['Южно-Сахалинск'],
  kaluga: ['Калуга'],
  kostroma: ['Кострома'],
  murmansk: ['Мурманск'],
  kursk: ['Курск'],
  'yoshkar-ola': ['Йошкар-Ола'],
  bryansk: ['Брянск'],
  'blagoveschensk-amurskaya-oblast': ['Благовещенск (Амурская область)', 'Благовещенск'],
  belgorod: ['Белгород'],
  astrahan: ['Астрахань'],
  arhangelsk: ['Архангельск'],
  tambov: ['Тамбов'],
  chita: ['Чита'],
  'kirov-kirovskaya-oblast': ['Киров (Кировская область)', 'Киров'],
  kurgan: ['Курган'],
  lipeck: ['Липецк'],
  ivanovo: ['Иваново'],
  kemerovo: ['Кемерово'],
  cheboksary: ['Чебоксары'],
  barnaul: ['Барнаул'],
  saransk: ['Саранск'],
  habarovsk: ['Хабаровск'],
};

function normalizeCityToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/й/g, 'и');
}

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const writeCityInfo = process.argv.includes('--write-cityinfo');
const citiesFilter = parseCitiesFilter(process.argv);

const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const cityInfoPath = CITY_INFO_PATHS.find((p) => fs.existsSync(p));
  if (!cityInfoPath) throw new Error('cityInfo.ts not found');

  const source = fs.readFileSync(cityInfoPath, 'utf8');
  const mustSee = parseMustSee(source);
  const filtered = citiesFilter.size
    ? mustSee.filter((row) => citiesFilter.has(row.cityKey))
    : mustSee;

  let pool = null;
  let hasHookFact = false;
  const cityCache = new Map();

  if (!dryRun || process.argv.includes('--check-db')) {
    const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
    const { Pool } = requireFromDbPackage('pg');
    pool = new Pool({ connectionString, max: 2 });
    hasHookFact = await columnExists(pool, 'Venue', 'hookFact');
  }

  const planned = [];
  const slugUsed = new Set();

  for (const item of filtered) {
    const existingSlug = item.venueSlug || item.locationSlug || null;
    const inferred = inferKindAndFamily(item.name);
    const slug =
      existingSlug ||
      uniqueSlug(slugify(`${item.cityKey}-${item.name}`), slugUsed) ||
      uniqueSlug(slugify(item.name), slugUsed);
    slugUsed.add(slug);

    const pageStatus = inferred.confident ? 'PUBLISHED' : 'CANDIDATE';
    const canonicalPath =
      inferred.family === 'institution' ? `/venues/${slug}` : `/locations/${slug}`;

    const entry = {
      cityKey: item.cityKey,
      name: item.name,
      desc: item.desc,
      slug,
      kind: inferred.kind,
      family: inferred.family,
      pageStatus,
      canonicalPath,
      hadSlug: Boolean(existingSlug),
      slugField: inferred.family === 'institution' ? 'venueSlug' : 'locationSlug',
    };

    if (pool && !dryRun) {
      const city = await resolveCity(pool, cityCache, item.cityKey);
      if (!city) {
        entry.action = 'skip-no-city';
      } else {
        entry.cityId = city.id;
        entry.action = await upsertVenue(pool, {
          ...entry,
          cityId: city.id,
          shortDescription: item.desc,
          hasHookFact,
        });
      }
    } else {
      entry.action = dryRun ? (existingSlug ? 'would-upsert-existing-slug' : 'would-insert') : 'planned';
    }

    planned.push(entry);
  }

  const byAction = countBy(planned.map((p) => p.action));
  const skipNoCity = planned.filter((p) => p.action === 'skip-no-city');
  const skipNoCityByCity = countBy(skipNoCity.map((p) => p.cityKey));
  const report = {
    dryRun,
    writeCityInfo,
    citiesFilter: [...citiesFilter],
    source: path.relative(rootDir, cityInfoPath),
    totals: {
      mustSee: filtered.length,
      withSlugAlready: filtered.filter((i) => i.venueSlug || i.locationSlug).length,
      withoutSlug: filtered.filter((i) => !i.venueSlug && !i.locationSlug).length,
      byKind: countBy(planned.map((p) => p.kind)),
      byFamily: countBy(planned.map((p) => p.family)),
      byAction,
      skipNoCityByCity,
    },
    skipNoCitySample: skipNoCity.slice(0, 30).map((p) => ({ cityKey: p.cityKey, name: p.name })),
    sample: planned.slice(0, 25),
    note:
      'Catalog listing needs deployed hub-gate (content-place without events). Seed alone is not enough on live MSK until dto.js is restarted with isContentPlaceHubEligible.',
  };

  if (writeCityInfo) {
    const patch = buildCityInfoPatch(planned);
    for (const filePath of CITY_INFO_PATHS.filter((p) => fs.existsSync(p))) {
      const before = fs.readFileSync(filePath, 'utf8');
      const after = applyCityInfoSlugs(before, patch);
      if (before === after) {
        report[`cityInfo:${path.basename(path.dirname(path.dirname(filePath)))}`] = 'unchanged';
      } else if (dryRun) {
        report[`cityInfo:${path.relative(rootDir, filePath)}`] = {
          wouldChange: true,
          patchCount: Object.keys(patch).length,
        };
      } else {
        fs.writeFileSync(filePath, after, 'utf8');
        report[`cityInfo:${path.relative(rootDir, filePath)}`] = {
          written: true,
          patchCount: Object.keys(patch).length,
        };
      }
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (pool) await pool.end();
}

function parseMustSee(source) {
  const start = source.indexOf('export const CITY_INFO');
  const body = source.slice(start);
  const mustSeeRe = /mustSee:\s*\[([\s\S]*?)\]\s*,/g;
  const rows = [];
  let m;
  while ((m = mustSeeRe.exec(body))) {
    const before = body.slice(Math.max(0, m.index - 800), m.index);
    const keyMatch = [...before.matchAll(/(?:'([^']+)'|([a-z0-9-]+))\s*:\s*\{/g)].pop();
    const cityKey = keyMatch ? keyMatch[1] || keyMatch[2] : null;
    if (!cityKey) continue;
    const itemRe = /\{([^{}]*)\}/g;
    let im;
    while ((im = itemRe.exec(m[1]))) {
      const block = im[1];
      const nameMatch = block.match(/name:\s*'((?:\\'|[^'])*)'/);
      if (!nameMatch) continue;
      const descMatch = block.match(/desc:\s*'((?:\\'|[^'])*)'/);
      rows.push({
        cityKey,
        name: unescapeTs(nameMatch[1]),
        desc: descMatch ? unescapeTs(descMatch[1]) : '',
        venueSlug: (block.match(/venueSlug:\s*'([^']+)'/) || [])[1] || null,
        locationSlug: (block.match(/locationSlug:\s*'([^']+)'/) || [])[1] || null,
        href: (block.match(/href:\s*'([^']+)'/) || [])[1] || null,
      });
    }
  }
  return rows;
}

function inferKindAndFamily(name) {
  const n = String(name || '').toLowerCase();
  if (/парк|сад\b|эспланад|зарядье|вднх|петергоф|монрепо|витославлиц/.test(n)) {
    return { kind: 'PARK', family: 'location', confident: true };
  }
  if (/памятник|скульптур|бюст|голова ленина|тысячелетие россии/.test(n)) {
    return { kind: 'MONUMENT', family: 'location', confident: true };
  }
  if (/театр|оперн|балет|маска/.test(n)) {
    return { kind: 'THEATER', family: 'institution', confident: true };
  }
  if (/музей|галере|эрмитаж|третьяков|дацан|хохловк|арт[-\s]?пространств/.test(n)) {
    return { kind: 'MUSEUM_ART_SPACE', family: 'institution', confident: true };
  }
  if (
    /набережн|площад|кремл|крепост|собор|храм|улиц|рынок|склад|мост|лестниц|остров|фонтан|ситі|сити|стрелка|дворищ|городищ|канал|дворц/.test(
      n,
    )
  ) {
    return { kind: 'OUTDOOR_LOCATION', family: 'location', confident: true };
  }
  return { kind: 'OUTDOOR_LOCATION', family: 'location', confident: false };
}

async function upsertVenue(pool, venue) {
  const before = await pool.query(`select id, slug from "Venue" where slug = $1 limit 1`, [
    venue.slug,
  ]);
  const id =
    before.rows[0]?.id ||
    `ven_ms_${crypto.createHash('sha1').update(venue.slug).digest('hex').slice(0, 16)}`;
  const seoTitle = `${venue.name} | Дайбилет`;

  if (before.rows[0]) {
    if (venue.hasHookFact) {
      await pool.query(
        `
          update "Venue"
          set
            title = $2,
            kind = $3::"VenueKind",
            "pageStatus" = $4::"VenuePageStatus",
            "cityId" = $5,
            "shortDescription" = coalesce(nullif(trim("shortDescription"), ''), $6),
            "seoH1" = coalesce(nullif(trim("seoH1"), ''), $2),
            "seoTitle" = coalesce(nullif(trim("seoTitle"), ''), $7),
            "seoDescription" = coalesce(nullif(trim("seoDescription"), ''), $6),
            "canonicalPath" = coalesce(nullif(trim("canonicalPath"), ''), $8),
            "isIndexable" = case when $4::text = 'PUBLISHED' then true else "isIndexable" end,
            "updatedAt" = now()
          where slug = $1
        `,
        [
          venue.slug,
          venue.name,
          venue.kind,
          venue.pageStatus,
          venue.cityId,
          venue.shortDescription,
          seoTitle,
          venue.canonicalPath,
        ],
      );
    } else {
      await pool.query(
        `
          update "Venue"
          set
            title = $2,
            kind = $3::"VenueKind",
            "pageStatus" = $4::"VenuePageStatus",
            "cityId" = $5,
            "shortDescription" = coalesce(nullif(trim("shortDescription"), ''), $6),
            "seoH1" = coalesce(nullif(trim("seoH1"), ''), $2),
            "seoTitle" = coalesce(nullif(trim("seoTitle"), ''), $7),
            "seoDescription" = coalesce(nullif(trim("seoDescription"), ''), $6),
            "canonicalPath" = coalesce(nullif(trim("canonicalPath"), ''), $8),
            "isIndexable" = case when $4::text = 'PUBLISHED' then true else "isIndexable" end,
            "updatedAt" = now()
          where slug = $1
        `,
        [
          venue.slug,
          venue.name,
          venue.kind,
          venue.pageStatus,
          venue.cityId,
          venue.shortDescription,
          seoTitle,
          venue.canonicalPath,
        ],
      );
    }
    return 'updated';
  }

  if (venue.hasHookFact) {
    await pool.query(
      `
        insert into "Venue" (
          id, slug, title, kind, "pageStatus", "cityId",
          "shortDescription", "seoH1", "seoTitle", "seoDescription",
          "canonicalPath", "isIndexable", "createdAt", "updatedAt"
        ) values (
          $1, $2, $3, $4::"VenueKind", $5::"VenuePageStatus", $6,
          $7, $3, $8, $7, $9, $10, now(), now()
        )
      `,
      [
        id,
        venue.slug,
        venue.name,
        venue.kind,
        venue.pageStatus,
        venue.cityId,
        venue.shortDescription,
        seoTitle,
        venue.canonicalPath,
        venue.pageStatus === 'PUBLISHED',
      ],
    );
  } else {
    await pool.query(
      `
        insert into "Venue" (
          id, slug, title, kind, "pageStatus", "cityId",
          "shortDescription", "seoH1", "seoTitle", "seoDescription",
          "canonicalPath", "isIndexable", "createdAt", "updatedAt"
        ) values (
          $1, $2, $3, $4::"VenueKind", $5::"VenuePageStatus", $6,
          $7, $3, $8, $7, $9, $10, now(), now()
        )
      `,
      [
        id,
        venue.slug,
        venue.name,
        venue.kind,
        venue.pageStatus,
        venue.cityId,
        venue.shortDescription,
        seoTitle,
        venue.canonicalPath,
        venue.pageStatus === 'PUBLISHED',
      ],
    );
  }
  return 'inserted';
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

  const fuzzyNeedle = normalizeCityToken(String(cityKey).replace(/-/g, ' '));
  const fuzzy = index.rows.find((row) => {
    const slugN = normalizeCityToken(row.slug).replace(/-/g, ' ');
    const titleN = normalizeCityToken(row.title);
    return slugN.includes(fuzzyNeedle) || titleN.includes(fuzzyNeedle);
  });
  cache.set(cityKey, fuzzy || null);
  return fuzzy || null;
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

function buildCityInfoPatch(planned) {
  const patch = {};
  for (const row of planned) {
    if (!row.slug || row.action === 'skip-no-city') continue;
    const key = `${row.cityKey}::${row.name}`;
    patch[key] = { slugField: row.slugField, slug: row.slug };
  }
  return patch;
}

/**
 * Insert venueSlug/locationSlug into mustSee object literals that lack them.
 * Conservative: only touches blocks that already have name: '…' matching patch.
 */
function applyCityInfoSlugs(source, patch) {
  let out = source;
  for (const [key, value] of Object.entries(patch)) {
    const [, name] = key.split('::');
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(\\{[^{}]*name:\\s*'${escaped}'[^{}]*?)(\\})`,
      'g',
    );
    out = out.replace(re, (full, body, close) => {
      if (/venueSlug:|locationSlug:|href:/.test(body)) return full;
      const indent = '        ';
      return `${body.replace(/\s*$/, '')},\n${indent}${value.slugField}: '${value.slug}',\n      ${close}`;
    });
  }
  return out;
}

function slugify(input) {
  const map = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return String(input || '')
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] || ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 72);
}

function uniqueSlug(base, used) {
  let slug = base || 'place';
  if (!used.has(slug)) return slug;
  for (let i = 2; i < 50; i += 1) {
    const next = `${base}-${i}`;
    if (!used.has(next)) return next;
  }
  return `${base}-${crypto.randomBytes(2).toString('hex')}`;
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

function countBy(values) {
  const out = {};
  for (const value of values) {
    const key = String(value || 'null');
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function unescapeTs(value) {
  return String(value || '').replace(/\\'/g, "'").replace(/\\n/g, '\n');
}

async function columnExists(pool, table, column) {
  const result = await pool.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [table, column],
  );
  return Boolean(result.rows[0]);
}

function loadRootEnv(dir) {
  for (const name of ['.env', '.env.local', '.env.production']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
