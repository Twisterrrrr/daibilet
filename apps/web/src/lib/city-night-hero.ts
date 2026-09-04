/**
 * City hub hero shell - match Lovable MHTML (`perm-palette-perfection` CityHero):
 * full-bleed section `hero-surface` + photo right + same-surface overlay with soft mask.
 *
 * Do NOT nest overlay inside a left-offset mediaShell: double-stacking the gradient
 * only inside the shell creates a hard black vertical seam (owner screenshot 2026-08-15).
 *
 * Ultrawide (owner 2026-08-24): %-based mask `#000 45% → transparent 92%` pinned the
 * clear photo to a thin far-right strip. Mask is content-anchored via
 * `.city-hero-surface-mask` (min(rem, %)) so the fade sits near the copy column.
 *
 * Tokens (Lovable :root):
 *   --navy-deep / --navy / --navy-foreground / --gradient-hero
 */
export const CITY_NIGHT_HERO = {
  /** Lovable `--navy` */
  navy: 'oklch(29% 0.13 264)',
  /** Mid stop between deep and navy (legacy mobile fade; unused when matching Lovable). */
  navyMid: 'oklch(25% 0.12 264.5)',
  /** Lovable `--navy-deep` (owner perceptual ~#0b1a4a / #08143a). */
  navyDeep: 'oklch(21% 0.11 265)',
  navyDeepHex: '#0b1a4a',
  navyHex: '#0d2268',
  /** Section fill = --gradient-hero only (no flat navy-deep underpaint). */
  section:
    'relative min-h-[320px] overflow-hidden border-b border-[color:var(--navy-deep)] hero-surface sm:min-h-[380px] md:min-h-[440px] xl:min-h-[500px] 2xl:min-h-[540px]',
  content:
    'container-page relative z-[1] flex flex-col justify-center py-10 sm:min-h-[380px] sm:py-12 md:min-h-[440px] xl:min-h-[500px] 2xl:min-h-[540px]',
  contentInner: 'w-full max-w-2xl text-navy-foreground md:max-w-[560px] lg:max-w-[620px]',
  /** Full-bleed track (Lovable: photo + overlay are direct section children). */
  mediaShell: 'pointer-events-none absolute inset-0 z-0 h-full overflow-hidden',
  /** Photo right: wider on xl+ so ultrawide still reads as a photo plane, not a gutter strip. */
  photoFrame:
    'absolute inset-y-0 right-0 z-0 h-full w-full opacity-70 md:w-[62%] md:opacity-100 xl:w-[70%] 2xl:w-[74%]',
  /**
   * Overlay uses `.city-hero-surface-mask` (globals.css) - content-anchored fade.
   * Do not revive %-only 45%/92% mask: it collapses the photo on ultrawide.
   */
  surfaceOverlay:
    'pointer-events-none absolute inset-0 z-[1] hero-surface opacity-95 city-hero-surface-mask',
  imageSizes: '(min-width: 1536px) 74vw, (min-width: 1280px) 70vw, (min-width: 768px) 62vw, 100vw',
  photoEdgeFade: 'pointer-events-none absolute inset-0 z-[1] hidden',
  fadePhotoEdges: 'none',
  leftFillDesktop: 'absolute inset-0 hidden',
  fadeLeftDesktop: 'none',
  /**
   * No extra mobile navy wash - Lovable relies on photo opacity-70 + full overlay.
   * A second left gradient made the hero look like a black slab.
   */
  fadeLeftMobile: 'none',
  rightGutter: 'absolute inset-y-0 right-0 hidden',
  fadeRightGutter: 'none',
} as const;
