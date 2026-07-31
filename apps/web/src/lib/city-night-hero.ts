/**
 * City night-hero shell (HERO3p: adaptive right gutter by breakpoint).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same shell (no CLS jump on short copy).
 *
 * Mobile: `min-h-*` + asymmetric `pt-16 pb-8` / `justify-center` so title has
 * ~2× air above (owner: top cramped after equal py); bottom stays comfortable.
 * Desktop (md+): fixed `h-[360px]` + `justify-end` letterbox (16:9 unchanged).
 *
 * Desktop stacking (media z-0, content z-1):
 *  1. leftGrad: deepen toward section LEFT rim; light `#122868` plateau at photo edge
 *  2. photo frame height-driven 16:9; gutter ladder:
 *       md 4% → lg 10% → xl 16% → 2xl 20%
 *     (mid flush-er; ultrawide keeps noticeable right air)
 *  3. soft navy↔transparent edge fade on photo (~15% L/R, md+ only - not CSS mask-image)
 *  4. right gutter matches photo right-%: light at photo → deepen toward section RIGHT rim
 *
 * Mobile: full-bleed photo (no L/R alpha mask) + dense left overlay for readability.
 * Text/CTA stay left above media; no scrim over type.
 *
 * Rollback (owner 2026-07-31): HERO3k/m `.city-hero-photo-mask` (~25→38% L/R) was too
 * wide and looked wrong on mobile. Keep light navy panels; keep pt-16 / mt-5 / 16:9;
 * do not restore hard md:right-[20%] on all md+ (2xl-only 20% is OK).
 */
export const CITY_NIGHT_HERO = {
  /**
   * Light navy base - photo-edge / section underlay.
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
   * Outer section: light navy base.
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
   * from md - height-driven 16:9 box with adaptive right gutter:
   *   md:  right-[4%]   (mid-width - no navy hole)
   *   lg:  right-[10%]
   *   xl:  right-[16%]
   *   2xl: right-[20%]  (ultrawide air; not hard md:20%)
   * Never md:w-[20%] / flush-only right-0 needle on all sizes.
   * Never aspect-[5/4] - HERO3e experiment; original landscape is 16:9.
   * No `.city-hero-photo-mask` - owner rejected wide alpha fade on photo.
   */
  photoFrame:
    'absolute inset-0 md:inset-y-0 md:left-auto md:right-[4%] md:h-full md:w-auto md:aspect-[16/9] md:max-w-[min(56%,640px)] lg:right-[10%] xl:right-[16%] 2xl:right-[20%]',
  imageSizes: '(max-width: 767px) 100vw, min(56vw, 640px)',
  /**
   * Soft left/right edge fade over the photo (md+ only).
   * Light navy overlay → transparent (~15% each side). Hidden on mobile so
   * full-bleed photo is not cut by L/R transparency.
   */
  photoEdgeFade:
    'city-hero-photo-edge-fade pointer-events-none absolute inset-0 z-[1] hidden md:block',
  fadePhotoEdges:
    'linear-gradient(to right, #122868 0%, rgba(18,40,104,0.78) 3%, rgba(18,40,104,0.35) 7%, rgba(18,40,104,0.1) 11%, transparent 15%, transparent 85%, rgba(18,40,104,0.1) 89%, rgba(18,40,104,0.35) 93%, rgba(18,40,104,0.78) 97%, #122868 100%)',
  /**
   * Desktop left fill: section left → photo left edge.
   * Deepen toward OUTER left rim; long light `#122868` plateau at photo seam.
   * right calc must track photoFrame right-% + max photo width.
   */
  leftFillDesktop:
    'absolute inset-y-0 left-0 hidden md:block md:right-[calc(4%+min(56%,640px))] lg:right-[calc(10%+min(56%,640px))] xl:right-[calc(16%+min(56%,640px))] 2xl:right-[calc(20%+min(56%,640px))]',
  fadeLeftDesktop:
    'linear-gradient(to right, #0a174b 0%, #0B1B48 20%, #0d1f5c 40%, #122868 58%, #122868 100%)',
  /** Mobile: denser left navy under copy; soft into photo (no near-black at seam). */
  fadeLeftMobile:
    'linear-gradient(to right, #122868 0%, #0d1f5c 38%, rgba(18,40,104,0.88) 66%, rgba(18,40,104,0.45) 84%, transparent 100%)',
  /**
   * Right gutter only (right:0; width matches photo right-%):
   * photo right edge → section right rim.
   * Soft into light navy at photo, then deepen toward outer rim (no `#000`).
   */
  rightGutter:
    'absolute inset-y-0 right-0 hidden w-[4%] md:block lg:w-[10%] xl:w-[16%] 2xl:w-[20%]',
  fadeRightGutter:
    'linear-gradient(to right, transparent 0%, rgba(18,40,104,0.35) 2%, #122868 6%, #122868 42%, #0d1f5c 68%, #0B1B48 86%, #0a174b 100%)',
} as const;
