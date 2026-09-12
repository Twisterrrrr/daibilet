/**
 * Content fingerprints for remote covers (S3/CDN ETag).
 * Catches identical binaries under different basenames (common for Teplohod uploads).
 */

type CacheEntry = { fingerprint: string | null; expiresAt: number };

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 2500;
const DEFAULT_CONCURRENCY = 10;

const memoryCache = new Map<string, CacheEntry>();

function cacheKeyForUrl(imageUrl: string): string | null {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;
  if (raw.startsWith('/')) return null;
  if (!/^https?:\/\//i.test(raw)) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.port === '443' || parsed.port === '80') parsed.port = '';
    // Drop volatile query (signatures); path is the stable asset identity for HEAD.
    parsed.search = '';
    parsed.hash = '';
    return parsed.href.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeEtag(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/^W\//i, '').replace(/"/g, '').toLowerCase();
  return cleaned || null;
}

async function headFingerprint(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'image/*,*/*' },
      // Caller wraps in unstable_cache; avoid Next Data Cache per-URL HEAD entries.
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const etag = normalizeEtag(response.headers.get('etag'));
    if (etag) return `etag:${etag}`;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]!);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Resolve content fingerprints for session imageUrl values.
 * Returns Map keyed by the original imageUrl string from sessions.
 */
export async function resolveCoverContentFingerprints(
  imageUrls: Array<string | null | undefined>,
  options?: { concurrency?: number; timeoutMs?: number },
): Promise<Map<string, string>> {
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = Date.now();
  const result = new Map<string, string>();

  const unique = new Map<string, string>(); // cacheKey -> first original url
  for (const raw of imageUrls) {
    const url = String(raw || '').trim();
    if (!url) continue;
    const key = cacheKeyForUrl(url);
    if (!key) continue;
    if (!unique.has(key)) unique.set(key, url);
  }

  const pending: Array<{ cacheKey: string; url: string }> = [];
  for (const [cacheKey, url] of unique) {
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      if (cached.fingerprint) {
        // attach under every original that shares cacheKey - done in second pass
      }
      continue;
    }
    pending.push({ cacheKey, url });
  }

  if (pending.length) {
    await mapPool(pending, concurrency, async ({ cacheKey, url }) => {
      const fingerprint = await headFingerprint(url, timeoutMs);
      memoryCache.set(cacheKey, { fingerprint, expiresAt: now + CACHE_TTL_MS });
      return fingerprint;
    });
  }

  for (const raw of imageUrls) {
    const url = String(raw || '').trim();
    if (!url) continue;
    const key = cacheKeyForUrl(url);
    if (!key) continue;
    const cached = memoryCache.get(key);
    if (cached?.fingerprint) result.set(url, cached.fingerprint);
  }

  return result;
}
