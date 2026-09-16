/**
 * Sync Vite public cityInfo suburb packs from web canon (destination registry modules).
 * Does not re-export Next/web graph into Vite - copies suburb modules only.
 *
 *   node scripts/sync-public-cityinfo-canon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webLib = path.join(root, 'apps/web/src/lib');
const publicLib = path.join(root, 'apps/public/src/lib');

const COPY_FILES = [
  'saint-petersburg-suburbs.ts',
  'moscow-suburbs.ts',
  'perm-hub.ts',
];

function copyFile(name) {
  const src = path.join(webLib, name);
  const dest = path.join(publicLib, name);
  let text = fs.readFileSync(src, 'utf8');
  // public uses extensionless imports like the rest of Vite hub files
  text = text.replace(/from '\.\/cityInfo\.ts'/g, "from './cityInfo'");
  fs.writeFileSync(dest, text);
  console.log('copied', name);
}

function extractRegistryCards() {
  const registry = fs.readFileSync(path.join(webLib, 'city-destination-registry.ts'), 'utf8');
  const cardNames = [
    'VYBORG_SUBURB_CARD',
    'KURSHKAYA_KOSA_SUBURB_CARD',
    'ZELENOGRADSK_SUBURB_CARD',
    'SVETLOGORSK_SUBURB_CARD',
    'BALTIYSK_SUBURB_CARD',
    'YANTARNY_SUBURB_CARD',
    'GORODETS_SUBURB_CARD',
    'SEMYONOV_SUBURB_CARD',
    'DIVEEVO_SUBURB_CARD',
    'MAKARYEV_SUBURB_CARD',
  ];
  const parts = [
    `/** Copied suburb cards from web city-destination-registry (Vite mirror). Do not edit - sync via scripts/sync-public-cityinfo-canon.mjs */`,
    `import type { CitySuburbItem } from './cityInfo';`,
    '',
  ];
  for (const name of cardNames) {
    const re = new RegExp(`export const ${name}: CitySuburbItem = \\{[\\s\\S]*?\\n\\};`);
    const match = registry.match(re);
    if (!match) throw new Error(`Missing ${name} in registry`);
    parts.push(match[0].replace(': CitySuburbItem', ': CitySuburbItem'));
    parts.push('');
  }
  fs.writeFileSync(path.join(publicLib, 'destination-suburb-cards.ts'), parts.join('\n'));
  console.log('wrote destination-suburb-cards.ts', cardNames.length);
}

function patchPublicCityInfo() {
  const file = path.join(publicLib, 'cityInfo.ts');
  let src = fs.readFileSync(file, 'utf8');

  if (!src.includes('destination-suburb-cards')) {
    src = src.replace(
      "import { KALININGRAD_LINE_DAY_ROUTE_PRESETS } from './kaliningrad-line-presets';\n",
      `import { KALININGRAD_LINE_DAY_ROUTE_PRESETS } from './kaliningrad-line-presets';
import { MOSCOW_SUBURBS } from './moscow-suburbs';
import { PERM_SUBURBS } from './perm-hub';
import { buildSaintPetersburgSuburbs } from './saint-petersburg-suburbs';
import {
  BALTIYSK_SUBURB_CARD,
  DIVEEVO_SUBURB_CARD,
  GORODETS_SUBURB_CARD,
  KURSHKAYA_KOSA_SUBURB_CARD,
  MAKARYEV_SUBURB_CARD,
  SEMYONOV_SUBURB_CARD,
  SVETLOGORSK_SUBURB_CARD,
  VYBORG_SUBURB_CARD,
  YANTARNY_SUBURB_CARD,
  ZELENOGRADSK_SUBURB_CARD,
} from './destination-suburb-cards';
`,
    );
  }

  if (!src.startsWith('/** DEPRECATED')) {
    src =
      `/** DEPRECATED Vite SPA mirror. Canon: apps/web/src/lib/cityInfo.ts + destination registry.\n` +
      ` * Sync suburbs: node scripts/sync-public-cityinfo-canon.mjs\n` +
      ` * Do not edit SPB/MSK/Perm/KGD/NN suburb packs here.\n */\n` +
      src;
  }

  // SPB suburbs
  {
    const start = src.indexOf("name: 'Петергоф'");
    const blockStart = src.lastIndexOf('    significantSuburbs: [', start);
    const end = src.indexOf(
      "    ],\n    dayRoutePresets: [\n      ...SAINT_PETERSBURG_LINE_DAY_ROUTE_PRESETS",
      blockStart,
    );
    if (blockStart > 0 && end > blockStart) {
      src =
        src.slice(0, blockStart) +
        '    significantSuburbs: buildSaintPetersburgSuburbs(VYBORG_SUBURB_CARD),\n' +
        src.slice(end + '    ],\n'.length);
    }
  }

  // Moscow suburbs
  {
    const marker = 'name: "Сергиев Посад"';
    const idx = src.indexOf(marker);
    const blockStart = src.lastIndexOf('    significantSuburbs: [', idx);
    const end = src.indexOf(
      '    ],\n    dayRoutePresets: [\n      ...MOSCOW_LINE_DAY_ROUTE_PRESETS',
      blockStart,
    );
    if (blockStart > 0 && end > blockStart) {
      src =
        src.slice(0, blockStart) +
        '    significantSuburbs: MOSCOW_SUBURBS,\n' +
        src.slice(end + '    ],\n'.length);
    }
  }

  // Kaliningrad
  {
    const marker = "name: 'Куршская коса'";
    const idx = src.indexOf(marker);
    if (idx > 0) {
      const blockStart = src.lastIndexOf('    significantSuburbs: [', idx);
      const end = src.indexOf('    ],\n    dayRoutePresets: [', blockStart);
      if (blockStart > 0 && end > blockStart) {
        src =
          src.slice(0, blockStart) +
          `    significantSuburbs: [
      KURSHKAYA_KOSA_SUBURB_CARD,
      ZELENOGRADSK_SUBURB_CARD,
      SVETLOGORSK_SUBURB_CARD,
      BALTIYSK_SUBURB_CARD,
      YANTARNY_SUBURB_CARD,
    ],
` +
          src.slice(end + '    ],\n'.length);
      }
    }
  }

  // NN
  {
    const marker = "name: 'Городец'";
    const idx = src.indexOf(marker);
    if (idx > 0) {
      const blockStart = src.lastIndexOf('    significantSuburbs: [', idx);
      const end = src.indexOf('    ],\n    dayRoutePresets: [', blockStart);
      if (blockStart > 0 && end > blockStart) {
        src =
          src.slice(0, blockStart) +
          `    significantSuburbs: [
      GORODETS_SUBURB_CARD,
      SEMYONOV_SUBURB_CARD,
      DIVEEVO_SUBURB_CARD,
      MAKARYEV_SUBURB_CARD,
    ],
` +
          src.slice(end + '    ],\n'.length);
      }
    }
  }

  // Perm
  {
    const marker = "name: 'Хохловка'";
    const idx = src.indexOf(marker);
    if (idx > 0) {
      const blockStart = src.lastIndexOf('    significantSuburbs: [', idx);
      const end = src.indexOf('    ],\n    dayRoutePresets: [', blockStart);
      if (blockStart > 0 && end > blockStart) {
        src =
          src.slice(0, blockStart) +
          '    significantSuburbs: PERM_SUBURBS,\n' +
          src.slice(end + '    ],\n'.length);
      }
    }
  }

  fs.writeFileSync(file, src);
  console.log('patched apps/public/src/lib/cityInfo.ts');
}

for (const name of COPY_FILES) copyFile(name);
extractRegistryCards();
patchPublicCityInfo();
console.log('OK public cityInfo synced from web canon');
