import { API_BASE_URL } from '@/lib/api-base';

async function fetchUserApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(String((payload as { error?: string }).error || `HTTP ${response.status}`));
  }
  return payload;
}

export type SiteUserProfile = {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
};

export function userLogin(data: { email: string; password: string }) {
  return fetchUserApi<{ accessToken: string }>('/api/user/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function userRegister(data: { email: string; password: string; name: string }) {
  return fetchUserApi<{ accessToken: string }>('/api/user/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function userRefresh() {
  return fetchUserApi<{ accessToken: string | null }>('/api/user/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function userLogout(token: string) {
  return fetchUserApi<{ ok: boolean }>('/api/user/auth/logout', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export function userMe(token: string) {
  return fetchUserApi<SiteUserProfile>('/api/user/auth/me', {
    headers: { authorization: `Bearer ${token}` },
  });
}

export function accountPurchases(token: string, params?: { page?: number; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return fetchUserApi<import('@/types').PublicBuyerOrdersPayload & { page?: number; pages?: number; limit?: number }>(
    `/api/account/purchases${query ? `?${query}` : ''}`,
    {
      headers: { authorization: `Bearer ${token}` },
    },
  );
}
