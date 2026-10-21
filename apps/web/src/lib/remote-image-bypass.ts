/**
 * Hosts where Next.js image optimizer must NOT fetch server-side.
 * MSK prod may have broken outbound HTTPS; browser still reaches CDNs directly.
 *
 * TicketsCloud / Yandex Object Storage: MSK egress OK (2026-08-20) - allow
 * `/_next/image?w=` so hub rails do not pull 2-4MB originals. Keep teplohod
 * on bypass until proven stable (env TEPLOHOD_IMAGE_OPTIMIZE=true overrides).
 */
const CLIENT_FETCH_HOST_SUFFIXES = [
  'twcstorage.ru',
  'googleapis.com',
  'amazonaws.com',
] as const;

/** Teplohod CDN host — bypass by default, optimizable when flag is set. */
const TEPLOHOD_HOST_SUFFIXES = ['teplohod.info'] as const;

/** Env flag: enable Next.js optimizer for Teplohod CDN images (WebP). */
export function isTeplohodImageOptimizeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TEPLOHOD_IMAGE_OPTIMIZE === 'true';
}

/** Local nginx alias on prod - never route via /_next/image. */
export function isLocalStaticImageUrl(src: string): boolean {
  return src.startsWith('/images/');
}

/**
 * Remote CDN URLs: render unoptimized so browser fetches directly (no /_next/image proxy).
 */
export function shouldBypassNextImageOptimizer(src: string): boolean {
  if (isLocalStaticImageUrl(src)) return true;

  try {
    const url = new URL(src, 'https://daibilet.ru');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    const host = url.hostname.toLowerCase();

    // Teplohod: bypass unless explicitly enabled via env flag.
    if (TEPLOHOD_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
      if (!isTeplohodImageOptimizeEnabled()) return true;
      return false; // allow optimizer (WebP generation)
    }

    return CLIENT_FETCH_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}
