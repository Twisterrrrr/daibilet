import { listingImageFallbacks } from './card-image';

/**
 * Catalog card covers for /places (and reused venue/location cards).
 *
 * `/images/*` is served unoptimized (nginx alias) so next/image `sizes` cannot
 * shrink bytes. Prefer `-card.jpg` (listing size), then original, then `-thumb`
 * as last resort. Never put mushy 320px thumbs first on large cards.
 * PDP heroes keep the editorial path.
 */
const VENUE_IMAGE_EXT = /\.(jpe?g|webp|png)$/i;

function stripVenueSidecar(src: string): string {
  return src
    .replace(/-card\.(jpe?g|webp|png)$/i, '.$1')
    .replace(/-thumb\.(jpe?g|webp|png)$/i, '.$1');
}

/** Primary listing src: sibling `-card.jpg` (not `-thumb`). */
export function venueCardImageUrl(src: string | null | undefined): string | null {
  const value = String(src || '').trim();
  if (!value) return null;
  if (!value.startsWith('/images/venues/')) return value;
  if (value.includes('/generated/')) return value;
  if (/-card\.(jpe?g|webp|png)$/i.test(value)) return value;
  if (/-thumb\.(jpe?g|webp|png)$/i.test(value)) return value;
  if (!VENUE_IMAGE_EXT.test(value)) return value;
  return stripVenueSidecar(value).replace(VENUE_IMAGE_EXT, '-card.jpg');
}

/**
 * Places cards: `-card` → original → `-thumb`.
 * If src is already a thumb (nested rail), keep thumb-first fallthrough.
 */
export function venueCardImageFallbacks(src: string | null | undefined): string[] {
  const value = String(src || '').trim();
  if (!value) return [];
  if (!value.startsWith('/images/venues/') || value.includes('/generated/')) {
    return listingImageFallbacks(value);
  }
  if (/-thumb\.(jpe?g|webp|png)$/i.test(value)) {
    return listingImageFallbacks(value, { prefer: 'thumb' });
  }

  const original = stripVenueSidecar(value);
  const card = original.replace(VENUE_IMAGE_EXT, '-card.jpg');
  const thumb = original.replace(VENUE_IMAGE_EXT, '-thumb.jpg');
  const ordered = [card, original, thumb];
  const out: string[] = [];
  for (const item of ordered) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}
