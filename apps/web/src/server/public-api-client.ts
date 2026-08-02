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

export async function fetchPublicApiJson<T>(
  apiPath: string,
  options: {
    searchParams?: PublicApiSearchParams | null;
    timeoutMs?: number;
    notFoundAsNull?: boolean;
  } = {},
): Promise<T> {
  const timeoutMs = Math.max(250, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const response = await fetch(buildPublicApiUrl(apiPath, options.searchParams), {
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
}
