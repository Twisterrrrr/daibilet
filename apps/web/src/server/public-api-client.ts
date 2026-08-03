import '@/lib/env';

const DEFAULT_TIMEOUT_MS = Number(process.env.DAIBILET_PUBLIC_API_TIMEOUT_MS || 3_000);

export type PublicApiSearchParams =
  | URLSearchParams
  | Record<string, string | number | boolean | string[] | null | undefined>;

export function resolvePublicApiBase(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv =
    env.DAIBILET_PUBLIC_API_INTERNAL_URL ||
    env.DAIBILET_API_INTERNAL_URL ||
    env.DAIBILET_API_URL ||
    '';
  return (fromEnv.trim() || 'http://127.0.0.1:4000').replace(/\/$/, '');
}

export function toPublicApiSearchParams(input?: PublicApiSearchParams | null): URLSearchParams {
  if (!input) return new URLSearchParams();
  if (input instanceof URLSearchParams) return new URLSearchParams(input);

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) params.append(key, item);
      }
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

export function buildPublicApiUrl(
  apiPath: string,
  searchParams?: PublicApiSearchParams | null,
): string {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (!path.startsWith('/api/public/') && path !== '/api/health') {
    throw new Error(`Public API path must start with /api/public/: ${path}`);
  }

  const url = new URL(`${resolvePublicApiBase()}${path}`);
  const params = toPublicApiSearchParams(searchParams);
  for (const [key, value] of params.entries()) url.searchParams.append(key, value);
  return url.toString();
}

/** AbortSignal.timeout / DOMException TimeoutError (code 23) / AbortError. */
export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; code?: number | string; message?: string };
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return true;
  if (err.code === 23 || err.code === 'TIMEOUT_ERR') return true;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('timeout') || msg.includes('aborted due to timeout');
}

function isProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPublicApiJson<T>(
  apiPath: string,
  options: {
    searchParams?: PublicApiSearchParams | null;
    timeoutMs?: number;
    notFoundAsNull?: boolean;
    /** Build-only retries (default 3 in production build, 0 at runtime). */
    retries?: number;
    retryDelayMs?: number;
  } = {},
): Promise<T> {
  const timeoutMs = Math.max(250, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const retries = options.retries ?? (isProductionBuildPhase() ? 3 : 0);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 500);
  const url = buildPublicApiUrl(apiPath, options.searchParams);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.warn(`[public-api] retry ${attempt}/${retries} ${apiPath}`);
      }
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'daibilet-web-ssr',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (options.notFoundAsNull && response.status === 404) return null as T;
      if (!response.ok) {
        throw new Error(`Public API ${apiPath} failed: HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (isTimeoutError(error) && attempt < retries) {
        await sleep(retryDelayMs * 2 ** attempt);
        continue;
      }
      break;
    }
  }

  throw lastError;
}
