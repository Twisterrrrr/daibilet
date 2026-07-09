/**
 * Копирует сгенерированные обложки в apps/public/public/images/events/
 * node scripts/copy-event-images.js
 */
const fs = require('fs');
const path = require('path');

const assetsDir = path.resolve(__dirname, '../../.cursor/projects/f-coding-DAIBILET/assets');
const altAssetsDir = path.resolve('C:/Users/user/.cursor/projects/f-coding-DAIBILET/assets');
const destDir = path.resolve(__dirname, '../apps/public/public/images/events');
const filesManifest = path.join(__dirname, 'data', 'event-image-files.json');

const sourceDir = fs.existsSync(assetsDir) ? assetsDir : altAssetsDir;

if (!fs.existsSync(sourceDir)) {
  console.error('Assets dir not found:', sourceDir);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(filesManifest, 'utf8'));
const needed = [...new Set(Object.values(manifest))];

let copied = 0;
for (const filename of needed) {
  const src = path.join(sourceDir, filename);
  const dest = path.join(destDir, filename);
  if (!fs.existsSync(src)) {
    console.warn('MISSING', filename);
    continue;
  }
  fs.copyFileSync(src, dest);
  copied += 1;
  console.log('OK', filename);
}

console.log(`Copied ${copied}/${needed.length} images to ${destDir}`);
