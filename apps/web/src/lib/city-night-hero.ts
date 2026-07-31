/**
 * Fixed city night-hero shell.
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same height (no CLS jump).
 *
 * Heights are fixed (`h-*`), not `min-h-*`: content / font swap must not grow the box.
 * Image frame cap: city PNG ~1024px × 1.1, object-contain (no height upscale).
 * Ultrawide sides: mirrored ~10% edge strips stretched into gutters, faded to navy.
 */
export const CITY_NIGHT_HERO = {
  /** Brand night letterbox (navy, not purple). */
  navy: '#0b1220',
  /** Outer section: full-bleed dark letterbox around capped PNG. */
  section:
    'relative h-[280px] overflow-hidden border-b border-[#0b1220] bg-[#0b1220] sm:h-[320px] md:h-[360px]',
  /** Text + CTA column; fills fixed section height. */
  content: 'container-page relative z-[1] flex h-full min-h-0 flex-col justify-end py-8 sm:py-10',
  /** Centered image box ≤110% of ~1024px intrinsic width. */
  imageFrame:
    'absolute inset-y-0 left-1/2 z-[1] h-full w-[min(100%,calc(1024px*1.1))] max-w-[min(100%,calc(1024px*1.1))] -translate-x-1/2',
  imageSizes: '(max-width: 1126px) 100vw, 1126px',
  /**
   * Leftover beyond capped photo, half each side.
   * Used as inline `width` for mirror wings (0 when viewport ≤ cap).
   */
  sideGutterWidth: 'max(0px, calc((100% - min(100%, calc(1024px * 1.1))) / 2))',
} as const;
