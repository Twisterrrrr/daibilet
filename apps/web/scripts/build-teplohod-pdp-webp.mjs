/**
 * Regenerate the small, curated set of static Teplohod PDP hero derivatives.
 * Run from the repo root with: pnpm --filter @daibilet/web exec node scripts/build-teplohod-pdp-webp.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '../..');
const outputDir = path.join(repoRoot, 'apps/public/public/images/events/teplohod-pdp');
const sourceImages = [
  ['51', 'https://cdn.teplohod.info/images/cache/Events/Event51/4bf789e910-1.jpg', 'd285345f36cf33dec3ba2f4afddb8c728d368b3dc382fb67321c44a44452805e'],
  ['1360', 'https://cdn.teplohod.info/images/cache/Events/Event1360/611db9f32d-1.jpg', '5b747728f7d1c873fdf70877b40fab6f8fda65ffb68f4be6e1cd8fdbaa0c5109'],
  ['1332', 'https://cdn.teplohod.info/images/cache/Events/Event1332/049c6143f9-1.png', '0363a4f54fcd0f59d79bda932478d86e4b53d86c3cbd8292fcee10fdd9a10aab'],
  ['1402', 'https://cdn.teplohod.info/images/cache/Events/Event1402/e90da1d111-1.jpg', 'ac3f4738396ab3797456aa720f820c3f1399d9f676fcc88086f6bcd4cb501686'],
  ['605', 'https://cdn.teplohod.info/images/cache/Events/Event605/abdb095b45-1.jpg', 'f0ec09ed81606b1522916b57d6e6a92397c0b7a2e55f469ea0d85152fea2cf65'],
];
const widths = [750, 1125, 1280, 1536];
const localSourceDir = process.env.TEPLOHOD_PDP_SOURCE_DIR;

await fs.mkdir(outputDir, { recursive: true });

for (const filename of await fs.readdir(outputDir)) {
  const match = /^event-(51|1360|1332|1402|605)-(\d+)\.webp$/u.exec(filename);
  if (match && !widths.includes(Number(match[2]))) {
    await fs.rm(path.join(outputDir, filename));
  }
}

for (const [eventId, sourceUrl, expectedSha256] of sourceImages) {
  let original;
  if (localSourceDir) {
    const filename = path.basename(new URL(sourceUrl).pathname);
    original = await fs.readFile(path.join(localSourceDir, `${eventId}${path.extname(filename)}`));
  } else {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new Error(`Teplohod image Event${eventId} returned HTTP ${response.status}`);
    }
    original = Buffer.from(await response.arrayBuffer());
  }

  const metadata = await sharp(original).metadata();
  const sha256 = crypto.createHash('sha256').update(original).digest('hex');
  if (sha256 !== expectedSha256) {
    throw new Error(`Teplohod image Event${eventId} changed; review the new source before updating its derivatives`);
  }
  const variants = [];

  for (const width of widths) {
    const filename = `event-${eventId}-${width}.webp`;
    const outputPath = path.join(outputDir, filename);
    await sharp(original)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75, effort: 5 })
      .toFile(outputPath);

    const outputMetadata = await sharp(outputPath).metadata();
    variants.push({
      filename,
      bytes: (await fs.stat(outputPath)).size,
      width: outputMetadata.width,
      height: outputMetadata.height,
    });
  }

  console.log(JSON.stringify({
    eventId,
    sourceUrl,
    sourceBytes: original.length,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    sourceSha256: sha256,
    variants,
  }));
}
