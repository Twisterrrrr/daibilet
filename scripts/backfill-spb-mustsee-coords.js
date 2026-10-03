#!/usr/bin/env node
/**
 * Backfill lat/lng for SPB Venue rows missing coords.
 * Sources: owner pack spb-kgd-venue-coords.json + curated EXTRA_BY_SLUG.
 *
 *   node scripts/backfill-spb-mustsee-coords.js --dry-run
 *   node scripts/backfill-spb-mustsee-coords.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadEnv(rootDir);

const dryRun = !process.argv.includes('--apply');
const pack = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'scripts/data/spb-kgd-venue-coords.json'), 'utf8'),
);

/** Well-known SPB must-see not in owner pack (parks/temples/streets/gastro hubs). */
const EXTRA_BY_SLUG = {
  'saint-petersburg-letniy-sad': [59.9448, 30.3356, 'наб. Кутузова / р. Фонтанка'],
  'saint-petersburg-mihaylovskiy-sad': [59.9399, 30.3328, 'ул. Садовая, у Михайловского дворца'],
  'saint-petersburg-tavricheskiy-sad': [59.9445, 30.3725, 'ул. Потапова / ул. Кирочная'],
  'saint-petersburg-tspkio-im-kirova-elagin-ostrov': [59.9795, 30.2705, 'Елагин остров'],
  'saint-petersburg-primorskiy-park-pobedy-krestovskiy-ostrov': [59.972, 30.25, 'Крестовский остров'],
  'saint-petersburg-marsovo-pole': [59.9435, 30.3315, 'Марсово поле'],
  'saint-petersburg-yusupovskiy-sad': [59.9255, 30.3085, 'Садовая ул., 50'],
  'saint-petersburg-botanicheskiy-sad-petra-velikogo': [59.9705, 30.3225, 'ул. Профессора Попова, 2'],
  'saint-petersburg-kamennyy-ostrov': [59.98, 30.3, 'Каменный остров'],
  'saint-petersburg-aleksandrovskiy-park': [59.9545, 30.3175, 'Александровский парк'],
  'saint-petersburg-smolnyy-sobor': [59.9487, 30.3953, 'пл. Растрелли, 1'],
  'saint-petersburg-aleksandro-nevskaya-lavra': [59.9215, 30.3885, 'наб. реки Монастырки, 1'],
  'saint-petersburg-nikolo-bogoyavlenskiy-morskoy-sobor': [59.9225, 30.3005, 'Никольская пл., 1/3'],
  'saint-petersburg-vladimirskiy-sobor': [59.9285, 30.3485, 'Владимирский пр., 20'],
  'saint-petersburg-chesmenskaya-tserkov': [59.8575, 30.3315, 'ул. Ленсовета, 12'],
  'saint-petersburg-buddiyskiy-datsan-gunzechoyney': [59.9895, 30.2765, 'Приморский пр., 91'],
  'saint-petersburg-annenkirhe-tserkov-svyatoy-anny': [59.9375, 30.34, 'Кирочная ул., 8'],
  'saint-petersburg-kolonnada-isaakiya': [59.9342, 30.3061, 'Исаакиевская пл.'],
  'saint-petersburg-primorskiy-prospekt-park-300-letiya': [59.9845, 30.1985, 'Приморский пр. / парк 300-летия'],
  'saint-petersburg-bolshaya-morskaya': [59.9345, 30.3125, 'Большая Морская ул.'],
  'saint-petersburg-kolomna': [59.9215, 30.2885, 'район Коломна'],
  'saint-petersburg-gostinyy-dvor-passazh': [59.9338, 30.331, 'Невский пр., 35'],
  'saint-petersburg-kamennoostrovskiy-prospekt': [59.965, 30.312, 'Каменноостровский пр.'],
  'saint-petersburg-peshehodnaya-malaya-konyushennaya': [59.937, 30.3255, 'Малая Конюшенная ул.'],
  'saint-petersburg-grand-maket-rossiya': [59.8885, 30.3305, 'ул. Цветочная, 16'],
  'saint-petersburg-petrovskaya-akvatoriya': [59.9355, 30.3055, 'Малая Морская ул., 4/1'],
  'saint-petersburg-muzey-zheleznyh-dorog-rossii': [59.9065, 30.3185, 'Библиотечный пер., 4к2'],
  'saint-petersburg-okeanarium': [59.8675, 30.3215, 'ул. Марата, 86'],
  'saint-petersburg-leningradskiy-zoopark': [59.9535, 30.3075, 'Александровский парк, 1'],
  'saint-petersburg-divo-ostrov': [59.9725, 30.2455, 'Крестовский остров'],
  'saint-petersburg-muzey-sovetskih-igrovyh-avtomatov': [59.9595, 30.3155, 'Конюшенная пл., 2В'],
  'saint-petersburg-tsirk-chinizelli': [59.9265, 30.3365, 'наб. реки Фонтанки, 3'],
  'saint-petersburg-muzey-magii': [59.9325, 30.3485, 'ул. Рубинштейна / центр'],
  'saint-petersburg-vitebskiy-vokzal': [59.9195, 30.3295, 'Загородный пр., 52'],
  'saint-petersburg-chizhik-pyzhik': [59.9415, 30.3285, 'наб. реки Фонтанки у 1-го Инженерного моста'],
  'saint-petersburg-pushkinskaya-10': [59.9285, 30.3565, 'ул. Пушкинская, 10'],
  'saint-petersburg-yusupovskiy-dvorets': [59.9295, 30.2985, 'наб. реки Мойки, 94'],
  'saint-petersburg-russkiy-muzey': [59.9385, 30.3325, 'Инженерная ул., 4'],
  'saint-petersburg-kunstkamera': [59.9415, 30.3045, 'Университетская наб., 3'],
  'saint-petersburg-otkrytye-dvory-kolodtsy-ekskursii-po-dvoram': [59.934, 30.32, 'центр Петербурга'],
  'saint-petersburg-trete-mesto': [59.9345, 30.335, 'Невский пр.'],
  'saint-petersburg-smolenskoe-lyuteranskoe-kladbische': [59.95, 30.265, 'наб. Смоленки'],
  'saint-petersburg-vasileostrovskiy-rynok': [59.9425, 30.2785, 'Большой пр. В.О.'],
  'saint-petersburg-moskovskiy-rynok': [59.8895, 30.3195, 'Московский пр., 4'],
  'saint-petersburg-fudmoll-vokzal-1853': [59.9195, 30.3295, 'Витебский вокзал'],
  'saint-petersburg-sever-metropol': [59.9355, 30.3255, 'Невский пр.'],
  'planetarii-1': [59.9575, 30.3345, 'Александровский парк, 4'],
};

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const byTitle = new Map();
for (const row of pack.places || []) {
  const [, cityKey, title, address, latitude, longitude] = row;
  if (cityKey !== 'saint-petersburg') continue;
  byTitle.set(norm(title), { title, address, latitude, longitude });
}

async function main() {
  const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
  const { Pool } = requireFromDb('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 2,
  });

  const city = await pool.query(
    `select id from "City" where slug in ('saint-petersburg','sankt-peterburg','санкт-петербург') or lower(title)='санкт-петербург' limit 1`,
  );
  if (!city.rows[0]) throw new Error('SPB city not found');
  const cityId = city.rows[0].id;

  const venues = await pool.query(
    `select id, slug, title, address, latitude, longitude
     from "Venue"
     where "cityId" = $1
       and "pageStatus" = 'PUBLISHED'
       and (latitude is null or longitude is null or (latitude = 0 and longitude = 0))`,
    [cityId],
  );

  let matched = 0;
  let updated = 0;
  const unmatched = [];

  for (const v of venues.rows) {
    let hit = null;
    const extra = EXTRA_BY_SLUG[v.slug];
    if (extra) {
      hit = { latitude: extra[0], longitude: extra[1], address: extra[2] };
    } else {
      hit = byTitle.get(norm(v.title));
      if (!hit) {
        for (const [k, val] of byTitle) {
          if (norm(v.title).includes(k) || k.includes(norm(v.title))) {
            hit = val;
            break;
          }
        }
      }
    }
    if (!hit || !Number.isFinite(Number(hit.latitude)) || !Number.isFinite(Number(hit.longitude))) {
      unmatched.push(v.slug);
      continue;
    }
    matched += 1;
    if (dryRun) continue;
    await pool.query(
      `update "Venue"
       set latitude = $2,
           longitude = $3,
           address = coalesce(nullif(trim(address), ''), $4),
           "updatedAt" = now()
       where id = $1`,
      [v.id, hit.latitude, hit.longitude, hit.address || null],
    );
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        cityId,
        missingCoords: venues.rows.length,
        matched,
        updated,
        unmatchedCount: unmatched.length,
        unmatchedSample: unmatched.slice(0, 30),
      },
      null,
      2,
    ),
  );
  await pool.end();
}

function loadEnv(dir) {
  for (const name of ['.env', '.env.local', 'apps/backend/.env']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
