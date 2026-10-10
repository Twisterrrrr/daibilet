/**
 * Install NN regen assets with uniqueness gate retries (expects assets/{stem}.jpg).
 *   node scripts/nn-regen-install.mjs
 *   node scripts/nn-regen-install.mjs --stems=gosbank-nnov,ploshchad-minina
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets =
  process.env.VENUE_ASSETS_DIR ||
  'C:/Users/user/.cursor/projects/f-coding-daibilet-push/assets';
const wlPath = path.join(root, 'scripts/nn-regen-worklist.json');
const wl = JSON.parse(fs.readFileSync(wlPath, 'utf8'));
const city = wl.city || 'nizhny-novgorod';

const stemsArg = process.argv.find((a) => a.startsWith('--stems='));
const filter = stemsArg ? new Set(stemsArg.slice('--stems='.length).split(',').map((s) => s.trim())) : null;

const pending = (wl.pending || []).filter((x) => !filter || filter.has(x.stem));
const done = new Set(wl.done || []);

let installed = 0;
let gateRetries = 0;
const failures = [];

for (const item of pending) {
  const src = path.join(assets, `${item.stem}.jpg`);
  if (!fs.existsSync(src)) {
    failures.push({ stem: item.stem, reason: 'missing_asset' });
    continue;
  }
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/install-venue-still.mjs'), item.stem, city], {
    cwd: root,
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    parsed = JSON.parse(String(r.stdout || '').trim());
  } catch {
    parsed = { ok: false, reason: 'parse_error', stdout: r.stdout, stderr: r.stderr };
  }
  if (parsed.ok) {
    installed++;
    done.add(item.stem);
    console.log('OK', item.stem);
  } else if (parsed.reason === 'uniqueness_gate') {
    gateRetries++;
    failures.push({ stem: item.stem, reason: 'uniqueness_gate', gate: parsed.gate });
    console.log('GATE', item.stem, parsed.gate?.vs || parsed.gate?.reason);
  } else {
    failures.push({ stem: item.stem, reason: parsed.reason || 'unknown', detail: parsed });
    console.log('FAIL', item.stem, parsed.reason);
  }
}

wl.done = [...done];
wl.lastInstall = { installed, gateRetries, failures, at: new Date().toISOString() };
fs.writeFileSync(wlPath, `${JSON.stringify(wl, null, 2)}\n`);
console.log(JSON.stringify({ installed, gateRetries, failures: failures.length, failureStems: failures.map((f) => f.stem) }));
