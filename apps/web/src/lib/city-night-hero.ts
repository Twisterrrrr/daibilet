/**
 * City night-hero shell (HERO3g navy + mobile equal py).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same shell (no CLS jump on short copy).
 *
 * Mobile: `min-h-*` + equal `py-8` / `justify-center` so top/bottom padding stay
 * symmetric when title+lead+stats+CTAs are tall (section grows; no bottom crush).
 * Desktop (md+): fixed `h-[360px]` + `justify-end` letterbox (16:9 / gutter unchanged).
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
  /**
   * Owner swatch (sampled photo-edge navy ≈ #0a174b / #0B194B).
   * Not near-black #000c2a - that read as flat black on screen.
   */
  navy: '#0a174b',
  /** Mid stop toward black (still blue-tinted). */
  navyMid: '#050e28',
  /** Deep black letterbox / far-end fill. */
  navyDeep: '#000000',
  /**
   * Outer section: navy base (not flat black) so soft/right fades read as blue;
   * black appears only at gradient ends.
   * Mobile/sm: min-height (can grow); md+: fixed height for 16:9 letterbox.
   */
  section:
    'relative min-h-[280px] overflow-hidden border-b border-[#0a174b] bg-[#0a174b] sm:min-h-[320px] md:h-[360px] md:min-h-[360px]',
  /**
   * Text + CTA column. Equal py always.
   * Mobile: min-h + justify-center (symmetric); md+: fill fixed shell, justify-end.
   */
  content:
    'container-page relative z-[1] flex min-h-[280px] flex-col justify-center py-8 sm:min-h-[320px] sm:py-10 md:h-full md:min-h-0 md:justify-end',
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
    'linear-gradient(to right, #000000 0%, #050e28 30%, #0a174b 58%, #0a174b 100%)',
  /** Mobile: denser left navy under copy; photo reads weaker through the fill. */
  fadeLeftMobile:
    'linear-gradient(to right, #0a174b 0%, #000000 42%, rgba(10,23,75,0.92) 68%, rgba(10,23,75,0.55) 85%, transparent 100%)',
  /**
   * Right gutter only (right:0; width 20%): from photo's right edge going right -
   * ~3.5% soft into navy, then navy → black at section rim.
   */
  rightGutter: 'absolute inset-y-0 right-0 hidden w-[20%] md:block',
  fadeRightGutter:
    'linear-gradient(to right, transparent 0%, #0a174b 3.5%, #0a174b 18%, #050e28 48%, #000000 100%)',
} as const;
