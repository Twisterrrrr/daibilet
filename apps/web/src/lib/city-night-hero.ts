/**
 * City hub hero shell - match Lovable MHTML (`perm-palette-perfection` CityHero):
 * full-bleed section `hero-surface` + photo right 62% + same-surface overlay with soft mask.
 *
 * Do NOT nest overlay inside a left-offset mediaShell: double-stacking the gradient
 * only inside the shell creates a hard black vertical seam (owner screenshot 2026-08-15).
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
    'relative min-h-[320px] overflow-hidden border-b border-[color:var(--navy-deep)] hero-surface sm:min-h-[380px] md:min-h-[440px]',
  content:
    'container-page relative z-[1] flex flex-col justify-center py-10 sm:min-h-[380px] sm:py-12 md:min-h-[440px]',
  contentInner: 'w-full max-w-2xl text-navy-foreground md:max-w-[560px] lg:max-w-[620px]',
  /** Full-bleed track (Lovable: photo + overlay are direct section children). */
  mediaShell: 'pointer-events-none absolute inset-0 z-0 h-full overflow-hidden',
  /** Lovable: absolute inset-y-0 right-0 w-full md:w-[62%], opacity-70 → md:opacity-100. */
  photoFrame:
    'absolute inset-y-0 right-0 z-0 h-full w-full opacity-70 md:w-[62%] md:opacity-100',
  /**
   * Lovable: absolute inset-0 hero-surface opacity-95 + md mask fade into photo.
   * Mask is on the overlay only - one gradient stack across the full section.
   */
  surfaceOverlay:
    'pointer-events-none absolute inset-0 z-[1] hero-surface opacity-95 md:[mask-image:linear-gradient(90deg,#000_45%,transparent_92%)] md:[-webkit-mask-image:linear-gradient(90deg,#000_45%,transparent_92%)]',
  imageSizes: '(min-width: 768px) 62vw, 100vw',
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
