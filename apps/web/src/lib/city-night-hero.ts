/**
 * Fixed city night-hero shell (HERO3c: golden-ratio, no side mirrors).
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same height (no CLS jump).
 *
 * Heights are fixed (`h-*`), not `min-h-*`: content / font swap must not grow the box.
 * Composition: navy base + left φ fade + right edge fade + photo on the right (~38.2%).
 * Text/CTA stay in the left safe zone (~55%); gradients live in z-0 under content (not a scrim over type).
 */
export const CITY_NIGHT_HERO = {
  /** Spec navy letterbox (not purple). */
  navy: '#050a12',
  /** Deep edge fade on the right. */
  navyDeep: '#010204',
  /** Outer section: full-bleed navy; photo never stretches across ultrawide gutters. */
  section:
    'relative h-[280px] overflow-hidden border-b border-[#050a12] bg-[#050a12] sm:h-[320px] md:h-[360px]',
  /** Text + CTA column; fills fixed section height. Above media layer (z-0). */
  content: 'container-page relative z-[1] flex h-full min-h-0 flex-col justify-end py-8 sm:py-10',
  /** Copy column: full width on mobile; ~55% golden safe zone from md. */
  contentInner: 'w-full max-w-2xl md:max-w-[55%]',
  /**
   * Photo band: full-bleed cover on narrow screens (strong left fade keeps type readable);
   * from md - right φ strip (~38.2% width), object-cover within the band.
   */
  photoFrame: 'absolute inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[38.2%]',
  imageSizes: '(max-width: 767px) 100vw, 38.2vw',
  /** Desktop left φ fade: solid navy through 38.2%, clear by 61.8%. */
  fadeLeftDesktop: 'linear-gradient(to right, #050a12 0%, #050a12 38.2%, transparent 61.8%)',
  /** Mobile: heavier navy under copy so cover photo cannot wash out title/CTA. */
  fadeLeftMobile:
    'linear-gradient(to right, #050a12 0%, #050a12 52%, rgba(5,10,18,0.85) 74%, transparent 100%)',
  /** Soft right-edge vignette. */
  fadeRight: 'linear-gradient(to left, #010204 0%, transparent 20%)',
} as const;
