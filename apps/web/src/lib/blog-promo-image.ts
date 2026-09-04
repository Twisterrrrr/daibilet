/** Min width/height ratio to treat cover as landscape for horizontal promo banners. */
export const HORIZONTAL_PROMO_MIN_RATIO = 1.15;

/**
 * Best-effort WxH from CDN filename or query string.
 * Returns null when dimensions are unknown (client may probe natural size).
 */
export function parseImageDimensionsFromUrl(
  imageUrl?: string | null,
): { width: number; height: number } | null {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;

  const match = raw.match(/(\d{3,4})x(\d{3,4})/i);
  if (match) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width > 0 && height > 0) return { width, height };
  }

  try {
    const parsed = new URL(raw, 'https://daibilet.ru');
    const w = Number(parsed.searchParams.get('width') || parsed.searchParams.get('w'));
    const h = Number(parsed.searchParams.get('height') || parsed.searchParams.get('h'));
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    /* ignore */
  }

  return null;
}

/** True = landscape, false = portrait/square, null = unknown. */
export function isLandscapePromoImageUrl(imageUrl?: string | null): boolean | null {
  const dims = parseImageDimensionsFromUrl(imageUrl);
  if (!dims) return null;
  return dims.width / dims.height >= HORIZONTAL_PROMO_MIN_RATIO;
}

/**
 * Pick image for a horizontal feed promo.
 * Event promos always use the event cover when available — object-cover crops portrait art.
 */
export function resolveHorizontalFeedPromoImage(input: {
  kind: 'city' | 'landing' | 'event';
  cityImageUrl: string | null;
  eventImageUrl?: string | null;
  fallback: string;
}): { src: string; probeEventCover: boolean } {
  const city = input.cityImageUrl?.trim() || input.fallback;
  if (input.kind !== 'event') {
    return { src: city, probeEventCover: false };
  }

  const eventUrl = input.eventImageUrl?.trim();
  if (!eventUrl) return { src: city, probeEventCover: false };
  return { src: eventUrl, probeEventCover: false };
}
