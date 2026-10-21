type TeplohodPdpImage = {
  fallback: string;
  srcSet: string;
};

const IMAGE_WIDTHS = [750, 1125, 1280, 1536] as const;

const CURATED_TEPLOHOD_IMAGES: Record<string, string> = {
  '/images/cache/Events/Event51/4bf789e910-1.jpg': '51',
  '/images/cache/Events/Event1360/611db9f32d-1.jpg': '1360',
  '/images/cache/Events/Event1332/049c6143f9-1.png': '1332',
  '/images/cache/Events/Event1402/e90da1d111-1.jpg': '1402',
  '/images/cache/Events/Event605/abdb095b45-1.jpg': '605',
};

/**
 * Match only the five source files whose byte-for-byte originals were measured
 * and converted to static WebP. Every other event keeps its existing image path.
 */
export function resolveTeplohodPdpImage(src: string): TeplohodPdpImage | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' || url.hostname !== 'cdn.teplohod.info') return null;

  const eventId = CURATED_TEPLOHOD_IMAGES[url.pathname];
  if (!eventId) return null;

  const base = `/images/events/teplohod-pdp/event-${eventId}`;
  return {
    fallback: `${base}-750.webp`,
    srcSet: IMAGE_WIDTHS.map((width) => `${base}-${width}.webp ${width}w`).join(', '),
  };
}
