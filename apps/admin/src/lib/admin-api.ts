/** Admin API base URL. Empty string = same origin (admin.daibilet.ru/api). */
export function resolveAdminApiBase(): string {
  const fromEnv = (import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL;
  if (fromEnv != null && fromEnv !== '') return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('daibilet.ru')) return '';
  return 'http://127.0.0.1:4000';
}

export const ADMIN_API_BASE = resolveAdminApiBase();

export function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  const path = input.startsWith('/') ? input : `/${input}`;
  const url = ADMIN_API_BASE ? `${ADMIN_API_BASE}${path}` : path;
  return fetch(url, {
    credentials: 'same-origin',
    ...init,
  });
}
