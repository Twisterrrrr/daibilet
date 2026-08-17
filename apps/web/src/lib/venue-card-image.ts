import { listingImageFallbacks } from './card-image';

/**
 * Catalog card covers for /places (and reused venue/location cards).
 *
 * `/images/*` is served unoptimized (nginx alias, INC.504.2) so next/image
 * `sizes` cannot shrink bytes. Sibling `-thumb.jpg` (~640px) is the card src;
 * PDP heroes keep the editorial path (capped ~1200px on disk).
 * Missing thumb: CardSafeImage / venueCardImageFallbacks fall through to
 * `-card` then the original file.
 */
const VENUE_IMAGE_EXT = /\.(jpe?g|webp|png)$/i;

function stripVenueSidecar(src: string): string {
  return src
    .replace(/-card\.(jpe?g|webp|png)$/i, '.$1')
    .replace(/-thumb\.(jpe?g|webp|png)$/i, '.$1');
}

export function venueCardImageUrl(src: string | null | undefined): string | null {
  const value = String(src || '').trim();
  if (!value) return null;
  if (!value.startsWith('/images/venues/')) return value;
  if (value.includes('/generated/')) return value;
  if (/-thumb\.(jpe?g|webp|png)$/i.test(value)) return value;
  if (!VENUE_IMAGE_EXT.test(value)) return value;
  return stripVenueSidecar(value).replace(VENUE_IMAGE_EXT, '-thumb.jpg');
}

/** Places cards: `-thumb` → `-card` → original. Remote / stubs stay a single URL. */
export function venueCardImageFallbacks(src: string | null | undefined): string[] {
  const mapped = venueCardImageUrl(src);
  return listingImageFallbacks(mapped, { prefer: 'thumb' });
}
