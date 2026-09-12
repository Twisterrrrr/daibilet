import fs from 'node:fs';

const src = fs.readFileSync('apps/web/src/lib/cityInfo.ts', 'utf8');
const marker = "name: 'Петергоф'";
const start = src.indexOf('    significantSuburbs: [');
const petStart = src.indexOf(marker, start);
if (start < 0 || petStart < 0) throw new Error('SPB suburbs block not found');
const end = src.indexOf('    ],\n    dayRoutePresets: [\n      ...SAINT_PETERSBURG_LINE_DAY_ROUTE_PRESETS');
if (end < 0) throw new Error('SPB suburbs end not found');
const inner = src.slice(start + '    significantSuburbs: [\n'.length, end);
const body = inner.replace(/^      /gm, '  ');
const out = `/** SPB hub suburb cards (palace belt + coast). Hyphen-only copy. */
import type { CitySuburbItem } from './cityInfo.ts';
import { VYBORG_SUBURB_CARD } from './city-destination-registry.ts';

export const SAINT_PETERSBURG_SUBURBS: CitySuburbItem[] = [
${body}
];
`;
fs.writeFileSync('apps/web/src/lib/saint-petersburg-suburbs.ts', out);
console.log('OK', out.length);
