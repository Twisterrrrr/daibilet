/**
 * Install all ready duplicate-fix assets from worklist.
 *   node scripts/batch-install-duplicate-fixes.mjs
 *   node scripts/batch-install-duplicate-fixes.mjs --cities=ufa,tver
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assets =
  process.env.VENUE_ASSETS_DIR || 'C:/Users/user/.cursor/projects/f-coding-daibilet-push/assets';
const auditPath = path.join(__dirname, 'audit-city-suburbs-visual-output.json');
const citiesArg = process.argv.find((a) => a.startsWith('--cities='));
const cityFilter = citiesArg
  ? new Set(citiesArg.slice('--cities='.length).split(',').map((s) => s.trim()))
  : null;

const wl = JSON.parse(fs.readFileSync(auditPath, 'utf8')).regenerateWorklist;
const ready = [];
const missing = [];
for (const x of wl) {
  if (cityFilter && !cityFilter.has(x.hubCity)) continue;
  const src = path.join(assets, `${x.stem}.jpg`);
  if (fs.existsSync(src)) ready.push({ stem: x.stem, city: x.hubCity });
  else missing.push({ stem: x.stem, city: x.hubCity });
}

const batchPath = path.join(__dirname, 'tmp-duplicate-install-batch.json');
fs.writeFileSync(batchPath, JSON.stringify(ready));
const r = spawnSync('node', [path.join(__dirname, 'install-venue-still.mjs'), `--batch=${batchPath}`], {
  cwd: root,
  encoding: 'utf8',
});
console.log(r.stdout || r.stderr);
console.log(
  JSON.stringify(
    {
      worklist: wl.length,
      ready: ready.length,
      missing: missing.length,
      byCityMissing: missing.reduce((a, x) => {
        a[x.city] = (a[x.city] || 0) + 1;
        return a;
      }, {}),
    },
    null,
    2,
  ),
);
