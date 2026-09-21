/**
 * Catalog listing image budget: `/_next/image` widths + quality for dense `/events`.
 * Supplier covers (esp. TC) go through the optimizer with `q=` in the URL.
 * Live q78 + 360px still looked soft on retina 4-col grids; q85 was prepared but
 * not yet on live - bump to q90 / 480px for a visible sharpen without 100vw.
 *
 * Keep CATALOG_IMAGE_QUALITY scoped to `/events` catalog grids.
 * Home / related / venue / hub cards use CARD_IMAGE_QUALITY.
 */

/** Catalog grid (`/events`) preview quality for `/_next/image` (TC CDN etc.). */
export const CATALOG_IMAGE_QUALITY = 90;

/** Default card quality outside the dense catalog grid (hub / PDP / home / related). */
export const CARD_IMAGE_QUALITY = 88;

/** City-hub / venue / `/events` zen poster rail: slightly sharper than generic cards. */
export const AFFICHE_IMAGE_QUALITY = 92;

/**
 * `/blog` listing cards (feed / home rail). Local `/images/blog` is unoptimized
 * (nginx alias) - quality mainly helps remote covers; still keep a lean budget.
 */
export const BLOG_LISTING_IMAGE_QUALITY = 70;

/**
 * Match `.catalog-card-grid` (2 / 3 / 4 cols).
 * Never `100vw` on mobile: that pulled 640-750px for a ~50vw tile.
 * Desktop cap 480px so 2x retina lands on w=828-1080, not undersized 640.
 */
export const CATALOG_EVENT_CARD_SIZES =
  '(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1535px) 25vw, 480px';

/** Horizontal list thumb (~14-16rem). */
export const CATALOG_EVENT_CARD_HORIZONTAL_SIZES = '(max-width: 639px) 100vw, 16rem';

/** Home / related / showcase cards: allow a larger decode than dense catalog. */
export const CARD_EVENT_SIZES =
  '(max-width: 639px) 92vw, (max-width: 1023px) 45vw, (max-width: 1535px) 30vw, 420px';

/**
 * Blog feed / home teaser tiles (1 / 2 / 3 col). Never `100vw` on mobile.
 */
export const BLOG_LISTING_CARD_SIZES =
  '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw';
