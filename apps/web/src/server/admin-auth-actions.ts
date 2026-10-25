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

  const payload = await response.json().catch(() => ({})) as { user?: { roles?: unknown; mfaEnabled?: unknown } };

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
  const roles = Array.isArray(payload.user?.roles) ? payload.user.roles : [];
  const requiresMfa = roles.some((role) => role === 'FINANCE' || role === 'SUPERADMIN');
  if (requiresMfa) redirect(`/admin/security/mfa?returnUrl=${encodeURIComponent(returnUrl)}`);
  redirect(returnUrl);
}

export async function beginAdminMfaEnrollmentAction(): Promise<{ enrollment?: { secret: string; otpauthUrl: string }; error?: string }> {
  return adminMfaRequest('/api/admin/auth/mfa/enroll');
}

export async function confirmAdminMfaEnrollmentAction(code: string): Promise<{ recoveryCodes?: string[]; error?: string }> {
  const result = await adminMfaRequest('/api/admin/auth/mfa/confirm', { code });
  if (result.error) return { error: result.error };
  return { recoveryCodes: result.recoveryCodes };
}

export async function verifyAdminMfaAction(code: string): Promise<{ error?: string }> {
  const result = await adminMfaRequest('/api/admin/auth/mfa/verify', { code });
  return result;
}

async function adminMfaRequest(path: string, body?: Record<string, unknown>): Promise<{ enrollment?: { secret: string; otpauthUrl: string }; recoveryCodes?: string[]; error?: string }> {
  const jar = await cookies();
  const token = jar.get('daibilet_admin_session')?.value;
  if (!token) return { error: 'Сессия истекла. Войдите снова.' };
  try {
    const response = await fetch(`${resolveAdminApiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: `daibilet_admin_session=${encodeURIComponent(token)}` },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string; enrollment?: { secret?: unknown; otpauthUrl?: unknown }; recoveryCodes?: unknown };
    if (!response.ok) return { error: payload.error || 'Не удалось выполнить проверку MFA.' };
    if (payload.enrollment && typeof payload.enrollment.secret === 'string' && typeof payload.enrollment.otpauthUrl === 'string') {
      return { enrollment: { secret: payload.enrollment.secret, otpauthUrl: payload.enrollment.otpauthUrl } };
    }
    return { recoveryCodes: Array.isArray(payload.recoveryCodes) ? payload.recoveryCodes.filter((code): code is string => typeof code === 'string') : undefined };
  } catch {
    return { error: 'Сервис проверки временно недоступен.' };
  }
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
  if (value.startsWith('//') || value === '/admin/login' || value.startsWith('/admin/security/mfa')) return '/admin';
  return value;
}
