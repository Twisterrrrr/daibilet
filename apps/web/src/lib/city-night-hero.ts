/**
 * City hub hero shell - Lovable: night photo on the right + left navy.
 * Shared by CityPageView and city loading skeleton so first HTML and client
 * paint claim the same shell (no CLS jump on short copy).
 *
 * Mobile: full-width photo at reduced opacity + left navy overlay for copy.
 * Desktop: photo `md:w-[62%]` right-aligned with left mask fade into navy.
 * Equal py; leftover height split by justify-center.
 */
export const CITY_NIGHT_HERO = {
  navy: '#122868',
  navyMid: '#0d1f5c',
  navyDeep: '#0a174b',
  section:
    'relative min-h-[320px] overflow-hidden border-b border-[#0a174b] bg-[#0a174b] sm:min-h-[380px] md:min-h-[440px]',
  content:
    'relative z-[1] mx-auto flex w-full max-w-[1240px] flex-col justify-center px-4 py-10 sm:min-h-[380px] sm:px-6 sm:py-12 md:min-h-[440px] lg:px-8',
  contentInner: 'w-full max-w-2xl md:max-w-[560px] lg:max-w-[620px]',
  /** Lovable CityHero: right strip + md mask (solid → fade). */
  photoFrame:
    'absolute inset-y-0 right-0 h-full w-full opacity-70 md:w-[62%] md:opacity-100 md:[mask-image:linear-gradient(90deg,#000_45%,transparent_92%)] md:[-webkit-mask-image:linear-gradient(90deg,#000_45%,transparent_92%)]',
  imageSizes: '(min-width: 768px) 62vw, 100vw',
  /** Unused in right-strip layout; kept for skeleton parity callers. */
  photoEdgeFade: 'pointer-events-none absolute inset-0 z-[1] hidden',
  fadePhotoEdges: 'none',
  /** Desktop left is solid section navy (photo only covers right 62%). */
  leftFillDesktop: 'absolute inset-0 hidden',
  fadeLeftDesktop: 'none',
  /** Mobile: denser left navy under copy over full-bleed photo. */
  fadeLeftMobile:
    'linear-gradient(to right, #0a174b 0%, #0d1f5c 32%, rgba(18,40,104,0.88) 58%, rgba(18,40,104,0.4) 82%, transparent 100%)',
  rightGutter: 'absolute inset-y-0 right-0 hidden',
  fadeRightGutter: 'none',
} as const;
