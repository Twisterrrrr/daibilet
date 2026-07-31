/**
 * Fixed city night-hero shell.
 * Shared by CityPageView SSR/hydrate and city loading skeleton so first HTML
 * and client paint claim the same height (no CLS jump).
 *
 * Heights are fixed (`h-*`), not `min-h-*`: content / font swap must not grow the box.
 * Image frame cap: city PNG ~1024px × 1.1, object-contain (no height upscale).
 * Ultrawide sides: narrow mirrored ~10% strips next to the photo (fade to transparent);
 * leftover viewport gutters are plain navy CSS - never stretch the mirror.
 */
export const CITY_NIGHT_HERO = {
  /** Brand night letterbox (navy, not purple). */
  navy: '#0b1220',
  /**
   * Capped hero image width (≈1024px × 1.1). Used in calcs for frame + mirror strips.
   * Keep in sync with imageFrame max-width.
   */
  imageWidth: 'min(100%, calc(1024px * 1.1))',
  /** Outer section: full-bleed navy; mirror strips stay next to the photo only. */
  section:
    'relative h-[280px] overflow-hidden border-b border-[#0b1220] bg-[#0b1220] sm:h-[320px] md:h-[360px]',
  /** Text + CTA column; fills fixed section height. Above media layer (z-0). */
  content: 'container-page relative z-[1] flex h-full min-h-0 flex-col justify-end py-8 sm:py-10',
  /** Centered image box ≤110% of ~1024px intrinsic width. */
  imageFrame:
    'absolute inset-y-0 left-1/2 z-[1] h-full w-[min(100%,calc(1024px*1.1))] max-w-[min(100%,calc(1024px*1.1))] -translate-x-1/2',
  imageSizes: '(max-width: 1126px) 100vw, 1126px',
  /**
   * Mirror strip = 10% of capped image width (NOT the leftover viewport gutter).
   * Wings sit immediately left/right of the photo; outside them navy CSS shows through.
   */
  sideMirrorWidth: 'calc(min(100%, calc(1024px * 1.1)) * 0.1)',
  /**
   * Left wing: flush to the left edge of the centered image frame.
   * `left = 50% - halfImage - mirrorWidth` = `50% - 0.6 * imageWidth`.
   */
  leftMirrorLeft: 'calc(50% - min(100%, calc(1024px * 1.1)) * 0.6)',
  /** Right wing: flush to the right edge of the centered image frame. */
  rightMirrorLeft: 'calc(50% + min(100%, calc(1024px * 1.1)) * 0.5)',
} as const;
