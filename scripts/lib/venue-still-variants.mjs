/**
 * Shared venue still variants: base + listing card + tiny thumb.
 * Prefer sharpness over aggressive KB targets — cards show large on retina.
 */
import fs from 'node:fs/promises';

export const VENUE_STILL = {
  /** Editorial / PDP base */
  base: { width: 1600, height: 1067, quality: 86 },
  /**
   * Listing / hub card sidecar. ~2× CSS card width on retina (22rem ≈ 352px → ~700px).
   * Old pack was 640@q68 and looked soft when stretched.
   */
  card: { width: 960, quality: 82 },
  /** Nested rails / dense grids only */
  thumb: { width: 480, quality: 78 },
};

async function readSource(input) {
  if (typeof input === 'string') return fs.readFile(input);
  return input;
}

/**
 * Full install: rewrite base + card + thumb from a source still.
 * @param {import('sharp').Sharp} sharp
 * @param {Buffer|string} input
 * @param {string} destDir
 * @param {string} stem
 */
export async function writeVenueStillVariants(sharp, input, destDir, stem) {
  const { base, card, thumb } = VENUE_STILL;
  const source = await readSource(input);
  const buf = await sharp(source)
    .rotate()
    .resize(base.width, base.height, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: base.quality, mozjpeg: true })
    .toBuffer();

  await sharp(buf).jpeg({ quality: base.quality, mozjpeg: true }).toFile(`${destDir}/${stem}.jpg`);
  await sharp(buf)
    .resize(card.width, null, { withoutEnlargement: true })
    .jpeg({ quality: card.quality, mozjpeg: true })
    .toFile(`${destDir}/${stem}-card.jpg`);
  await sharp(buf)
    .resize(thumb.width, null, { withoutEnlargement: true })
    .jpeg({ quality: thumb.quality, mozjpeg: true })
    .toFile(`${destDir}/${stem}-thumb.jpg`);

  return buf;
}

/**
 * Rebuild listing sidecars only — keeps editorial base bytes intact.
 * @param {import('sharp').Sharp} sharp
 * @param {Buffer|string} input base `.jpg`
 * @param {string} destDir
 * @param {string} stem
 */
export async function writeVenueCardThumbSidecars(sharp, input, destDir, stem) {
  const { card, thumb } = VENUE_STILL;
  const source = await readSource(input);
  const rotated = await sharp(source).rotate().toBuffer();

  await sharp(rotated)
    .resize(card.width, null, { withoutEnlargement: true })
    .jpeg({ quality: card.quality, mozjpeg: true })
    .toFile(`${destDir}/${stem}-card.jpg`);
  await sharp(rotated)
    .resize(thumb.width, null, { withoutEnlargement: true })
    .jpeg({ quality: thumb.quality, mozjpeg: true })
    .toFile(`${destDir}/${stem}-thumb.jpg`);
}
