#!/usr/bin/env node
/**
 * Patch shortDescription for location-family blurbs (owner 2026-08-08).
 * Usage on MSK:
 *   node scripts/patch-location-blurbs-2026-08-08.js --dry-run
 *   node scripts/patch-location-blurbs-2026-08-08.js --apply
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

const PATCHES = [
  {
    slug: 'saint-petersburg-bankovskiy-most',
    shortDescription:
      'Пешеходный мост с золотыми грифонами на канале Грибоедова - один из самых узнаваемых видов города.',
  },
  {
    slug: 'saint-petersburg-angliyskaya-naberezhnaya',
    shortDescription: 'Парадные особняки по соседству с Сенатской площадью.',
  },
  {
    slug: 'saint-petersburg-dvortsovaya-naberezhnaya',
    shortDescription: 'Фасад Зимнего дворца и истинное зеркало Невы.',
  },
  {
    slug: 'saint-petersburg-dvortsovyy-most',
    shortDescription: 'Ночной ритуал навигации на Неве.',
  },
  {
    slug: 'saint-petersburg-malaya-sadovaya-ulitsa',
    shortDescription: 'Короткий пешеходный карман у Невского.',
  },
  {
    slug: 'saint-petersburg-naberezhnaya-kanala-griboedova',
    shortDescription: 'Изгибы к Спасу и Казанскому.',
  },
  {
    slug: 'saint-petersburg-naberezhnaya-reki-moyki',
    shortDescription: 'Камерный маршрут дворцов и мостов.',
  },
  {
    slug: 'saint-petersburg-naberezhnaya-fontanki',
    shortDescription: 'Длинный городской променад вдоль реки.',
  },
  {
    slug: 'saint-petersburg-loft-proekt-etazhi',
    shortDescription: 'Дворик, крыша и независимая культура.',
  },
  {
    slug: 'saint-petersburg-mramornyy-dvorets',
    shortDescription: 'Филиал Русского музея, редкий облицованный фасад.',
  },
  {
    slug: 'saint-petersburg-mednyy-vsadnik',
    shortDescription:
      'Памятник Петру I на Гром-камне на Сенатской площади - один из символов города.',
  },
  {
    slug: 'saint-petersburg-kolomna',
    shortDescription: 'Тихие каналы и литературный маршрут «Пиковой дамы».',
  },
  {
    slug: 'saint-petersburg-linii-vasilevskogo-ostrova',
    shortDescription: 'Сетка дворов и повседневная жизнь острова.',
  },
  {
    slug: 'saint-petersburg-marsovo-pole',
    shortDescription:
      'Бывший военный плац, превращенный в сквер с сиренью и одним из первых мемориалов с Вечным огнем.',
  },
  {
    slug: 'saint-petersburg-osobnyak-brusnitsynyh',
    shortDescription:
      'Особняк на Кожевенной линии: за сдержанным фасадом - парадные залы в духе ренессанса и богатая история дома.',
  },
  {
    slug: 'saint-petersburg-obschestvennoe-prostranstvo-dvor-gostinki',
    shortDescription:
      'Внутренний двор Большого Гостиного двора - летнее открытое пространство с кафе и зонами отдыха.',
  },
  {
    slug: 'saint-petersburg-paradnaya-romashka-dom-eliseeva',
    shortDescription:
      'Круглый вестибюль на улице Ломоносова: центральный пилон и радиальные рамы окон складываются в образ раскрытого цветка.',
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = !apply;
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }
  const req = createRequire(path.join(rootDir, 'packages/db/package.json'));
  const { Pool } = req('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  let updated = 0;
  let missing = 0;
  for (const item of PATCHES) {
    const cur = await pool.query(
      `select slug, "shortDescription" from "Venue" where slug = $1`,
      [item.slug],
    );
    if (!cur.rows.length) {
      missing += 1;
      console.log('MISSING', item.slug);
      continue;
    }
    const before = cur.rows[0].shortDescription;
    console.log(JSON.stringify({ slug: item.slug, before, after: item.shortDescription }, null, 0));
    if (apply) {
      await pool.query(
        `update "Venue" set "shortDescription" = $2, "updatedAt" = now() where slug = $1`,
        [item.slug, item.shortDescription],
      );
      updated += 1;
    }
  }
  console.log(JSON.stringify({ dryRun, apply, updated, missing, total: PATCHES.length }));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
