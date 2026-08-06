#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const block = fs
  .readFileSync(path.join(root, 'scripts/data/perm-cityinfo-block.ts.txt'), 'utf8')
  .replace(/\r\n/g, '\n')
  .trimEnd() + '\n';

const paths = [
  path.join(root, 'apps/web/src/lib/cityInfo.ts'),
  path.join(root, 'apps/public/src/lib/cityInfo.ts'),
];

for (const p of paths) {
  let src = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const start = src.indexOf('  perm: {');
  if (start < 0) throw new Error('perm not found in ' + p);
  const after = src.slice(start + 1);
  const next = after.search(/\n  [a-z'"-]+: \{/);
  if (next < 0) throw new Error('next city not found in ' + p);
  const cutEnd = start + 1 + next;
  const before = src.slice(0, start);
  const rest = src.slice(cutEnd + 1);
  if (!block.startsWith('  perm: {')) throw new Error('bad block');
  const out = before + block + rest;
  if (!out.includes('  sortavala: {')) throw new Error('sortavala lost in ' + p);
  const m = out.match(/perm: \{[\s\S]*?\n  \},?\n  sortavala/);
  if (!m) throw new Error('perm block shape bad in ' + p);
  const mustSeePart = m[0].split('significantSuburbs')[0];
  const mustNames = [...mustSeePart.matchAll(/name: '((?:\\'|[^'])*)'/g)].map((x) => x[1]);
  const dups = mustNames.filter((n, i) => mustNames.indexOf(n) !== i);
  if (dups.length) console.warn('DUPS in mustSee', p, dups);
  fs.writeFileSync(p, out);
  console.log('patched', path.relative(root, p), 'mustSee', mustNames.length);
}
