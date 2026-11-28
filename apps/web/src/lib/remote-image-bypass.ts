/**
 * Hosts where Next.js image optimizer must NOT fetch server-side.
 * MSK prod may have broken outbound HTTPS; browser still reaches CDNs directly.
 *
 * TicketsCloud / Yandex Object Storage: MSK egress OK (2026-08-20) - allow
 * `/_next/image?w=` so hub rails do not pull 2-4MB originals. Keep teplohod
 * on bypass until proven stable.
 */
const CLIENT_FETCH_HOST_SUFFIXES = [
  'teplohod.info',
  'twcstorage.ru',
  'googleapis.com',
  'amazonaws.com',
] as const;

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
    return CLIENT_FETCH_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}
