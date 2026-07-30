export const SUPPLIER_ACCESS_TOKEN_STORAGE_KEY = 'daibilet_supplier_access_token';

export function resolveSupplierApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('daibilet.ru')) {
    return '';
  }

  const fromEnv = (import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL;
  if (fromEnv != null && fromEnv !== '') return fromEnv.replace(/\/$/, '');
  return 'http://127.0.0.1:4000';
}

export const SUPPLIER_API_BASE = resolveSupplierApiBase();

export function supplierApiUrl(apiPath: string, supplierKey: string): string {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (!path.startsWith('/api/')) {
    throw new Error(`Supplier API path must start with /api/: ${path}`);
  }

  const url = new URL(`${SUPPLIER_API_BASE || window.location.origin}${path}`);
  if (supplierKey.trim()) url.searchParams.set('supplier', supplierKey.trim());
  if (!SUPPLIER_API_BASE) return `${url.pathname}${url.search}`;
  return url.toString();
}

export async function supplierGet<T>(
  apiPath: string,
  supplierKey: string,
  signal?: AbortSignal,
  accessToken?: string,
): Promise<T> {
  const token = accessToken || readStoredAccessToken();
  const response = await fetch(supplierApiUrl(apiPath, supplierKey), {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
  }
  return body as T;
}

export async function supplierPost<T>(
  apiPath: string,
  body: unknown,
  accessToken?: string,
  supplierKey = '',
): Promise<T> {
  const token = accessToken || readStoredAccessToken();
  const response = await fetch(supplierApiUrl(apiPath, supplierKey), {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }
  return payload as T;
}

function readStoredAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY) || '';
}
