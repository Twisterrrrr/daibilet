/**
 * Fixed city night-hero shell (HERO3f: restore 16:9 + navy fades from photo edges).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same height (no CLS jump).
 *
 * Heights are fixed (`h-*`), not `min-h-*`: content / font swap must not grow the box.
 *
 * Desktop stacking (media z-0, content z-1):
 *  1. leftGrad panel ends at photo left edge (navy at edge → black only at far left)
 *  2. photo frame at right-[20%] height-driven 16:9 (not 5:4 / not md:w-[20%] needle)
 *  3. right gutter w-[20%] (soft ~3–4% → navy → black at section rim)
 *
 * Mobile: full-bleed photo + dense left overlay (unchanged readability).
 * Text/CTA stay left above media; no scrim over type.
 */
export const CITY_NIGHT_HERO = {
  /** Sample midnight navy (owner swatch; not teal-ish #050a12). */
  navy: '#000c2a',
  /** Mid stop toward black. */
  navyMid: '#010d2d',
  /** Deep black letterbox / far-end fill. */
  navyDeep: '#000000',
  /**
   * Outer section: navy base (not flat black) so soft/right fades read as blue;
   * black appears only at gradient ends.
   */
  section:
    'relative h-[280px] overflow-hidden border-b border-[#000c2a] bg-[#000c2a] sm:h-[320px] md:h-[360px]',
  /** Text + CTA column; fills fixed section height. Above media layer (z-0). */
  content: 'container-page relative z-[1] flex h-full min-h-0 flex-col justify-end py-8 sm:py-10',
  /** Copy column: full width on mobile; left safe zone on md+ (photo + gutter own the right). */
  contentInner: 'w-full max-w-2xl md:max-w-[72%]',
  /**
   * Photo band: full-bleed cover on narrow screens;
   * from md - height-driven 16:9 box parked at right-[20%] (20% gutter empty to the right).
   * Never md:w-[20%] / right-0 - that collapses into a thin needle strip.
   * Never aspect-[5/4] - HERO3e experiment; original landscape is 16:9.
   */
  photoFrame:
    'absolute inset-0 md:inset-y-0 md:left-auto md:right-[20%] md:h-full md:w-auto md:aspect-[16/9] md:max-w-[min(56%,640px)]',
  imageSizes: '(max-width: 767px) 100vw, min(56vw, 640px)',
  /**
   * Desktop left fill: from section left to photo left edge
   * (`right = gutter 20% + photo max width`). Navy at photo edge → black only far left.
   */
  leftFillDesktop:
    'absolute inset-y-0 left-0 hidden md:block md:right-[calc(20%+min(56%,640px))]',
  fadeLeftDesktop:
    'linear-gradient(to right, #000000 0%, #010d2d 22%, #000c2a 48%, #000c2a 100%)',
  /** Mobile: denser left navy under copy; photo reads weaker through the fill. */
  fadeLeftMobile:
    'linear-gradient(to right, #000c2a 0%, #000000 42%, rgba(0,12,42,0.92) 68%, rgba(0,12,42,0.55) 85%, transparent 100%)',
  /**
   * Right gutter only (right:0; width 20%): from photo's right edge going right -
   * ~3.5% soft into navy, then navy → black at section rim.
   */
  rightGutter: 'absolute inset-y-0 right-0 hidden w-[20%] md:block',
  fadeRightGutter:
    'linear-gradient(to right, transparent 0%, #000c2a 3.5%, #000c2a 14%, #010d2d 45%, #000000 100%)',
} as const;
