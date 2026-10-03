/**
 * Копирует статику Vite public → Next public перед сборкой.
 *
 * Источник (эталон): apps/public/public/images/
 *   blog/      — обложки статей
 *   cities/    — карточки городов (*.png)
 *   hero/      — фон главной
 *   events/    — обложки событий (fallback)
 *   landings/  — промо подборок
 *   home/      — format/thematic tiles на главной
 *   venues/    — обложки площадок (если есть)
 *   og/        — Open Graph / share preview images
 *
 * Назначение: apps/web/public/images/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '../..');
const targetRoot = path.join(webRoot, 'public/images');

const sourceRoots = [
  path.join(repoRoot, 'apps/public/public/images'),
  path.join(repoRoot, 'apps/public/dist/images'),
  path.join(repoRoot, 'deploy/assets/images'),
];

const SUBDIRS = ['blog', 'cities', 'hero', 'events', 'landings', 'home', 'venues', 'og'];

function copyDir(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return 0;
  fs.mkdirSync(targetDir, { recursive: true });
  let copied = 0;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const from = path.join(sourceDir, entry.name);
    const to = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copied += copyDir(from, to);
      continue;
    }
    if (!/\.(jpe?g|png|webp|gif|svg)$/i.test(entry.name)) continue;
    fs.copyFileSync(from, to);
    copied += 1;
  }
  return copied;
}

let copied = 0;
let usedSource = null;

for (const sourceRoot of sourceRoots) {
  if (!fs.existsSync(sourceRoot)) continue;
  usedSource = sourceRoot;
  for (const subdir of SUBDIRS) {
    copied += copyDir(path.join(sourceRoot, subdir), path.join(targetRoot, subdir));
  }
  break;
}

if (!usedSource) {
  console.warn(`sync-public-assets: source not found. Expected: ${sourceRoots[0]}`);
} else {
  console.log(`sync-public-assets: ${copied} file(s) from ${usedSource} → ${targetRoot}`);
}
