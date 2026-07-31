/**
 * Fixed city night-hero shell (HERO3e).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same height (no CLS jump).
 *
 * Heights are fixed (`h-*`), not `min-h-*`: content / font swap must not grow the box.
 *
 * Desktop stacking (media z-0, content z-1):
 *  1. full-bleed leftGrad under everything (black left → navy at photo edge)
 *  2. photo frame at right-[20%] sized by section height (aspect), not viewport %
 *  3. right gutter w-[20%] (soft near photo → navy → black at section edge)
 *
 * Mobile: full-bleed photo + dense left overlay (unchanged readability).
 * Text/CTA stay left above media; no scrim over type.
 */
export const CITY_NIGHT_HERO = {
  /** Sample midnight navy (owner swatch; not teal-ish #050a12). */
  navy: '#000c2a',
  /** Mid stop toward black. */
  navyMid: '#010d2d',
  /** Deep black letterbox / left fill end. */
  navyDeep: '#000000',
  /** Outer section: full-bleed midnight; photo never stretches across ultrawide gutters. */
  section:
    'relative h-[280px] overflow-hidden border-b border-[#000c2a] bg-[#000] sm:h-[320px] md:h-[360px]',
  /** Text + CTA column; fills fixed section height. Above media layer (z-0). */
  content: 'container-page relative z-[1] flex h-full min-h-0 flex-col justify-end py-8 sm:py-10',
  /** Copy column: full width on mobile; left safe zone on md+ (photo + gutter own the right). */
  contentInner: 'w-full max-w-2xl md:max-w-[72%]',
  /**
   * Photo band: full-bleed cover on narrow screens;
   * from md - height-driven aspect box parked at right-[20%] (20% gutter empty to the right).
   * Never md:w-[20%] / right-0 - that collapses into a thin needle strip.
   */
  photoFrame:
    'absolute inset-0 md:inset-y-0 md:left-auto md:right-[20%] md:h-full md:w-auto md:aspect-[5/4] md:max-w-[min(48%,560px)]',
  imageSizes: '(max-width: 767px) 100vw, min(48vw, 560px)',
  /**
   * Desktop left fill: full-bleed under photo. Visible left of the opaque photo.
   * Black at left → navy at photo left edge (#000c2a).
   */
  leftFillDesktop: 'absolute inset-0 hidden md:block',
  fadeLeftDesktop:
    'linear-gradient(to right, #000000 0%, #000000 40%, #010d2d 75%, #000c2a 100%)',
  /** Mobile: denser left navy under copy; photo reads weaker through the fill. */
  fadeLeftMobile:
    'linear-gradient(to right, #000c2a 0%, #000000 42%, rgba(0,12,42,0.92) 68%, rgba(0,12,42,0.55) 85%, transparent 100%)',
  /**
   * Right gutter only (right:0; width 20%): from photo's right edge going right -
   * ~3.5% soft to transparent, then navy → black at section rim.
   */
  rightGutter: 'absolute inset-y-0 right-0 hidden w-[20%] md:block',
  fadeRightGutter:
    'linear-gradient(to right, transparent 0%, transparent 3.5%, #000c2a 12%, #000000 100%)',
} as const;
