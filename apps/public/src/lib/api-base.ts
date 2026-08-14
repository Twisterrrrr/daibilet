function resolveApiBaseUrl(): string {
  const fromEnv = (
    (import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'http://127.0.0.1:4000';
}

export const API_BASE_URL = resolveApiBaseUrl();