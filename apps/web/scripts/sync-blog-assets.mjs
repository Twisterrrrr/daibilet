import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '../..');
const targetDir = path.join(webRoot, 'public/images/blog');
const sources = [
  path.join(repoRoot, 'apps/public/public/images/blog'),
  path.join(repoRoot, 'apps/public/dist/images/blog'),
];

let copied = 0;
fs.mkdirSync(targetDir, { recursive: true });

for (const sourceDir of sources) {
  if (!fs.existsSync(sourceDir)) continue;
  for (const file of fs.readdirSync(sourceDir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
    copied += 1;
  }
}

console.log(`sync-blog-assets: ${copied} file(s) in ${targetDir}`);
