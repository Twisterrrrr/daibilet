/**
 * One-shot: install 12 photoreal stub replacements from assets/.
 *   node scripts/install-tiny-stub-fixes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets =
  process.env.VENUE_ASSETS_DIR ||
  'C:/Users/user/.cursor/projects/f-coding-daibilet-push/assets';

const items = [
  { src: 'pamyatnik-leninu-rostov.jpg', stem: 'pamyatnik-leninu', city: 'rostov-na-donu' },
  { src: 'zdanie-gosudarstvennogo-banka-rostov.jpg', stem: 'zdanie-gosudarstvennogo-banka', city: 'rostov-na-donu' },
  { src: 'galereya-kraft.jpg', stem: 'galereya-kraft', city: 'ryazan' },
  { src: 'muzey-pchelovodstva.jpg', stem: 'muzey-pchelovodstva', city: 'ryazan' },
  { src: 'torgovye-ryady-krasnoryadskaya.jpg', stem: 'torgovye-ryady-krasnoryadskaya', city: 'ryazan' },
  { src: 'oblastnoy-muzey-kraevedeniya.jpg', stem: 'oblastnoy-muzey-kraevedeniya', city: 'saratov' },
  { src: 'kraevedcheskiy-muzey-tver.jpg', stem: 'kraevedcheskiy-muzey', city: 'tver' },
  { src: 'pamyatnik-leninu-tver.jpg', stem: 'pamyatnik-leninu', city: 'tver' },
  { src: 'sobornaya-mechet.jpg', stem: 'sobornaya-mechet', city: 'tver' },
  { src: 'gostinyy-dvor-tyumen.jpg', stem: 'gostinyy-dvor', city: 'tyumen' },
  { src: 'teatr-kukol-tyumen.jpg', stem: 'teatr-kukol', city: 'tyumen' },
  { src: 'zdanie-dvoryanskogo-sobraniya.jpg', stem: 'zdanie-dvoryanskogo-sobraniya', city: 'ufa' },
];

let ok = 0;
for (const item of items) {
  const src = path.join(assets, item.src);
  const dest = path.join(assets, `${item.stem}.jpg`);
  if (!fs.existsSync(src)) {
    console.error('MISSING asset', item.src);
    continue;
  }
  fs.copyFileSync(src, dest);
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/install-venue-still.mjs'), item.stem, item.city], {
    cwd: root,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.error('FAIL', item.stem, item.city, r.stderr || r.stdout);
    continue;
  }
  console.log(String(r.stdout || '').trim());
  ok++;
}
console.log(JSON.stringify({ total: items.length, installed: ok }));
