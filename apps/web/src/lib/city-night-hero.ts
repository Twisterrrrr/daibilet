/**
 * City hub hero shell - Lovable MHTML (`perm-palette-perfection`):
 * night photo right + left navy from `--navy-deep` / `--gradient-hero`.
 *
 * Tokens (exact from Lovable :root):
 *   --navy-deep: oklch(21% .11 265) ≈ #0b1a4a / #08143a (owner swatch)
 *   --navy: oklch(29% .13 264)
 *   --navy-foreground: oklch(98% .006 250)
 *   --gradient-hero: 100deg navy-deep → navy → primary mix
 *
 * Mobile: full-width photo at reduced opacity + left navy overlay for copy.
 * Desktop: photo `md:w-[62%]` + hero-surface mask fade into navy.
 * Equal py; leftover height split by justify-center.
 */
export const CITY_NIGHT_HERO = {
  /** Lovable `--navy` */
  navy: 'oklch(29% 0.13 264)',
  /** Mid stop between deep and navy (mobile fade). */
  navyMid: 'oklch(25% 0.12 264.5)',
  /** Lovable `--navy-deep` (owner perceptual ~#0b1a4a / #08143a). */
  navyDeep: 'oklch(21% 0.11 265)',
  /** Hex aliases for smoke / docs (not used as live fill when CSS vars apply). */
  navyDeepHex: '#0b1a4a',
  navyHex: '#0d2268',
  section:
    'relative min-h-[320px] overflow-hidden border-b border-[color:var(--navy-deep)] bg-[color:var(--navy-deep)] hero-surface sm:min-h-[380px] md:min-h-[440px]',
  content:
    'container-page relative z-[1] flex flex-col justify-center py-10 sm:min-h-[380px] sm:py-12 md:min-h-[440px]',
  contentInner: 'w-full max-w-2xl text-navy-foreground md:max-w-[560px] lg:max-w-[620px]',
  /** Lovable CityHero: right strip; mask lives on hero-surface overlay, not the photo. */
  photoFrame:
    'absolute inset-y-0 right-0 z-0 h-full w-full opacity-70 md:w-[62%] md:opacity-100',
  /** Lovable: absolute inset-0 hero-surface opacity-95 + md mask. */
  surfaceOverlay:
    'pointer-events-none absolute inset-0 z-[1] hero-surface opacity-95 md:[mask-image:linear-gradient(90deg,#000_45%,transparent_92%)] md:[-webkit-mask-image:linear-gradient(90deg,#000_45%,transparent_92%)]',
  imageSizes: '(min-width: 768px) 62vw, 100vw',
  /** Unused in right-strip layout; kept for skeleton parity callers. */
  photoEdgeFade: 'pointer-events-none absolute inset-0 z-[1] hidden',
  fadePhotoEdges: 'none',
  /** Desktop left is hero-surface overlay (photo only covers right 62%). */
  leftFillDesktop: 'absolute inset-0 hidden',
  fadeLeftDesktop: 'none',
  /** Mobile: denser left navy under copy over full-bleed photo. */
  fadeLeftMobile:
    'linear-gradient(to right, oklch(21% 0.11 265) 0%, oklch(25% 0.12 264.5) 32%, oklch(29% 0.13 264 / 0.88) 58%, oklch(29% 0.13 264 / 0.4) 82%, transparent 100%)',
  rightGutter: 'absolute inset-y-0 right-0 hidden',
  fadeRightGutter: 'none',
} as const;
