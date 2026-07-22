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

export async function supplierGet<T>(apiPath: string, supplierKey: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(supplierApiUrl(apiPath, supplierKey), {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
  }
  return body as T;
}
