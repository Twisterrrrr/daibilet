/**
 * Edge-safe Basic Auth for Next middleware (F4 admin shell).
 * Mirrors apps/backend/src/auth.ts credentials contract:
 * ADMIN_EMAIL / ADMIN_USER + ADMIN_PASSWORD or ADMIN_PASSWORD_SHA256.
 */

export type AdminBasicAuthConfig = {
  email: string;
  password: string;
  passwordHash: string;
  realm: string;
  requireAuth: boolean;
};

type EnvLike = Record<string, string | undefined>;

export function readAdminBasicAuthConfig(env: EnvLike = process.env): AdminBasicAuthConfig {
  return {
    email: env.ADMIN_EMAIL || env.ADMIN_USER || '',
    password: env.ADMIN_PASSWORD || '',
    passwordHash: env.ADMIN_PASSWORD_SHA256 || env.ADMIN_PASSWORD_HASH || '',
    realm: env.ADMIN_AUTH_REALM || 'Daibilet admin',
    requireAuth: env.NODE_ENV === 'production' || env.DAIBILET_REQUIRE_ADMIN_AUTH === '1',
  };
}

export function isAdminAuthConfigured(config: AdminBasicAuthConfig): boolean {
  return Boolean(config.email && (config.password || config.passwordHash));
}

export function isAdminUiPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function normalizeSha256Hash(value: string): string {
  return String(value || '')
    .trim()
    .replace(/^sha256:/i, '')
    .toLowerCase();
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function safeEqualString(actual: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([sha256Hex(actual), sha256Hex(expected)]);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function isAuthorizedAdminBasicAuth(
  authorizationHeader: string | null | undefined,
  config: AdminBasicAuthConfig,
): Promise<boolean> {
  if (!isAdminAuthConfigured(config)) return !config.requireAuth;

  const header = String(authorizationHeader || '');
  if (!header.startsWith('Basic ')) return false;

  let decoded = '';
  try {
    decoded = atob(header.slice('Basic '.length));
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex <= 0) return false;

  const email = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  if (!(await safeEqualString(email, config.email))) return false;

  if (config.passwordHash) {
    const actualHash = await sha256Hex(password);
    return safeEqualString(actualHash, normalizeSha256Hash(config.passwordHash));
  }

  return safeEqualString(password, config.password);
}
