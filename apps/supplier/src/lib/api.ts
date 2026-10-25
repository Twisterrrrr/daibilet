export const SUPPLIER_ACCESS_TOKEN_STORAGE_KEY = 'daibilet_supplier_access_token';
export const SUPPLIER_ACCESS_TOKEN_UPDATED_EVENT = 'daibilet:supplier-access-token-updated';

let refreshAccessTokenPromise: Promise<string> | null = null;

export function resolveSupplierApiBase(): string {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('daibilet.ru')) {
    return '';
  }

  const fromEnv = (import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL;
  if (fromEnv != null && fromEnv !== '') return fromEnv.replace(/\/$/, '');
  return '';
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
  return supplierRequest<T>(apiPath, supplierKey, {
    method: 'GET',
    accessToken,
    signal,
  });
}

export async function supplierPost<T>(
  apiPath: string,
  body: unknown,
  accessToken?: string,
  supplierKey = '',
): Promise<T> {
  return supplierRequest<T>(apiPath, supplierKey, {
    method: 'POST',
    accessToken,
    body,
  });
}

export async function supplierPatch<T>(
  apiPath: string,
  body: unknown,
  accessToken?: string,
  supplierKey = '',
): Promise<T> {
  return supplierRequest<T>(apiPath, supplierKey, {
    method: 'PATCH',
    accessToken,
    body,
  });
}

export async function refreshSupplierAccessToken(): Promise<string> {
  if (refreshAccessTokenPromise) return refreshAccessTokenPromise;

  refreshAccessTokenPromise = (async () => {
    try {
      const response = await fetch(supplierApiUrl('/api/user/auth/refresh', ''), {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const payload = (await response.json().catch(() => null)) as { accessToken?: unknown } | null;
      const token = response.ok && typeof payload?.accessToken === 'string'
        ? payload.accessToken.trim()
        : '';
      writeStoredAccessToken(token);
      return token;
    } catch {
      writeStoredAccessToken('');
      return '';
    } finally {
      refreshAccessTokenPromise = null;
    }
  })();

  return refreshAccessTokenPromise;
}

export function subscribeSupplierAccessToken(listener: (accessToken: string) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handleUpdate = () => listener(readStoredAccessToken());
  window.addEventListener(SUPPLIER_ACCESS_TOKEN_UPDATED_EVENT, handleUpdate);
  return () => window.removeEventListener(SUPPLIER_ACCESS_TOKEN_UPDATED_EVENT, handleUpdate);
}

async function supplierRequest<T>(
  apiPath: string,
  supplierKey: string,
  options: {
    method: 'GET' | 'POST' | 'PATCH';
    accessToken?: string;
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const url = supplierApiUrl(apiPath, supplierKey);
  const serializedBody = options.method === 'GET' ? undefined : JSON.stringify(options.body ?? {});
  let token = options.accessToken || readStoredAccessToken();
  let response = await fetchSupplierRequest(url, options.method, token, serializedBody, options.signal);

  if (response.status === 401 && token && shouldRefreshSupplierRequest(apiPath)) {
    token = await refreshSupplierAccessToken();
    if (token) {
      response = await fetchSupplierRequest(url, options.method, token, serializedBody, options.signal);
    }
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatSupplierApiError(payload, response.status));
  }
  return payload as T;
}

function fetchSupplierRequest(
  url: string,
  method: 'GET' | 'POST' | 'PATCH',
  accessToken: string,
  body: string | undefined,
  signal: AbortSignal | undefined,
): Promise<Response> {
  return fetch(url, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(body != null ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body != null ? { body } : {}),
    ...(signal ? { signal } : {}),
  });
}

function shouldRefreshSupplierRequest(apiPath: string): boolean {
  return ![
    '/api/supplier/auth/login',
    '/api/supplier/auth/logout',
    '/api/user/auth/refresh',
  ].includes(apiPath.split('?')[0] || '');
}

function formatSupplierApiError(body: unknown, status: number): string {
  if (!body || typeof body !== 'object') return `HTTP ${status}`;
  const record = body as {
    message?: unknown;
    error?: unknown;
    issues?: Array<{ path?: unknown; message?: unknown }>;
  };
  if (typeof record.message === 'string' && record.message.trim()) return record.message.trim();
  if (record.error === 'validation_error' && Array.isArray(record.issues) && record.issues.length) {
    return record.issues
      .map((issue) => {
        const path = typeof issue.path === 'string' && issue.path ? issue.path : '?';
        const message = typeof issue.message === 'string' ? issue.message : 'invalid';
        return `${path}: ${message}`;
      })
      .join('; ');
  }
  if (typeof record.error === 'string' && record.error.trim() && record.error !== 'internal_error') {
    return record.error.trim();
  }
  return `HTTP ${status}`;
}

export function readStoredAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY) || '';
}

function writeStoredAccessToken(accessToken: string): void {
  if (typeof window === 'undefined') return;
  if (accessToken) window.localStorage.setItem(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY, accessToken);
  else window.localStorage.removeItem(SUPPLIER_ACCESS_TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event(SUPPLIER_ACCESS_TOKEN_UPDATED_EVENT));
}
