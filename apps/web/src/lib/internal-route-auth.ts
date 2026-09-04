import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Shared gate for `/api/internal/*` (revalidate, IndexNow).
 * Hash-then-compare so secret length does not leak via early return.
 */
export function isAuthorizedInternalRequest(request: Request): boolean {
  const secret = process.env.DAIBILET_NEXT_REVALIDATE_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerSecret = request.headers.get('x-revalidate-secret')?.trim() || '';
  return timingSafeSecretEqual(bearer, secret) || timingSafeSecretEqual(headerSecret, secret);
}

export function timingSafeSecretEqual(actual: string, expected: string): boolean {
  const left = createHash('sha256').update(String(actual)).digest();
  const right = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(left, right);
}

/** ISR revalidatePath must stay on-site, no traversal. */
export function isSafeRevalidatePath(path: string): boolean {
  const value = String(path || '').trim();
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('..') || value.includes('\\') || value.includes('\0')) return false;
  if (value.length > 500) return false;
  if (!/^\/[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]*$/.test(value)) return false;
  return true;
}
