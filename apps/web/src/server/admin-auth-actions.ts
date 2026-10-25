'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { resolveAdminApiBase } from '@/server/admin-api-fetch';

export async function loginAdminAction(formData: FormData): Promise<never> {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const returnUrl = safeAdminReturnUrl(String(formData.get('returnUrl') || ''));
  if (!email || !password || email.length > 254 || password.length > 1024) {
    redirect(`/admin/login?error=invalid_input&returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  let response: Response;
  try {
    response = await fetch(`${resolveAdminApiBase()}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    redirect(`/admin/login?error=service_unavailable&returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    const error = payload.error === 'Слишком много попыток входа. Попробуйте позже.' ? 'rate_limited' : 'invalid_credentials';
    redirect(`/admin/login?error=${error}&returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  const setCookie = response.headers.get('set-cookie') || '';
  const token = setCookie.match(/(?:^|[,;\s])daibilet_admin_session=([^;,\s]+)/u)?.[1];
  if (!token) redirect(`/admin/login?error=service_unavailable&returnUrl=${encodeURIComponent(returnUrl)}`);
  const jar = await cookies();
  jar.set('daibilet_admin_session', decodeURIComponent(token), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  redirect(returnUrl);
}

export async function logoutAdminAction(): Promise<never> {
  const jar = await cookies();
  const token = jar.get('daibilet_admin_session')?.value;
  if (token) {
    try {
      await fetch(`${resolveAdminApiBase()}/api/admin/auth/logout`, {
        method: 'POST',
        headers: { cookie: `daibilet_admin_session=${encodeURIComponent(token)}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      // Expiring the local HttpOnly cookie still closes this browser session.
    }
  }
  jar.delete('daibilet_admin_session');
  redirect('/admin/login');
}

function safeAdminReturnUrl(value: string): string {
  if (!value.startsWith('/admin/') && value !== '/admin') return '/admin';
  if (value.startsWith('//') || value === '/admin/login') return '/admin';
  return value;
}
