type TeplohodPdpImage = {
  fallback: string;
  srcSet: string;
};

const IMAGE_WIDTHS = [750, 1125, 1280, 1536] as const;

const CURATED_TEPLOHOD_IMAGES: Record<string, { eventId: string; sourceVersion: string }> = {
  '/images/cache/Events/Event51/4bf789e910-1.jpg': { eventId: '51', sourceVersion: 'd285345f' },
  '/images/cache/Events/Event1360/611db9f32d-1.jpg': { eventId: '1360', sourceVersion: '5b747728' },
  '/images/cache/Events/Event1332/049c6143f9-1.png': { eventId: '1332', sourceVersion: '0363a4f5' },
  '/images/cache/Events/Event1402/e90da1d111-1.jpg': { eventId: '1402', sourceVersion: 'ac3f4738' },
  '/images/cache/Events/Event605/abdb095b45-1.jpg': { eventId: '605', sourceVersion: 'f0ec09ed' },
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

  const image = CURATED_TEPLOHOD_IMAGES[url.pathname];
  if (!image) return null;

  const base = `/images/events/teplohod-pdp/event-${image.eventId}-${image.sourceVersion}`;
  return {
    fallback: `${base}-750.webp`,
    srcSet: IMAGE_WIDTHS.map((width) => `${base}-${width}.webp ${width}w`).join(', '),
  };
}
