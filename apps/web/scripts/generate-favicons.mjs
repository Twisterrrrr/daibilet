/**
 * Rasterize apps/web/public/favicon.svg → PNG/ICO sizes for tab + PWA.
 *
 * Requires one-time: npm i @resvg/resvg-js png-to-ico
 * in a temp dir, then:
 *   PUBLIC_DIR=apps/web/public NODE_PATH=/path/to/node_modules node apps/web/scripts/generate-favicons.mjs
 *
 * Or from apps/web after adding optional deps.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = process.env.PUBLIC_DIR || join(__dirname, '..', 'public');
const svg = readFileSync(join(publicDir, 'favicon.svg'));

function renderPng(size, background) {
  const opts = { fitTo: { mode: 'width', value: size } };
  if (background) opts.background = background;
  return new Resvg(svg, opts).render().asPng();
}

const outputs = [
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'favicon-48x48.png', size: 48 },
  { file: 'favicon-96x96.png', size: 96 },
  { file: 'apple-touch-icon.png', size: 180, background: '#ffffff' },
  { file: 'icon-192x192.png', size: 192 },
  { file: 'logo-192x192.png', size: 192 },
  { file: 'icon-512x512.png', size: 512 },
];

for (const { file, size, background } of outputs) {
  const png = renderPng(size, background);
  writeFileSync(join(publicDir, file), png);
  console.log(`wrote ${file} (${size}×${size}, ${png.length} bytes)`);
}

const ico = await pngToIco([
  join(publicDir, 'favicon-32x32.png'),
  join(publicDir, 'favicon-48x48.png'),
]);
writeFileSync(join(publicDir, 'favicon.ico'), ico);
console.log(`wrote favicon.ico (${ico.length} bytes)`);
