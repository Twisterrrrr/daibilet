/**
 * Fixed city night-hero shell (HERO3d: ~20% right photo, no side mirrors).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same height (no CLS jump).
 *
 * Heights are fixed (`h-*`), not `min-h-*`: content / font swap must not grow the box.
 * Composition (3 layers): midnight base + opaque left fill (80%) + photo right (~20%)
 * + right-edge soft (3–4% → transparent, then navy→black).
 * Text/CTA stay left above media (z-[1]); gradients live in z-0 (not a scrim over type).
 */
export const CITY_NIGHT_HERO = {
  /** Sample midnight navy (owner swatch; not teal-ish #050a12). */
  navy: '#000c2a',
  /** Mid stop toward black on the right vignette. */
  navyMid: '#010d2d',
  /** Deep black letterbox / left fill end. */
  navyDeep: '#000000',
  /** Outer section: full-bleed midnight; photo never stretches across ultrawide gutters. */
  section:
    'relative h-[280px] overflow-hidden border-b border-[#000c2a] bg-[#000c2a] sm:h-[320px] md:h-[360px]',
  /** Text + CTA column; fills fixed section height. Above media layer (z-0). */
  content: 'container-page relative z-[1] flex h-full min-h-0 flex-col justify-end py-8 sm:py-10',
  /** Copy column: full width on mobile; left safe zone on md+ (photo owns right ~20%). */
  contentInner: 'w-full max-w-2xl md:max-w-[72%]',
  /**
   * Photo band: full-bleed cover on narrow screens (dense left fill keeps type readable);
   * from md - right strip (~20% width), object-cover within the band.
   */
  photoFrame: 'absolute inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[20%]',
  imageSizes: '(max-width: 767px) 100vw, 20vw',
  /**
   * Desktop left fill panel (80%): opaque navy→black, hard edge at photo.
   * No soft transparency into the image.
   */
  leftFillDesktop: 'absolute inset-y-0 left-0 hidden w-[80%] md:block',
  fadeLeftDesktop: 'linear-gradient(to right, #000c2a 0%, #010d2d 55%, #000000 100%)',
  /** Mobile: denser left navy under copy; photo reads weaker through the fill. */
  fadeLeftMobile:
    'linear-gradient(to right, #000c2a 0%, #000000 42%, rgba(0,12,42,0.92) 68%, rgba(0,12,42,0.55) 85%, transparent 100%)',
  /**
   * Right edge of photo / viewport: ~3.5% soft to transparent, then navy→black at the rim.
   * (to left = from right edge inward.)
   */
  fadeRight:
    'linear-gradient(to left, #000000 0%, #010d2d 1%, #000c2a 2%, transparent 3.5%)',
} as const;
