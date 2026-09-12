#!/usr/bin/env node
/**
 * Audit visible place/scenario preview uniqueness for listed hub cities.
 *   node scripts/audit-place-preview-uniqueness.mjs
 *   node scripts/audit-place-preview-uniqueness.mjs --check  # exit 1 on fail
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const require = createRequire(path.join(root, 'apps/web/package.json'));

const LISTED = [
  'chelyabinsk',
  'tver',
  'penza',
  'omsk',
  'rostov-na-donu',
  'tyumen',
  'ufa',
  'voronezh',
  'ryazan',
  'novosibirsk',
  'samara',
  'krasnoyarsk',
  'tolyatti',
  'surgut',
  'vladikavkaz',
];

const VISIBLE_N = 20;

async function loadTs(rel) {
  const abs = path.join(root, rel);
  return import(pathToFileURL(abs).href);
}

function slugOf(place) {
  return String(place?.venueSlug || place?.locationSlug || '').trim();
}

function basenamePath(url) {
  return String(url || '')
    .replace(/\?.*$/, '')
    .split('/')
    .pop();
}

const failures = [];
const report = { cities: {}, scenarios: {}, generatedAt: new Date().toISOString() };

// Dynamic import of compiled maps via tsx loader is heavy; parse EDITORIAL from a lightweight
// Node path: require the built approach - use child process with tsx if available.
async function resolveEditorial(slug) {
  const { lookupEditorialPlaceImage, resolveVenueHeroImage } = await import(
    pathToFileURL(path.join(root, 'apps/web/src/lib/city-place-images.ts')).href
  ).catch(() => ({}));
  if (typeof lookupEditorialPlaceImage === 'function') {
    return lookupEditorialPlaceImage(slug) || resolveVenueHeroImage?.(slug, null) || null;
  }
  return null;
}

async function main() {
  // Prefer spawning with backend tsx loader for TS imports.
  const { spawnSync } = await import('child_process');
  const helper = `
import cityInfoMod from './apps/web/src/lib/cityInfo.ts';
import imagesMod from './apps/web/src/lib/city-place-images.ts';
const CITY_INFO = cityInfoMod.CITY_INFO || cityInfoMod.default?.CITY_INFO || cityInfoMod;
const lookupEditorialPlaceImage =
  imagesMod.lookupEditorialPlaceImage || imagesMod.default?.lookupEditorialPlaceImage;
const resolveVenueHeroImage =
  imagesMod.resolveVenueHeroImage || imagesMod.default?.resolveVenueHeroImage;
const LISTED = ${JSON.stringify(LISTED)};
const VISIBLE_N = ${VISIBLE_N};
const out = { cities: {}, scenarios: {}, failures: [] };
for (const city of LISTED) {
  const info = CITY_INFO[city];
  if (!info) {
    out.failures.push({ city, kind: 'missing_city_info' });
    continue;
  }
  const must = (info.mustSee || []).slice(0, VISIBLE_N);
  const paths = {};
  const nulls = [];
  for (const place of must) {
    const slug = String(place?.venueSlug || place?.locationSlug || '').trim();
    if (!slug) {
      nulls.push(place?.name || '(unnamed)');
      continue;
    }
    const url = lookupEditorialPlaceImage(slug) || resolveVenueHeroImage(slug, null);
    if (!url) {
      nulls.push(slug);
      continue;
    }
    paths[url] = paths[url] || [];
    paths[url].push(slug);
  }
  const shared = Object.entries(paths).filter(([, slugs]) => slugs.length > 1);
  const identityShared = shared.filter(([url]) => /\\/identity-/.test(url));
  out.cities[city] = {
    mustSeeVisible: must.length,
    nullOrMissingSlug: nulls,
    sharedPaths: shared.map(([url, slugs]) => ({ url, slugs })),
    identityShared: identityShared.map(([url, slugs]) => ({ url, slugs })),
  };
  if (nulls.length) out.failures.push({ city, kind: 'null_preview', items: nulls });
  if (identityShared.length) out.failures.push({ city, kind: 'identity_mass_map', items: identityShared });

  const presets = info.dayRoutePresets || [];
  const coverMap = {};
  for (const p of presets) {
    const cover = String(p.coverImageUrl || '').trim();
    if (!cover) {
      out.failures.push({ city, kind: 'missing_scenario_cover', id: p.id || p.title });
      continue;
    }
    if (/\\/identity-/.test(cover)) {
      out.failures.push({ city, kind: 'identity_scenario_cover', id: p.id || p.title, cover });
    }
    coverMap[cover] = coverMap[cover] || [];
    coverMap[cover].push(p.id || p.title);
  }
  const dupCovers = Object.entries(coverMap).filter(([, ids]) => ids.length > 1);
  out.scenarios[city] = { presets: presets.length, dupCovers };
  if (dupCovers.length) out.failures.push({ city, kind: 'dup_scenario_cover', items: dupCovers });
}
console.log(JSON.stringify(out));
`;
  const tmp = path.join(root, 'tmp-audit-place-preview-uniqueness-run.mjs');
  fs.writeFileSync(tmp, helper);
  const r = spawnSync(
    process.execPath,
    ['--import', './apps/backend/node_modules/tsx/dist/loader.mjs', tmp],
    { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  fs.unlinkSync(tmp);
  if (r.status !== 0 && !r.stdout) {
    console.error(r.stderr || r.error);
    process.exit(1);
  }
  const parsed = JSON.parse(r.stdout.trim().split('\n').pop());
  const outPath = path.join(root, 'scripts/audit-place-preview-uniqueness.json');
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(`failures: ${parsed.failures?.length || 0}`);
  if (check && parsed.failures?.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
