/**
 * Install venue still: base + card + thumb from assets/{stem}.jpg
 *   node scripts/install-venue-still.mjs <stem> <city-folder>
 *   node scripts/install-venue-still.mjs --batch scripts/duplicate-install-batch.json
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { writeVenueStillVariants } from './lib/venue-still-variants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assets = process.env.VENUE_ASSETS_DIR || 'C:/Users/user/.cursor/projects/f-coding-daibilet-push/assets';
const publicDir = path.join(root, 'apps/public/public/images/venues');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

async function gate(src, city, stem) {
  if (process.env.SKIP_UNIQUENESS_GATE === '1') return { ok: true, skipped: true };
  const { spawnSync } = await import('child_process');
  const r = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/venue-still-uniqueness-gate.mjs'), src, city, `--stem=${stem}`],
    { encoding: 'utf8' },
  );
  let parsed = null;
  try {
    parsed = JSON.parse(String(r.stdout || '').trim().split('\n').pop());
  } catch {
    parsed = { ok: false, reason: 'gate_parse', stdout: r.stdout, stderr: r.stderr };
  }
  return parsed;
}

async function install(stem, city) {
  const src = path.join(assets, `${stem}.jpg`);
  const destDir = path.join(publicDir, city);
  if (!fs.existsSync(src)) return { stem, city, ok: false, reason: 'missing asset' };
  const g = await gate(src, city, stem);
  if (!g?.ok) return { stem, city, ok: false, reason: 'uniqueness_gate', gate: g };
  fs.mkdirSync(destDir, { recursive: true });
  const buf = await writeVenueStillVariants(sharp, src, destDir, stem);
  return { stem, city, ok: true, bytes: buf.length, gate: g };
}

const batchArg = process.argv.find((a) => a.startsWith('--batch='));
if (batchArg) {
  const items = JSON.parse(fs.readFileSync(batchArg.slice('--batch='.length), 'utf8'));
  let ok = 0;
  for (const { stem, city } of items) {
    const r = await install(stem, city);
    if (r.ok) ok++;
    else console.log('MISSING', stem);
  }
  console.log(JSON.stringify({ total: items.length, installed: ok }));
} else {
  const [, , stem, city] = process.argv;
  console.log(JSON.stringify(await install(stem, city)));
}
