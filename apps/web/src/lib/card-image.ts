/**
 * Listing-card src for local `/images/*` (nginx alias, unoptimized SafeImage).
 * Prefer `-card.jpg`, then sibling `-thumb.jpg` (places pack d059f9c), then original.
 * If the caller already points at `-thumb` / `-card`, keep that sidecar first
 * so `/places` does not 404 on a missing `-card` before hitting `-thumb`.
 * PDP keeps the editorial path. Do not double-compress venue originals.
 */
const RASTER_EXT = /\.(jpg|jpeg|png)$/i;

export type ListingImagePrefer = 'card' | 'thumb';

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

function detectPrefer(src: string, prefer?: ListingImagePrefer): ListingImagePrefer {
  if (prefer) return prefer;
  if (/-thumb\.(jpg|jpeg|png)$/i.test(src)) return 'thumb';
  return 'card';
}

/**
 * Ordered candidates: `-card.jpg` → `-thumb.jpg` → original (events).
 * When `src` is already `-thumb` (or `prefer: 'thumb'`), thumb goes first so
 * places cards fall through to original instead of a gradient on missing sidecar.
 * Remote URLs and generated venue stubs stay as a single original.
 */
export function listingImageFallbacks(
  src: string | null | undefined,
  options?: { prefer?: ListingImagePrefer },
): string[] {
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
  const ordered =
    detectPrefer(value, options?.prefer) === 'thumb'
      ? [thumb, card, original]
      : [card, thumb, original];
  const out: string[] = [];
  for (const item of ordered) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}

function blogOriginalPath(cover: string, slug: string): string {
  if (slug) return `/images/blog/${slug}.jpg`;
  return cover
    .replace(/-(?:og|card|thumb)\.(jpg|jpeg|png|webp)$/i, '.$1')
    .replace(/\.(webp)$/i, '.jpg');
}

function blogOgPath(cover: string, slug: string): string {
  if (slug) return `/images/blog/${slug}-og.jpg`;
  const original = blogOriginalPath(cover, '');
  return original.replace(/\/images\/blog\/([^/?#]+)\.(jpe?g|png|webp)$/i, '/images/blog/$1-og.jpg');
}

/**
 * `/blog` + home + hub teasers: `*-og.jpg` → `-card` → `-thumb` → original cover.
 * Missing sidecars 404 into the next candidate instead of an empty placeholder.
 */
export function blogListingImageFallbacks(input: {
  slug?: string | null;
  coverImageUrl?: string | null;
}): string[] {
  const slug = String(input.slug || '').trim();
  const cover = String(input.coverImageUrl || '').trim();
  const original = cover ? blogOriginalPath(cover, slug) : slug ? `/images/blog/${slug}.jpg` : '';
  if (!original && !cover) return [];
  if (cover && !cover.startsWith('/images/')) {
    const og = slug ? `/images/blog/${slug}-og.jpg` : '';
    return [og, cover].filter(Boolean);
  }
  const listingSrc = original.startsWith('/images/blog/') ? original : cover;
  const listing = listingImageFallbacks(listingSrc);
  const og = blogOgPath(listingSrc || cover, slug);
  const out: string[] = [];
  for (const item of [og, ...listing, cover]) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}

/** First listing candidate (`-card.jpg`, or `-thumb` when src already is a thumb). */
export function resolveCardImage(src: string | null | undefined): string | null {
  const chain = listingImageFallbacks(src);
  return chain[0] || null;
}
