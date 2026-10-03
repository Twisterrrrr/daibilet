import sharp from 'sharp';
import { DEFAULT_OG_IMAGE } from '../lib/seo-meta';

const ALLOWED_HOSTS = new Set([
  'daibilet.ru', 'www.daibilet.ru', 'staging.daibilet.ru',
  'ticketscloud-prod.storage.yandexcloud.net', 'ticketscloud-prod.storage.googleapis.com',
  's3.twcstorage.ru', 'api.teplohod.info',
]);
const MAX_BYTES = 5 * 1024 * 1024;
const cache = new Map<string, { until: number; value: Promise<string> }>();

function safeImageUrl(value: string): string | null {
  try {
    const url = new URL(value, DEFAULT_OG_IMAGE);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || !ALLOWED_HOSTS.has(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

async function probe(url: string, fetcher: typeof fetch): Promise<string> {
  try {
    // Do not follow unvalidated CDN redirects into private/internal hosts.
    // ISR pages may not perform no-store fetches during metadata rendering:
    // Next treats that as a static-to-dynamic transition and returns HTTP 500.
    const response = await fetcher(url, { redirect: 'error', next: { revalidate: 900 }, signal: AbortSignal.timeout(2000) });
    if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('image/') || Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body?.cancel();
      return DEFAULT_OG_IMAGE;
    }
    if (!response.body) return DEFAULT_OG_IMAGE;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) return DEFAULT_OG_IMAGE;
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    // Decode, not just HEAD: 200 text/error pages and corrupt image bodies are broken too.
    await sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000, failOn: 'warning' }).resize(1, 1).raw().toBuffer();
    return url;
  } catch { return DEFAULT_OG_IMAGE; }
}

/** Bounded cache/single-flight: at most 2s external I/O on an ISR miss. */
export async function resolveSsrOgImage(raw?: string | null, fetcher: typeof fetch = fetch): Promise<string> {
  if (!raw?.trim()) return DEFAULT_OG_IMAGE;
  const url = safeImageUrl(raw.trim());
  if (!url || url === DEFAULT_OG_IMAGE) return DEFAULT_OG_IMAGE;
  // Test fetchers deliberately bypass the process cache.
  if (fetcher !== fetch) return probe(url, fetcher);
  const hit = cache.get(url);
  if (hit && hit.until > Date.now()) return hit.value;
  if (cache.size >= 512) cache.delete(cache.keys().next().value!);
  const value = probe(url, fetcher);
  cache.set(url, { until: Date.now() + 15 * 60_000, value });
  return value;
}
