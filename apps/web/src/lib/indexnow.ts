/**
 * IndexNow (Yandex + Bing-compatible) - notify search engines of changed URLs.
 * Secret: INDEXNOW_KEY (server-only, never NEXT_PUBLIC_).
 * Key file: https://{host}/{INDEXNOW_KEY}.txt
 */

const INDEXNOW_ENDPOINTS = [
  'https://yandex.com/indexnow',
  'https://api.indexnow.org/indexnow',
] as const;

/** Cap per POST - IndexNow allows 10k; we keep batches small to avoid spam. */
const MAX_URLS_PER_REQUEST = 64;

/** Coalesce bursts (catalog warm + article publish within seconds). */
const FLUSH_DEBOUNCE_MS = 2_000;

export type IndexNowResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  submitted?: number;
  endpoints?: Array<{ url: string; status: number | null; ok: boolean }>;
};

/** Curated deploy / post-warm set - NOT the full catalog. */
export const INDEXNOW_DEPLOY_PATHS: readonly string[] = [
  '/',
  '/events',
  '/blog',
  '/cities',
  '/cities/moscow',
  '/cities/sankt-peterburg',
  '/cities/kazan',
  '/cities/ekaterinburg',
  '/rechnye-progulki',
  '/rechnye-progulki/moscow',
  '/rechnye-progulki/saint-petersburg',
  '/stendap-i-yumor',
  '/stendap-i-yumor/moscow',
  '/stendap-i-yumor/saint-petersburg',
  '/avtobusnye-ekskursii',
  '/avtobusnye-ekskursii/moscow',
  '/peshie-ekskursii/saint-petersburg',
  '/zagorodnye-ekskursii/saint-petersburg',
  '/vystavki-i-muzei/moscow',
  '/ekskursii/kazan',
  '/progulki-po-krysham/saint-petersburg',
  '/podborki/na-vyhodnye',
  '/contacts',
];

let pendingUrls = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight: Promise<IndexNowResult> | null = null;

function getSiteUrl(): string {
  return (
    process.env.DAIBILET_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://daibilet.ru'
  ).replace(/\/$/, '');
}

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim() || '';
  if (!key) return null;
  // IndexNow: 8–128 hex/UUID chars; reject obvious garbage
  if (key.length < 8 || key.length > 128 || !/^[a-zA-Z0-9-]+$/.test(key)) {
    return null;
  }
  return key;
}

export function getIndexNowKeyLocation(siteUrl = getSiteUrl()): string | null {
  const key = getIndexNowKey();
  if (!key) return null;
  return `${siteUrl.replace(/\/$/, '')}/${key}.txt`;
}

export function pathsToAbsoluteUrls(
  paths: string[],
  siteUrl = getSiteUrl(),
): string[] {
  const base = siteUrl.replace(/\/$/, '');
  const host = safeHost(base);
  const out = new Set<string>();

  for (const raw of paths) {
    const value = String(raw || '').trim();
    if (!value) continue;

    let absolute: string;
    if (/^https?:\/\//i.test(value)) {
      absolute = value;
    } else {
      const path = value.startsWith('/') ? value : `/${value}`;
      // Skip API / internal / admin surfaces
      if (
        path.startsWith('/api/') ||
        path.startsWith('/admin') ||
        path.startsWith('/account') ||
        path.startsWith('/login')
      ) {
        continue;
      }
      absolute = `${base}${path === '/' ? '/' : path.replace(/\/+$/, '') || '/'}`;
    }

    try {
      const parsed = new URL(absolute);
      if (host && parsed.host !== host && parsed.host !== `www.${host}`) continue;
      if (parsed.pathname.startsWith('/api/')) continue;
      // Canonical: no trailing slash except root (site style)
      const pathname =
        parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
      out.add(`${parsed.protocol}//${parsed.host}${pathname}`);
    } catch {
      /* skip invalid */
    }
  }

  return [...out];
}

function safeHost(siteUrl: string): string | null {
  try {
    return new URL(siteUrl).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Queue URLs and flush after debounce. Fire-and-forget safe for revalidate hooks.
 */
export function scheduleIndexNowNotify(
  pathsOrUrls: string[],
  reason = 'manual',
): void {
  const urls = pathsToAbsoluteUrls(pathsOrUrls);
  if (!urls.length) return;
  for (const url of urls) pendingUrls.add(url);

  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushIndexNowQueue(reason);
  }, FLUSH_DEBOUNCE_MS);
}

export async function flushIndexNowQueue(reason = 'manual'): Promise<IndexNowResult> {
  if (flushInFlight) return flushInFlight;

  const batch = [...pendingUrls];
  pendingUrls = new Set();
  if (!batch.length) {
    return { ok: false, skipped: true, reason: 'empty_queue' };
  }

  flushInFlight = submitIndexNow(batch, reason).finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

/** Immediate submit (deploy hook / tests). Still capped per request. */
export async function submitIndexNow(
  pathsOrUrls: string[],
  reason = 'manual',
): Promise<IndexNowResult> {
  const key = getIndexNowKey();
  if (!key) {
    console.warn(`[indexnow] INDEXNOW_KEY missing - skip (${reason})`);
    return { ok: false, skipped: true, reason: 'missing_key' };
  }

  const siteUrl = getSiteUrl();
  const urls = pathsToAbsoluteUrls(pathsOrUrls, siteUrl).slice(0, MAX_URLS_PER_REQUEST);
  if (!urls.length) {
    return { ok: false, skipped: true, reason: 'no_urls' };
  }

  let host: string;
  try {
    host = new URL(siteUrl).host;
  } catch {
    return { ok: false, skipped: true, reason: 'bad_site_url' };
  }

  const keyLocation = `${siteUrl.replace(/\/$/, '')}/${key}.txt`;
  const body = JSON.stringify({
    host,
    key,
    keyLocation,
    urlList: urls,
  });

  const endpoints: IndexNowResult['endpoints'] = [];
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
        signal: AbortSignal.timeout(8_000),
      });
      // 200/202 accepted; 422 often key/host mismatch
      const ok = response.status === 200 || response.status === 202;
      endpoints.push({ url: endpoint, status: response.status, ok });
      if (!ok) {
        const text = await response.text().catch(() => '');
        console.warn(
          `[indexnow] ${endpoint} HTTP ${response.status} (${reason}):`,
          text.slice(0, 200),
        );
      }
    } catch (error) {
      endpoints.push({ url: endpoint, status: null, ok: false });
      console.warn(
        `[indexnow] ${endpoint} failed (${reason}):`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  const anyOk = endpoints.some((e) => e.ok);
  console.log(
    `[indexnow] ${anyOk ? 'OK' : 'FAIL'} (${reason}): ${urls.length} url(s)`,
    endpoints.map((e) => `${e.url}→${e.status ?? 'err'}`).join(' '),
  );

  return {
    ok: anyOk,
    submitted: urls.length,
    endpoints,
    reason,
  };
}

export function notifyIndexNowForPaths(
  paths: string[],
  reason = 'revalidate',
): void {
  scheduleIndexNowNotify(paths, reason);
}
