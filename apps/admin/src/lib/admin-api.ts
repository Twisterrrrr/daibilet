/** Admin API base URL. Empty string = same origin (admin.daibilet.ru/api). */

export function resolveAdminApiBase(): string {

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('daibilet.ru')) {

    return '';

  }



  const fromEnv = (import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL;

  if (fromEnv != null && fromEnv !== '') return fromEnv.replace(/\/$/, '');

  return 'http://127.0.0.1:4000';

}



export const ADMIN_API_BASE = resolveAdminApiBase();



/** Build browser URL for legacy backend routes (/api/admin/*). */

export function adminApiUrl(apiPath: string): string {

  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

  if (!path.startsWith('/api/')) {

    throw new Error(`Admin API path must start with /api/: ${path}`);

  }



  if (!ADMIN_API_BASE) return path;

  // VITE_DAIBILET_API_URL=/api — path already includes /api prefix from site root.

  if (ADMIN_API_BASE === '/api') return path;



  return `${ADMIN_API_BASE.replace(/\/$/, '')}${path}`;

}



export function adminFetch(apiPath: string, init?: RequestInit): Promise<Response> {

  return fetch(adminApiUrl(apiPath), {

    credentials: 'same-origin',

    ...init,

  });

}


