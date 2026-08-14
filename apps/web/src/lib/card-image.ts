/**
 * Listing-card src for local `/images/*` (nginx alias, unoptimized SafeImage).
 * Prefer `-card.jpg`, then sibling `-thumb.jpg` (places pack d059f9c), then original.
 * PDP keeps the editorial path. Do not double-compress venue originals.
 */
const RASTER_EXT = /\.(jpg|jpeg|png)$/i;

function stripSidecar(src: string): string {
  return src
    .replace(/-card\.(jpg|jpeg|png)$/i, '.$1')
    .replace(/-thumb\.(jpg|jpeg|png)$/i, '.$1');
}

export function toCardImagePath(src: string): string {
  const value = src.trim();
  if (/-card\.(jpg|jpeg|png)$/i.test(value)) return value;
  const base = stripSidecar(value);
  return base.replace(RASTER_EXT, '-card.jpg');
}

export function toThumbImagePath(src: string): string {
  const value = src.trim();
  if (/-thumb\.(jpg|jpeg|png)$/i.test(value)) return value;
  const base = stripSidecar(value);
  return base.replace(RASTER_EXT, '-thumb.jpg');
}

/**
 * Ordered candidates: `-card.jpg` → `-thumb.jpg` → original.
 * Remote URLs and generated venue stubs stay as a single original.
 */
export function listingImageFallbacks(src: string | null | undefined): string[] {
  const value = String(src || '').trim();
  if (!value) return [];
  if (!value.startsWith('/images/')) return [value];
  if (value.includes('/venues/generated/')) return [value];
  if (!RASTER_EXT.test(value) && !/-(?:card|thumb)\.(jpg|jpeg|png)$/i.test(value)) {
    return [value];
  }
  const original = stripSidecar(value);
  const card = toCardImagePath(original);
  const thumb = toThumbImagePath(original);
  const out: string[] = [];
  for (const item of [card, thumb, original]) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}

/** First listing candidate (`-card.jpg`). Caller should fall through to thumb/original. */
export function resolveCardImage(src: string | null | undefined): string | null {
  const chain = listingImageFallbacks(src);
  return chain[0] || null;
}
