import fs from 'node:fs';

const path = 'apps/web/src/lib/cityInfo.ts';
let src = fs.readFileSync(path, 'utf8');
const permBlock = src.indexOf('  perm:');
const start = src.indexOf('    significantSuburbs: [', permBlock);
const end = src.indexOf('    ],\n    dayRoutePresets: [\n      {\n        id: \'perm-green-line\'', start);
if (start < 0 || end < 0) throw new Error('Perm suburbs block not found');
src =
  src.slice(0, start) +
  '    significantSuburbs: PERM_SUBURBS,\n' +
  src.slice(end + '    ],\n'.length);
fs.writeFileSync(path, src);
console.log('OK perm wired');
