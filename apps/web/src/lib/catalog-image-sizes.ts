/**
 * Catalog listing image budget: small `/_next/image` widths + moderate quality.
 * Supplier covers (esp. TC PNG) are often 1–3MB; cards only need ~280–384px.
 */

/** Catalog card preview quality for `/_next/image`. */
export const CATALOG_IMAGE_QUALITY = 65;

/**
 * Match `.catalog-card-grid` (2 / 3 / 4 cols).
 * Never `100vw` on mobile: that pulled 640–750px for a ~50vw tile.
 */
export const CATALOG_EVENT_CARD_SIZES =
  '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1535px) 25vw, 280px';

/** Horizontal list thumb (~14–16rem). */
export const CATALOG_EVENT_CARD_HORIZONTAL_SIZES = '(max-width: 639px) 100vw, 16rem';
