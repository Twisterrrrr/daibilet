/**
 * City night-hero shell (HERO3m: light navy at photo seam, deepen toward rim).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same shell (no CLS jump on short copy).
 *
 * Mobile: `min-h-*` + asymmetric `pt-16 pb-8` / `justify-center` so title has
 * ~2× air above (owner: top cramped after equal py); bottom stays comfortable.
 * Desktop (md+): fixed `h-[360px]` + `justify-end` letterbox (16:9 / gutter unchanged).
 *
 * Desktop stacking (media z-0, content z-1):
 *  1. leftGrad: deepen toward section LEFT rim; light `#122868` plateau at photo edge
 *  2. photo frame at right-[20%] height-driven 16:9 (not 5:4 / not md:w-[20%] needle)
 *  3. `.city-hero-photo-mask` on photo wrapper (wider soft alpha ~38% L/R)
 *  4. right gutter w-[20%]: light at photo → deepen toward section RIGHT rim
 *
 * Mobile: full-bleed photo + same side mask + dense left overlay (readability).
 * Text/CTA stay left above media; no scrim over type.
 * Overlay navy on photo was rejected (seams remain) - mask only in globals.css.
 *
 * Canon (owner 2026-07-31 clarification after HERO3l):
 *  - Photo-edge seam = light blue (`#122868`), never near-black mid / `#000`.
 *  - Darker stops (`#0d1f5c`, `#0a174b`) only farther from the photo (outer rims).
 *  - HERO3l wrongly focused on outer rims; dirty band was at photo↔navy junction.
 */
export const CITY_NIGHT_HERO = {
  /**
   * Light navy base - photo-edge / section underlay under mask alpha.
   * Owner: `#0a174b` as full base read almost black next to the photo.
   */
  navy: '#122868',
  /** Mid deepen - use away from photo, not at the seam. */
  navyMid: '#0d1f5c',
  /**
   * Deepest stop for OUTER section rims only (not photo-edge).
   * Blue family (`#0a174b` / `#0B1B48`), never `#000` / `#050e28` at the seam.
   */
  navyDeep: '#0a174b',
  /**
   * Outer section: light navy so mask alpha reveals blue (not black) at photo edges.
   * Mobile/sm: min-height (can grow); md+: fixed height for 16:9 letterbox.
   */
  section:
    'relative min-h-[280px] overflow-hidden border-b border-[#122868] bg-[#122868] sm:min-h-[320px] md:h-[360px] md:min-h-[360px]',
  /**
   * Text + CTA column. Mobile: ~2× top vs former equal py; bottom comfortable.
   * md+: restore equal py-10 + fill fixed shell, justify-end.
   */
  content:
    'container-page relative z-[1] flex min-h-[280px] flex-col justify-center pt-16 pb-8 sm:min-h-[320px] sm:pt-20 sm:pb-10 md:h-full md:min-h-0 md:justify-end md:py-10',
  /** Copy column: full width on mobile; left safe zone on md+ (photo + gutter own the right). */
  contentInner: 'w-full max-w-2xl md:max-w-[72%]',
  /**
   * Photo band: full-bleed cover on narrow screens;
   * from md - height-driven 16:9 box parked at right-[20%] (20% gutter empty to the right).
   * Class `city-hero-photo-mask` (globals.css) applies real mask-image L/R alpha.
   * Never md:w-[20%] / right-0 - that collapses into a thin needle strip.
   * Never aspect-[5/4] - HERO3e experiment; original landscape is 16:9.
   */
  photoFrame:
    'city-hero-photo-mask absolute inset-0 md:inset-y-0 md:left-auto md:right-[20%] md:h-full md:w-auto md:aspect-[16/9] md:max-w-[min(56%,640px)]',
  imageSizes: '(max-width: 767px) 100vw, min(56vw, 640px)',
  /**
   * Desktop left fill: section left → photo left edge.
   * Deepen toward OUTER left rim; long light `#122868` plateau at photo seam.
   */
  leftFillDesktop:
    'absolute inset-y-0 left-0 hidden md:block md:right-[calc(20%+min(56%,640px))]',
  fadeLeftDesktop:
    'linear-gradient(to right, #0a174b 0%, #0B1B48 20%, #0d1f5c 40%, #122868 58%, #122868 100%)',
  /** Mobile: denser left navy under copy; soft into photo (no near-black at seam). */
  fadeLeftMobile:
    'linear-gradient(to right, #122868 0%, #0d1f5c 38%, rgba(18,40,104,0.88) 66%, rgba(18,40,104,0.45) 84%, transparent 100%)',
  /**
   * Right gutter only (right:0; width 20%): photo right edge → section right rim.
   * Soft into light navy at photo, then deepen toward outer rim (no `#000`).
   */
  rightGutter: 'absolute inset-y-0 right-0 hidden w-[20%] md:block',
  fadeRightGutter:
    'linear-gradient(to right, transparent 0%, rgba(18,40,104,0.35) 2%, #122868 6%, #122868 42%, #0d1f5c 68%, #0B1B48 86%, #0a174b 100%)',
} as const;
