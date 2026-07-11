import { createHmac, timingSafeEqual } from 'node:crypto';

import { prisma } from '@daibilet/db';

export type AccountUser = {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
};

type UserJwtPayload = {
  sub?: string;
  email?: string;
  type?: string;
  tokenType?: string;
  exp?: number;
};

const DEV_USER_JWT_SECRET = 'dev-user-jwt-secret-change-me';

export async function requireAccountUserFromRequest(request: Request): Promise<AccountUser> {
  const token = parseBearerToken(request);
  if (!token) throw unauthorized('Требуется авторизация.');

  const payload = verifyUserAccessToken(token);
  if (!payload?.sub) throw unauthorized('Невалидный access token.');

  const user = await prisma.siteUser.findFirst({
    where: { id: payload.sub, isActive: true },
    select: { id: true, email: true, name: true, emailVerifiedAt: true },
  });

  if (!user) throw unauthorized('Пользователь не найден.');
  return { id: user.id, email: user.email, name: user.name || '', emailVerifiedAt: user.emailVerifiedAt };
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'account_unauthorized';
}

export function unauthorizedErrorDetail(error: unknown): string | null {
  if (!isUnauthorizedError(error)) return null;
  const detail = (error as Error & { detail?: string }).detail;
  return typeof detail === 'string' && detail.trim() ? detail : null;
}

function parseBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function verifyUserAccessToken(token: string): UserJwtPayload | null {
  const secret = userJwtSecret();
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as UserJwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    if (payload.type !== 'user' || payload.tokenType !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}

function userJwtSecret(): string {
  return process.env.USER_JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : DEV_USER_JWT_SECRET);
}

function unauthorized(message: string): Error {
  const error = new Error('account_unauthorized') as Error & { detail?: string };
  error.detail = message;
  return error;
}
