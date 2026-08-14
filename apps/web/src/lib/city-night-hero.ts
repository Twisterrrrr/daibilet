/**
 * City hub hero shell - Lovable full-bleed night photo + left navy mask (md+).
 * Shared by CityPageView and city loading skeleton so first HTML and client
 * paint claim the same shell (no CLS jump on short copy).
 *
 * Mobile: full-bleed photo + denser left overlay for readability.
 * Desktop: photo cover + left navy→transparent gradient under copy.
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
  /** Full-bleed cover photo (all breakpoints). */
  photoFrame: 'absolute inset-0',
  imageSizes: '100vw',
  /** Soft L/R photo edge fade - unused in full-bleed; kept for skeleton parity callers. */
  photoEdgeFade: 'pointer-events-none absolute inset-0 z-[1] hidden',
  fadePhotoEdges: 'none',
  /** Desktop left navy mask under copy. */
  leftFillDesktop:
    'absolute inset-y-0 left-0 hidden w-full max-w-[72%] md:block lg:max-w-[64%] xl:max-w-[58%]',
  fadeLeftDesktop:
    'linear-gradient(to right, #0a174b 0%, #0B1B48 18%, #0d1f5c 38%, rgba(18,40,104,0.82) 58%, rgba(18,40,104,0.35) 78%, transparent 100%)',
  /** Mobile: denser left navy under copy. */
  fadeLeftMobile:
    'linear-gradient(to right, #0a174b 0%, #0d1f5c 32%, rgba(18,40,104,0.88) 58%, rgba(18,40,104,0.4) 82%, transparent 100%)',
  rightGutter: 'absolute inset-y-0 right-0 hidden',
  fadeRightGutter: 'none',
} as const;
