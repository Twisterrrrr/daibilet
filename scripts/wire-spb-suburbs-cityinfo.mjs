import fs from 'node:fs';

const path = 'apps/web/src/lib/cityInfo.ts';
let src = fs.readFileSync(path, 'utf8');
const start = src.indexOf('    significantSuburbs: [');
const end = src.indexOf('    ],\n    dayRoutePresets: [\n      ...SAINT_PETERSBURG_LINE_DAY_ROUTE_PRESETS');
if (start < 0 || end < 0) throw new Error('SPB suburbs block not found');
src =
  src.slice(0, start) +
  '    significantSuburbs: buildSaintPetersburgSuburbs(VYBORG_SUBURB_CARD),\n' +
  src.slice(end);
fs.writeFileSync(path, src);
console.log('OK cityInfo SPB suburbs wired');
