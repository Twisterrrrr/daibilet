/**
 * Fix one scan-priority city: map (if pack exists) + duplicate regen + rethumb + audit.
 *   node scripts/fix-scan-city.mjs --city=ufa
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const city = process.argv.find((a) => a.startsWith('--city='))?.slice('--city='.length);

const SCAN_CITIES = [
  'ryazan',
  'ufa',
  'tver',
  'penza',
  'tyumen',
  'rostov-na-donu',
  'omsk',
  'saratov',
  'sochi',
];

const MAP_PACK_CITIES = new Set(['ryazan', 'ufa', 'tyumen', 'omsk', 'chelyabinsk']);

if (!city) {
  console.error(`Usage: node scripts/fix-scan-city.mjs --city=<one of ${SCAN_CITIES.join('|')}>`);
  process.exit(1);
}

function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error(`FAILED: ${label}`);
    process.exit(r.status || 1);
  }
}

async function rethumbCityFolder(citySlug) {
  const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
  const dir = path.join(root, 'apps/public/public/images/venues', citySlug);
  if (!fs.existsSync(dir)) return { rethumb: 0 };
  const bases = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jpg') && !f.includes('-card') && !f.includes('-thumb'));
  let n = 0;
  const failures = [];
  for (const f of bases) {
    const abs = path.join(dir, f);
    if (fs.statSync(abs).size < 5000) continue;
    const stem = f.replace(/\.jpg$/, '');
    const cardPath = path.join(dir, `${stem}-card.jpg`);
    const thumbPath = path.join(dir, `${stem}-thumb.jpg`);
    const tmp = `${abs}.rethumb.tmp.jpg`;
    const tmpCard = `${cardPath}.rethumb.tmp.jpg`;
    const tmpThumb = `${thumbPath}.rethumb.tmp.jpg`;
    try {
      const buf = await sharp(abs).rotate().toBuffer();
      await sharp(buf)
        .resize(1600, 1067, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(tmp);
      fs.renameSync(tmp, abs);
      await sharp(buf)
        .resize(640, null, { withoutEnlargement: true })
        .jpeg({ quality: 68 })
        .toFile(tmpCard);
      fs.renameSync(tmpCard, cardPath);
      await sharp(buf)
        .resize(320, null, { withoutEnlargement: true })
        .jpeg({ quality: 65 })
        .toFile(tmpThumb);
      fs.renameSync(tmpThumb, thumbPath);
      n++;
    } catch (e) {
      failures.push({ stem, error: String(e) });
      for (const p of [tmp, tmpCard, tmpThumb]) {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch {}
      }
    }
  }
  return { rethumb: n, failures: failures.length };
}

// Refresh visual audit worklist once per city (fast enough for one city context)
run('audit-city-suburbs-visual', [path.join('scripts', 'audit-city-suburbs-visual.mjs')]);

if (MAP_PACK_CITIES.has(city)) {
  run(`fix-city-image-map ${city}`, [
    path.join('scripts', 'fix-city-image-map.mjs'),
    `--city=${city}`,
  ]);
}

run(`regenerate duplicates ${city}`, [
  path.join('scripts', 'regenerate-suburb-duplicate-covers.mjs'),
  `--cities=${city}`,
]);

console.log(`\n=== rethumb folder ${city} ===`);
const r = await rethumbCityFolder(city);
console.log(JSON.stringify(r));

run(`audit collisions ${city}`, [
  path.join('scripts', 'audit-slug-path-collisions.mjs'),
  `--city=${city}`,
]);

const report = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/audit-slug-path-collisions.json'), 'utf8'),
);
console.log(
  JSON.stringify(
    {
      city,
      collisionGroups: report.collisionGroups,
      collisionSlugs: report.collisionSlugs,
      crossCityGroups: report.crossCityGroups,
    },
    null,
    2,
  ),
);
