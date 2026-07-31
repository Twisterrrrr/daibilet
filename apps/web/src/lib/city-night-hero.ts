/**
 * City night-hero shell (HERO3k: real CSS mask-image on photo, not navy overlay).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same shell (no CLS jump on short copy).
 *
 * Mobile: `min-h-*` + asymmetric `pt-16 pb-8` / `justify-center` so title has
 * ~2× air above (owner: top cramped after equal py); bottom stays comfortable.
 * Desktop (md+): fixed `h-[360px]` + `justify-end` letterbox (16:9 / gutter unchanged).
 *
 * Desktop stacking (media z-0, content z-1):
 *  1. leftGrad panel ends at photo left edge (lighter navy mid → base at photo edge)
 *  2. photo frame at right-[20%] height-driven 16:9 (not 5:4 / not md:w-[20%] needle)
 *  3. `.city-hero-photo-mask` on photo wrapper (pixels → alpha 0 ~25–28% L/R)
 *  4. right gutter w-[20%] (soft ~7% → navy → slightly deeper navy at section rim)
 *
 * Mobile: full-bleed photo + same side mask + dense left overlay (readability).
 * Text/CTA stay left above media; no scrim over type.
 * Overlay navy on photo was rejected (seams remain) - mask only in globals.css.
 * Never slam edges to pure #000 - seams must stay blue (owner 2026-07-31).
 */
export const CITY_NIGHT_HERO = {
  /**
   * Lighter navy base (owner: `#0a174b` read almost black on screen).
   * Lifted toward `#0d1f5c` / `#122868` - same family, clearly blue.
   */
  navy: '#122868',
  /** Mid stop - still navy, not gray / not near-black. */
  navyMid: '#0d1f5c',
  /**
   * Deepest edge stop = owner photo-edge swatch `#0a174b`.
   * Never `#000` / `#000000` - black rims made L/R seams read as black.
   */
  navyDeep: '#0a174b',
  /**
   * Outer section: lighter navy base so mask alpha reveals blue (not black).
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
   * Desktop left fill: from section left to photo left edge
   * (`right = gutter 20% + photo max width`). Deep navy far left → base at photo edge.
   */
  leftFillDesktop:
    'absolute inset-y-0 left-0 hidden md:block md:right-[calc(20%+min(56%,640px))]',
  fadeLeftDesktop:
    'linear-gradient(to right, #0a174b 0%, #0d1f5c 32%, #122868 62%, #122868 100%)',
  /** Mobile: denser left navy under copy; photo reads weaker through the fill. */
  fadeLeftMobile:
    'linear-gradient(to right, #122868 0%, #0d1f5c 42%, rgba(18,40,104,0.92) 68%, rgba(18,40,104,0.55) 85%, transparent 100%)',
  /**
   * Right gutter only (right:0; width 20%): from photo's right edge going right -
   * soft into navy (~7%), then navy → slightly deeper navy at section rim (no #000).
   */
  rightGutter: 'absolute inset-y-0 right-0 hidden w-[20%] md:block',
  fadeRightGutter:
    'linear-gradient(to right, transparent 0%, rgba(18,40,104,0.4) 2.5%, #122868 7%, #122868 35%, #0d1f5c 65%, #0a174b 100%)',
} as const;
