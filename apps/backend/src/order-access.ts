import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_PREFIX = 'oa1_';
const TOKEN_CONTEXT = 'daibilet:checkout-order:v1';
const MIN_SECRET_LENGTH = 32;

export function isOrderAccessSecretUsable(secret: string | null | undefined): boolean {
  return clean(secret).length >= MIN_SECRET_LENGTH;
}

export function createOrderAccessToken(
  secret: string | null | undefined,
  publicCode: string | null | undefined,
): string | null {
  const normalizedSecret = clean(secret);
  const normalizedCode = clean(publicCode);
  if (normalizedSecret.length < MIN_SECRET_LENGTH || !normalizedCode) return null;

  const digest = createHmac('sha256', normalizedSecret)
    .update(`${TOKEN_CONTEXT}:${normalizedCode}`)
    .digest('base64url');
  return `${TOKEN_PREFIX}${digest}`;
}

export function verifyOrderAccessToken(input: {
  secret: string | null | undefined;
  publicCode: string | null | undefined;
  token: string | null | undefined;
}): boolean {
  const expected = createOrderAccessToken(input.secret, input.publicCode);
  const actual = clean(input.token);
  if (!expected || !actual) return false;

  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function clean(value: string | null | undefined): string {
  return String(value || '').trim();
}
