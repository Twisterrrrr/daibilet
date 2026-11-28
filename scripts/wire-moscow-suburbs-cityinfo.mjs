import fs from 'node:fs';

const path = 'apps/web/src/lib/cityInfo.ts';
let src = fs.readFileSync(path, 'utf8');
const marker = 'name: "Сергиев Посад"';
const start = src.indexOf('    significantSuburbs: [');
const blockStart = src.lastIndexOf('    significantSuburbs: [', src.indexOf(marker));
if (blockStart < 0) throw new Error('Moscow suburbs block not found');
const end = src.indexOf('    ],\n    dayRoutePresets: [\n      ...MOSCOW_LINE_DAY_ROUTE_PRESETS', blockStart);
if (end < 0) throw new Error('Moscow suburbs end not found');
src =
  src.slice(0, blockStart) +
  '    significantSuburbs: MOSCOW_SUBURBS,\n' +
  src.slice(end + '    ],\n'.length);
fs.writeFileSync(path, src);
console.log('OK cityInfo Moscow suburbs wired');
