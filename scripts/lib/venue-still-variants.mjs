/**
 * Shared venue still variants: base + listing card + tiny thumb.
 * Prefer sharpness over aggressive KB targets — cards show large on retina.
 */
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

/**
 * @param {import('sharp').Sharp} sharp
 * @param {Buffer|string} input
 * @param {string} destDir
 * @param {string} stem
 */
export async function writeVenueStillVariants(sharp, input, destDir, stem) {
  const { base, card, thumb } = VENUE_STILL;
  // Read path to buffer first — sharp keeps file handles open on Windows.
  const source =
    typeof input === 'string' ? await import('node:fs/promises').then((fs) => fs.readFile(input)) : input;
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
