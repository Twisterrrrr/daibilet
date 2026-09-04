import fs from 'node:fs';

const src = fs.readFileSync('apps/web/src/lib/cityInfo.ts', 'utf8');
const marker = "name: \"Сергиев Посад\"";
const start = src.indexOf('    significantSuburbs: [');
const petStart = src.indexOf(marker, start);
if (start < 0 || petStart < 0) throw new Error('Moscow suburbs block not found');
const end = src.indexOf('    ],\n    dayRoutePresets: [\n      ...MOSCOW_LINE_DAY_ROUTE_PRESETS');
if (end < 0) throw new Error('Moscow suburbs end not found');
const inner = src.slice(start + '    significantSuburbs: [\n'.length, end);
const body = inner.replace(/^      /gm, '  ');
const out = `/** Moscow hub suburb cards (Golden Ring belt + estates). Hyphen-only copy. */
import type { CitySuburbItem } from './cityInfo.ts';

export const MOSCOW_SUBURBS_RAW: CitySuburbItem[] = [
${body}
];
`;
fs.writeFileSync('apps/web/src/lib/moscow-suburbs.ts', out);
console.log('OK', out.length);
