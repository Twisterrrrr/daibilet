import sharp from 'sharp';
import { DEFAULT_OG_IMAGE } from '../lib/seo-meta';

const ALLOWED_HOSTS = new Set([
  'daibilet.ru', 'www.daibilet.ru', 'staging.daibilet.ru',
  'ticketscloud-prod.storage.yandexcloud.net', 'ticketscloud-prod.storage.googleapis.com',
  's3.twcstorage.ru', 'api.teplohod.info', 'cdn.teplohod.info',
]);
const MAX_BYTES = 12 * 1024 * 1024;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_IMAGE_PATH = '/og/event-image';

export function safeImageUrl(value: string): string | null {
  try {
    const url = new URL(value, DEFAULT_OG_IMAGE);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || !ALLOWED_HOSTS.has(url.hostname)) return null;
    if (url.pathname === OG_IMAGE_PATH) return null;
    return url.href;
  } catch { return null; }
}

function proxiedOgImageUrl(url: string): string {
  const output = new URL(OG_IMAGE_PATH, DEFAULT_OG_IMAGE);
  output.searchParams.set('source', url);
  return output.toString();
}

async function fetchImageBytes(url: string, fetcher: typeof fetch): Promise<Buffer | null> {
  try {
    const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('image/') || Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body?.cancel();
      return null;
    }
    if (!response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) return null;
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return Buffer.concat(chunks);
  } catch { return null; }
}

/**
 * Event/venue OG images are served through our own bounded JPEG transformer.
 * On-page images still use Next Image's responsive formats and cache separately.
 */
export async function resolveSsrOgImage(raw?: string | null): Promise<string> {
  if (!raw?.trim()) return DEFAULT_OG_IMAGE;
  const url = safeImageUrl(raw.trim());
  if (!url || url === DEFAULT_OG_IMAGE) return DEFAULT_OG_IMAGE;
  // Avoid downloading full provider images while rendering page metadata. The
  // public image route validates and converts them when a crawler requests OG.
  return proxiedOgImageUrl(url);
}

/** Fetch and convert an allowlisted provider image into a compact 1200x630 JPEG. */
export async function buildEventOgImage(source: string, fetcher: typeof fetch = fetch): Promise<Buffer | null> {
  const url = safeImageUrl(source);
  if (!url || url === DEFAULT_OG_IMAGE) return null;
  const input = await fetchImageBytes(url, fetcher);
  if (!input) return null;

  try {
    const image = sharp(input, { limitInputPixels: 40_000_000, failOn: 'warning' }).rotate();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) return null;
    const aspect = metadata.width / metadata.height;

    if (aspect >= 1.35) {
      return await image
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 82, mozjpeg: true, progressive: true })
        .toBuffer();
    }

    const background = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
      .blur(24)
      .modulate({ brightness: 0.58, saturation: 0.82 })
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toBuffer();
    const foreground = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(560, 590, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    return await sharp(background)
      .composite([{ input: foreground, gravity: 'centre' }])
      .jpeg({ quality: 82, mozjpeg: true, progressive: true })
      .toBuffer();
  } catch {
    return null;
  }
}
