/**
 * Lean-compress a fixed list of moscow venue JPGs (hero + thumb + card).
 * Usage: node scripts/lean-moscow-mustsee-batch.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const pub = path.join(root, 'apps/public/public/images/venues/moscow');
const web = path.join(root, 'apps/web/public/images/venues/moscow');

const stems = [
  'pamyatnik-a-s-pushkinu',
  'art-obekt-bolshaya-glina-4',
  'pamyatnik-yuriyu-gagarinu',
  'pamyatnik-petru-i',
  'pamyatnik-vladimiru-velikomu',
  'monument-rabochiy-i-kolhoznitsa',
  'pamyatnik-f-m-dostoevskomu',
  'pamyatnik-v-v-mayakovskomu',
  'pamyatnik-m-yu-lermontovu',
  'pamyatnik-gogolyu-skorbnyy-nikitskiy',
  'pamyatnik-gogolyu-torzhestvennyy-gogolevskiy',
  'deti-zhertvy-porokov-vzroslyh',
  'art-obekt-krasnye-vorota-polisskiy',
  'pamyatnik-aleksandru-griboedovu',
  'art-obekt-uho-derevo-zhelaniy',
  'vozvraschenie-bludnogo-syna-sidur',
  'pamyatnik-iosifu-brodskomu',
  'sherlok-holms-i-doktor-vatson',
  'pamyatnik-aleksandru-ii',
  'skulptura-prostranstvo-sveta',
];

async function write(input, output, width, quality) {
  await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true, progressive: true })
    .toFile(output);
}

for (const stem of stems) {
  const src = path.join(pub, `${stem}.jpg`);
  if (!fs.existsSync(src)) {
    console.log('skip missing', stem);
    continue;
  }
  const tmp = path.join(pub, `${stem}.lean-tmp.jpg`);
  await write(src, tmp, 1200, 76);
  fs.renameSync(tmp, src);
  await write(src, path.join(pub, `${stem}-thumb.jpg`), 640, 70);
  await write(src, path.join(pub, `${stem}-card.jpg`), 960, 82);
  for (const name of [`${stem}.jpg`, `${stem}-thumb.jpg`, `${stem}-card.jpg`]) {
    fs.copyFileSync(path.join(pub, name), path.join(web, name));
  }
  const size = fs.statSync(src).size;
  console.log(JSON.stringify({ stem, heroBytes: size }));
}
