#!/usr/bin/env node
/**
 * Install city visual regen batch from assets/{stem}.jpg
 *   node scripts/city-visual-regen-install.mjs <city>
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const city = process.argv[2];
if (!city) {
  console.error('Usage: node scripts/city-visual-regen-install.mjs <city>');
  process.exit(2);
}
const wlPath = path.join(root, 'scripts/city-visual-regen', `${city}.json`);
if (!fs.existsSync(wlPath)) {
  console.error('Missing worklist', wlPath);
  process.exit(2);
}
const wl = JSON.parse(fs.readFileSync(wlPath, 'utf8'));
const assets =
  process.env.VENUE_ASSETS_DIR ||
  'C:/Users/user/.cursor/projects/f-coding-daibilet-push/assets';

let installed = 0;
const failures = [];
for (const item of wl.regen || []) {
  const src = path.join(assets, `${item.stem}.jpg`);
  if (!fs.existsSync(src)) {
    failures.push({ stem: item.stem, reason: 'missing_asset' });
    continue;
  }
  const r = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/install-venue-still.mjs'), item.stem, city],
    { cwd: root, encoding: 'utf8' },
  );
  let parsed = null;
  try {
    parsed = JSON.parse(String(r.stdout || '').trim());
  } catch {
    parsed = { ok: false, reason: 'parse_error', stdout: r.stdout, stderr: r.stderr };
  }
  if (parsed.ok) {
    installed++;
    console.log('OK', item.stem);
  } else {
    failures.push({ stem: item.stem, reason: parsed.reason, gate: parsed.gate });
    console.log('FAIL', item.stem, parsed.reason, parsed.gate?.vs || '');
  }
}
console.log(JSON.stringify({ city, installed, failures: failures.length, failureStems: failures.map((f) => f.stem) }));
