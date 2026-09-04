import fs from 'node:fs';

const src = fs.readFileSync('apps/web/src/lib/cityInfo.ts', 'utf8');
const marker = "name: 'Хохловка'";
const start = src.indexOf('    significantSuburbs: [', src.indexOf('  perm:'));
const petStart = src.indexOf(marker, start);
if (start < 0 || petStart < 0) throw new Error('Perm suburbs block not found');
const end = src.indexOf('    ],\n    dayRoutePresets: [\n      {\n        id: \'perm-green-line\'');
if (end < 0) throw new Error('Perm suburbs end not found');
const inner = src.slice(start + '    significantSuburbs: [\n'.length, end);
const body = inner.replace(/^      /gm, '  ');
const out = `/** Perm hub suburb cards. Hyphen-only copy. */
import type { CitySuburbItem } from './cityInfo.ts';

export const PERM_SUBURBS: CitySuburbItem[] = [
${body}
];
`;
fs.writeFileSync('apps/web/src/lib/perm-hub.ts', out);
console.log('OK', out.length);
