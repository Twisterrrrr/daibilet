import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

export interface AdminAuthConfig {
  email: string;
  password: string;
  passwordHash: string;
  realm: string;
  requireAuth: boolean;
}

type AdminAuthEnv = {
  NODE_ENV?: string | undefined;
  DAIBILET_REQUIRE_ADMIN_AUTH?: string | undefined;
  ADMIN_EMAIL?: string | undefined;
  ADMIN_USER?: string | undefined;
  ADMIN_PASSWORD?: string | undefined;
  ADMIN_PASSWORD_SHA256?: string | undefined;
  ADMIN_PASSWORD_HASH?: string | undefined;
  ADMIN_AUTH_REALM: string;
};

export function createAdminAuthConfig(env: AdminAuthEnv): AdminAuthConfig {
  return {
    email: env.ADMIN_EMAIL || env.ADMIN_USER || '',
    password: env.ADMIN_PASSWORD || '',
    passwordHash: env.ADMIN_PASSWORD_SHA256 || env.ADMIN_PASSWORD_HASH || '',
    realm: env.ADMIN_AUTH_REALM,
    requireAuth: env.NODE_ENV === 'production' || env.DAIBILET_REQUIRE_ADMIN_AUTH === '1',
  };
}

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname === '/api/db/stats' ||
    pathname === '/api/db/events' ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/supplier') ||
    pathname.startsWith('/api/v1/tc') ||
    pathname.startsWith('/api/v1/tep')
  );
}

export function isAdminAuthConfigured(config: AdminAuthConfig): boolean {
  return Boolean(config.email && (config.password || config.passwordHash));
}

export function isAuthorizedAdminRequest(request: IncomingMessage, config: AdminAuthConfig): boolean {
  if (!isAdminAuthConfigured(config)) return !config.requireAuth;

  const header = String(request.headers.authorization || '');
  if (!header.startsWith('Basic ')) return false;

  let decoded = '';
  try {
    decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex <= 0) return false;

  const email = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  if (!safeEqualString(email, config.email)) return false;

  if (config.passwordHash) {
    const actualHash = createHash('sha256').update(password).digest('hex');
    return safeEqualString(actualHash, normalizeSha256Hash(config.passwordHash));
  }

  return safeEqualString(password, config.password);
}

export function normalizeSha256Hash(value: string): string {
  return String(value || '').trim().replace(/^sha256:/i, '').toLowerCase();
}

export function safeEqualString(actual: string, expected: string): boolean {
  const actualDigest = createHash('sha256').update(String(actual)).digest();
  const expectedDigest = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}
