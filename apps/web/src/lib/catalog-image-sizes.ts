/**
 * Catalog listing image budget: small `/_next/image` widths + moderate quality.
 * Supplier covers (esp. TC PNG) are often 1–3MB; catalog grid cards only need ~280–384px.
 *
 * Keep CATALOG_IMAGE_QUALITY scoped to `/events` catalog grids.
 * Home / related / venue / hub cards use CARD_IMAGE_QUALITY so they stay sharp.
 */

/** Catalog grid (`/events`) preview quality for `/_next/image`. */
export const CATALOG_IMAGE_QUALITY = 65;

/** Default card quality outside the dense catalog grid (hub / PDP / home / related). */
export const CARD_IMAGE_QUALITY = 85;

/** City-hub / venue poster rail: slightly sharper than generic cards. */
export const AFFICHE_IMAGE_QUALITY = 88;

/**
 * Match `.catalog-card-grid` (2 / 3 / 4 cols).
 * Never `100vw` on mobile: that pulled 640–750px for a ~50vw tile.
 */
export const CATALOG_EVENT_CARD_SIZES =
  '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1535px) 25vw, 280px';

/** Horizontal list thumb (~14–16rem). */
export const CATALOG_EVENT_CARD_HORIZONTAL_SIZES = '(max-width: 639px) 100vw, 16rem';

/** Home / related / showcase cards: allow a larger decode than dense catalog. */
export const CARD_EVENT_SIZES =
  '(max-width: 639px) 92vw, (max-width: 1023px) 45vw, (max-width: 1535px) 30vw, 420px';
