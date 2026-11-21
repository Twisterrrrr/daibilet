/**
 * Repair KGD seed damage from proximity dedupe:
 * - cathedral slug overwritten with "Остров Канта"
 * - two BFU monuments collapsed into one row
 *
 * Usage on MSK:
 *   node scripts/repair-kgd-mustsee-dedupe.js --dry-run
 *   node scripts/repair-kgd-mustsee-dedupe.js --apply
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const dryRun = !process.argv.includes('--apply');
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

const FIXES = [
  {
    slug: 'kaliningrad-kafedral-nyy-sobor',
    title: 'Кафедральный собор',
    kind: 'OUTDOOR_LOCATION',
    family: 'location',
    shortDescription: 'Готический собор XIV века с могилой Иммануила Канта',
    description:
      'Главный символ старого Кёнигсберга на острове Канта (бывший Кнайпхоф). Монументальное здание в стиле кирпичной готики сегодня не работает как храм, а является культурным центром.',
    hookFact:
      'Могила великого философа Иммануила Канта у стен собора - главная причина, почему советские власти не взорвали полуразрушенное готическое здание в послевоенные годы, посчитав мыслителя «одним из предтеч марксизма».',
    wayToFind:
      'От площади Победы или Южного вокзала на любом транспорте до Ленинского проспекта. Спуститесь с эстакадного моста по каменной лестнице прямо на остров.',
    latitude: 54.706487,
    longitude: 20.512025,
    address: 'г. Калининград, ул. Иммануила Канта, 1',
  },
  {
    slug: 'kaliningrad-ostrov-kanta',
    title: 'Остров Канта (Кнайпхоф)',
    kind: 'PARK',
    family: 'location',
    shortDescription:
      'Зеленый остров-парк посреди реки Преголи, где похоронен великий философ Иммануил Кант',
    description:
      'Парковый остров в центре города с собором, скульптурами и набережными Преголи. Естественный хаб маршрута «Рыбная деревня - собор - музеи» и лучшее место для короткой пешей паузы.',
    hookFact:
      'Остров Кнайпхоф когда-то был плотной средневековой застройкой, а после войны стал парком вокруг Кафедрального собора - с могилой Канта у стен храма.',
    wayToFind:
      'Спуститесь с эстакадного моста по лестнице на остров или перейдите Медовый мост от Рыбной деревни.',
    latitude: 54.7068,
    longitude: 20.5105,
    address: 'г. Калининград, остров Канта (Кнайпхоф)',
  },
  {
    slug: 'kaliningrad-pamyatnik-boruschiesya-zubry',
    title: 'Памятник «Борющиеся зубры»',
    kind: 'MONUMENT',
    family: 'location',
    shortDescription:
      'Знаменитая скульптурная композиция работы Августа Гауля, ставшая любимым местом встреч студентов',
    description:
      'Бронзовая композиция у БФУ и исторической застройки. Короткая, но характерная остановка на маршруте по центру и университетскому кварталу.',
    hookFact:
      'Скульптуру Августа Гауля калининградские студенты давно сделали народной точкой сбора: «у зубров» - адрес, который понимают без уточнений.',
    wayToFind:
      'У главного корпуса БФУ им. Канта на ул. Чернышевского / Университетской - памятник стоит на виду у учебного городка.',
    latitude: 54.7247,
    longitude: 20.4981,
    address: 'г. Калининград, ул. Чернышевского / у БФУ («Борющиеся зубры»)',
  },
  {
    slug: 'kaliningrad-pamyatnik-immanuilu-kantu',
    title: 'Памятник Иммануилу Канту',
    kind: 'MONUMENT',
    family: 'location',
    shortDescription:
      'Отреставрированный бронзовый монумент мыслителю, расположенный возле здания Балтийского федерального университета',
    description:
      'Бронзовый монумент Канту у БФУ. Хорошая связка с островом Канта и Кафедральным собором для тех, кто собирает «кантовский» маршрут по городу.',
    hookFact:
      'Современный памятник Канту стоит у университета его имени - логичная пара к могиле философа на острове Канта.',
    wayToFind: 'Рядом с корпусами БФУ им. Канта в центре - уточняйте точку у Университетской / Чернышевского.',
    latitude: 54.7254,
    longitude: 20.4962,
    address: 'г. Калининград, у БФУ им. И. Канта',
  },
];

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

async function main() {
  const pool = new Pool({ connectionString, max: 2 });
  const report = { dryRun, actions: [] };
  try {
    const city = await pool.query(
      `select id, slug from "City" where lower(slug) in ('калининград','kaliningrad') limit 1`,
    );
    if (!city.rows[0]) throw new Error('kaliningrad city missing');
    const cityId = city.rows[0].id;

    for (const item of FIXES) {
      const existing = await pool.query(`select id, slug, title, kind::text from "Venue" where slug = $1`, [
        item.slug,
      ]);
      const canonicalPath =
        item.family === 'institution' ? `/venues/${item.slug}` : `/locations/${item.slug}`;
      if (existing.rows[0]) {
        report.actions.push({ slug: item.slug, action: 'update', wasTitle: existing.rows[0].title });
        if (!dryRun) {
          await pool.query(
            `update "Venue" set
              title = $2,
              kind = $3::"VenueKind",
              "pageStatus" = 'PUBLISHED'::"VenuePageStatus",
              "cityId" = $4,
              "shortDescription" = $5,
              description = $6,
              "hookFact" = $7,
              "wayToFind" = $8,
              latitude = $9,
              longitude = $10,
              address = $11,
              "seoH1" = $2,
              "seoTitle" = $12,
              "seoDescription" = $5,
              "canonicalPath" = $13,
              "isIndexable" = true,
              "updatedAt" = now()
            where slug = $1`,
            [
              item.slug,
              item.title,
              item.kind,
              cityId,
              item.shortDescription,
              item.description,
              item.hookFact,
              item.wayToFind,
              item.latitude,
              item.longitude,
              item.address,
              `${item.title} | Дайбилет`,
              canonicalPath,
            ],
          );
        }
      } else {
        report.actions.push({ slug: item.slug, action: 'insert' });
        if (!dryRun) {
          const id = `ven_ms_${crypto.createHash('sha1').update(item.slug).digest('hex').slice(0, 16)}`;
          await pool.query(
            `insert into "Venue" (
              id, slug, title, kind, "pageStatus", "cityId",
              "shortDescription", description, "hookFact", "wayToFind",
              latitude, longitude, address,
              "seoH1", "seoTitle", "seoDescription", "canonicalPath",
              "isIndexable", "createdAt", "updatedAt"
            ) values (
              $1,$2,$3,$4::"VenueKind",'PUBLISHED'::"VenuePageStatus",$5,
              $6,$7,$8,$9,
              $10,$11,$12,
              $3,$13,$6,$14,
              true, now(), now()
            )`,
            [
              id,
              item.slug,
              item.title,
              item.kind,
              cityId,
              item.shortDescription,
              item.description,
              item.hookFact,
              item.wayToFind,
              item.latitude,
              item.longitude,
              item.address,
              `${item.title} | Дайбилет`,
              canonicalPath,
            ],
          );
        }
      }
    }
  } finally {
    await pool.end();
  }
  console.log(JSON.stringify(report, null, 2));
}

function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
