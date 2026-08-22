/**
 * Batch fix map + images for user-reported hub cities.
 *   node scripts/fix-user-cities-batch.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MAP_CITIES = [
  'chelyabinsk',
  'novosibirsk',
  'voronezh',
  'krasnoyarsk',
  'kaliningrad',
];

const REGEN_CITIES = [
  'chelyabinsk',
  'novosibirsk',
  'voronezh',
  'krasnoyarsk',
  'kaliningrad',
  'tver',
  'penza',
  'tyumen',
  'omsk',
  'sochi',
  'rostov-na-donu',
  'saratov',
  'yaroslavl',
  'volgograd',
  'ryazan',
];

function run(label, args) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error(`FAILED: ${label}`);
    process.exit(r.status || 1);
  }
}

run('recover-hub-preview-map', [path.join('scripts', 'recover-hub-preview-map.mjs')]);

for (const city of MAP_CITIES) {
  run(`fix-city-image-map ${city}`, [
    path.join('scripts', 'fix-city-image-map.mjs'),
    `--city=${city}`,
    '--rethumb',
  ]);
}

run('regenerate duplicates', [
  path.join('scripts', 'regenerate-suburb-duplicate-covers.mjs'),
  `--cities=${REGEN_CITIES.join(',')}`,
]);

run('audit collisions', [path.join('scripts', 'audit-slug-path-collisions.mjs'), '--check']);

run('audit visual', [path.join('scripts', 'audit-city-suburbs-visual.mjs')]);

console.log('\nDone.');
