import { headers } from 'next/headers';

/**
 * Server-side admin API client (F4).
 * Calls backend on the same VPS; forwards browser Basic Auth and staff session.
 */
export function resolveAdminApiBase(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv =
    env.DAIBILET_ADMIN_API_URL || env.DAIBILET_API_INTERNAL_URL || env.DAIBILET_API_URL || '';
  if (fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '');
  return 'http://127.0.0.1:4000';
}

export async function adminApiFetch(apiPath: string, init?: RequestInit): Promise<Response> {
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  if (!path.startsWith('/api/')) {
    throw new Error(`Admin API path must start with /api/: ${path}`);
  }

  const base = resolveAdminApiBase();
  const incoming = await headers();
  const authorization = incoming.get('authorization');
  const cookie = incoming.get('cookie');
  const reqHeaders = new Headers(init?.headers);
  if (authorization && !reqHeaders.has('authorization')) {
    reqHeaders.set('authorization', authorization);
  }
  if (cookie && !reqHeaders.has('cookie')) {
    reqHeaders.set('cookie', cookie);
  }

  return fetch(`${base}${path}`, {
    ...init,
    headers: reqHeaders,
    cache: 'no-store',
  });
}
