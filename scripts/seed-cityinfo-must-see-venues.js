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
const { inferMustSeeKindAndFamily } = require('./lib/venue-kind-heuristics');
const { collectHubMustSeeRows, toSeedPlan, HUB_PLACE_SLUG_ALIASES } = require('./lib/hub-must-see-seed');

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
  const hubItems = collectHubPlaceHelperItems();
  const mustSee = [...parseMustSee(source), ...parseHubModuleMustSee(), ...hubItems];
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
    const rawSlug = item.venueSlug || item.locationSlug || null;
    const existingSlug = rawSlug ? HUB_PLACE_SLUG_ALIASES[rawSlug] || rawSlug : null;
    const inferred = item.kind && item.family
      ? { kind: item.kind, family: item.family }
      : inferKindAndFamily(item.name);
    const slug =
      existingSlug ||
      uniqueSlug(slugify(`${item.cityKey}-${item.name}`), slugUsed) ||
      uniqueSlug(slugify(item.name), slugUsed);
    if (slugUsed.has(slug)) continue;
    slugUsed.add(slug);

    const pageStatus = 'PUBLISHED';
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
      address: item.address || null,
      latitude: Number.isFinite(Number(item.latitude)) ? Number(item.latitude) : null,
      longitude: Number.isFinite(Number(item.longitude)) ? Number(item.longitude) : null,
    };

    if (pool && !dryRun) {
      const city = await ensureCity(pool, cityCache, item.cityKey);
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
      const rel = path.relative(rootDir, filePath);
      if (before === after) {
        report[`cityInfo:${rel}`] = 'unchanged';
      } else {
        // CityInfo slug wiring is local source-of-truth; allow write without DB --apply.
        fs.writeFileSync(filePath, after, 'utf8');
        report[`cityInfo:${rel}`] = {
          written: true,
          patchCount: Object.keys(patch).length,
          dryRunDb: dryRun,
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
  const rows = [];
  // Bracket-aware: themeTags: ['…'] used to truncate non-greedy [\s\S]*?
  const markerRe = /mustSee:\s*\[/g;
  let marker;
  while ((marker = markerRe.exec(body))) {
    const arrStart = marker.index + marker[0].length - 1; // '['
    let depth = 0;
    let arrEnd = -1;
    for (let i = arrStart; i < body.length; i++) {
      const ch = body[i];
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          arrEnd = i;
          break;
        }
      }
    }
    if (arrEnd < 0) continue;
    const before = body.slice(Math.max(0, marker.index - 800), marker.index);
    const keyMatch = [...before.matchAll(/(?:'([^']+)'|([a-z0-9-]+))\s*:\s*\{/g)].pop();
    const cityKey = keyMatch ? keyMatch[1] || keyMatch[2] : null;
    if (!cityKey) continue;
    const arrayBody = body.slice(arrStart + 1, arrEnd);
    rows.push(...parseMustSeeArrayBody(arrayBody, cityKey));
    markerRe.lastIndex = arrEnd + 1;
  }
  return rows;
}

/** New hubs keep mustSee in *-hub.ts modules (`mustSee: KAZAN_MUST_SEE`). */
function parseHubModuleMustSee() {
  const hubs = [
    { cityKey: 'kazan', file: 'apps/web/src/lib/kazan-hub.ts', exportName: 'KAZAN_MUST_SEE' },
    { cityKey: 'samara', file: 'apps/web/src/lib/samara-hub.ts', exportName: 'SAMARA_MUST_SEE' },
    {
      cityKey: 'ekaterinburg',
      file: 'apps/web/src/lib/ekaterinburg-hub.ts',
      exportName: 'EKB_MUST_SEE',
    },
    {
      cityKey: 'krasnodar',
      file: 'apps/web/src/lib/krasnodar-hub.ts',
      exportName: 'KRASNODAR_MUST_SEE',
    },
    {
      cityKey: 'krasnoyarsk',
      file: 'apps/web/src/lib/krasnoyarsk-hub.ts',
      exportName: 'KRASNOYARSK_MUST_SEE',
    },
  ];
  const rows = [];
  for (const hub of hubs) {
    const abs = path.join(rootDir, hub.file);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf8');
    const re = new RegExp(
      `export const ${hub.exportName}[^=]*=\\s*\\[`,
      'm',
    );
    const m = re.exec(src);
    if (!m) continue;
    const arrStart = m.index + m[0].length - 1;
    let depth = 0;
    let arrEnd = -1;
    for (let i = arrStart; i < src.length; i++) {
      if (src[i] === '[') depth++;
      else if (src[i] === ']') {
        depth--;
        if (depth === 0) {
          arrEnd = i;
          break;
        }
      }
    }
    if (arrEnd < 0) continue;
    rows.push(...parseMustSeeArrayBody(src.slice(arrStart + 1, arrEnd), hub.cityKey));
  }
  return rows;
}

function parseMustSeeArrayBody(arrayBody, cityKey) {
  const rows = [];
  const itemRe = /\{([^{}]*)\}/g;
  let im;
  while ((im = itemRe.exec(arrayBody))) {
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
  return rows;
}

function inferKindAndFamily(name) {
  return inferMustSeeKindAndFamily(name);
}

async function upsertVenue(pool, venue) {
  const before = await pool.query(`select id, slug from "Venue" where slug = $1 limit 1`, [
    venue.slug,
  ]);
  const id =
    before.rows[0]?.id ||
    `ven_ms_${crypto.createHash('sha1').update(venue.slug).digest('hex').slice(0, 16)}`;
  const seoTitle = `${venue.name} | Дайбилет`;

  // Existing catalog rows: never clobber kind/status/title (owner editorial / supplier).
  // Seed is insert-missing for hub linking; enrich-must-see-editorial handles profile fills.
  if (before.rows[0]) {
    return 'skipped-exists';
  }

  const lat = Number.isFinite(Number(venue.latitude)) ? Number(venue.latitude) : null;
  const lng = Number.isFinite(Number(venue.longitude)) ? Number(venue.longitude) : null;
  const address = String(venue.address || '').trim() || null;

  if (venue.hasHookFact) {
    await pool.query(
      `
        insert into "Venue" (
          id, slug, title, kind, "pageStatus", "cityId",
          "shortDescription", "seoH1", "seoTitle", "seoDescription",
          "canonicalPath", "isIndexable", address, latitude, longitude,
          "createdAt", "updatedAt"
        ) values (
          $1, $2, $3, $4::"VenueKind", $5::"VenuePageStatus", $6,
          $7, $3, $8, $7, $9, $10, $11, $12, $13, now(), now()
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
        address,
        lat,
        lng,
      ],
    );
  } else {
    await pool.query(
      `
        insert into "Venue" (
          id, slug, title, kind, "pageStatus", "cityId",
          "shortDescription", "seoH1", "seoTitle", "seoDescription",
          "canonicalPath", "isIndexable", address, latitude, longitude,
          "createdAt", "updatedAt"
        ) values (
          $1, $2, $3, $4::"VenueKind", $5::"VenuePageStatus", $6,
          $7, $3, $8, $7, $9, $10, $11, $12, $13, now(), now()
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
        address,
        lat,
        lng,
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

async function ensureCity(pool, cache, cityKey) {
  const existing = await resolveCity(pool, cache, cityKey);
  if (existing) return existing;
  const title = (CITY_TITLE_ALIASES[cityKey] || [])[0];
  if (!title) return null;
  const slug = String(cityKey || '').trim();
  if (!slug) return null;
  const inserted = await pool.query(
    `
      insert into "City" (id, slug, title, "isDestination", "canonicalPath")
      values ($1, $2, $3, true, $4)
      on conflict (slug) do update set title = excluded.title
      returning id, slug, title
    `,
    [`city_${slug}`.slice(0, 64), slug, title, `/cities/${slug}`],
  );
  const row = inserted.rows[0] || null;
  cache.delete('__city_index__');
  cache.set(cityKey, row);
  return row;
}

function collectHubPlaceHelperItems() {
  const seen = new Set();
  const items = [];
  for (const row of collectHubMustSeeRows((file, enc) => fs.readFileSync(file, enc), rootDir)) {
    const plan = toSeedPlan(row);
    if (plan.skipReason || !plan.slug) continue;
    if (seen.has(plan.slug)) continue;
    seen.add(plan.slug);
    items.push({
      cityKey: plan.cityKey,
      name: plan.name,
      desc: plan.desc,
      venueSlug: plan.slugField === 'venueSlug' ? plan.slug : null,
      locationSlug: plan.slugField === 'locationSlug' ? plan.slug : null,
      latitude: plan.latitude,
      longitude: plan.longitude,
      address: plan.address,
      kind: plan.kind,
      family: plan.family,
    });
  }
  return items;
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
    .map((ch) => (Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch))
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
