export const ORDER_ACCESS_COOKIE_NAME = 'daibilet_order_access';
export const ORDER_ACCESS_COOKIE_PATH = '/checkout/actions';
export const ORDER_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type OrderAccessProof = {
  publicCode: string;
  token: string;
};

export function extractOrderAccessProof(payload: unknown): OrderAccessProof | null {
  if (!isRecord(payload)) return null;
  const order = isRecord(payload.order) ? payload.order : payload;
  const publicCode = cleanPublicCode(order.publicCode ?? order.public_code);
  const token = cleanToken(order.orderAccessToken ?? order.order_access_token);
  return publicCode && token ? { publicCode, token } : null;
}

export function encodeOrderAccessProof(proof: OrderAccessProof): string {
  return Buffer.from(JSON.stringify(proof), 'utf8').toString('base64url');
}

export function readOrderAccessToken(cookieHeader: string | null, expectedPublicCode: string): string | null {
  const cookieValue = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ORDER_ACCESS_COOKIE_NAME}=`))
    ?.slice(ORDER_ACCESS_COOKIE_NAME.length + 1);
  if (!cookieValue) return null;

  try {
    const decoded: unknown = JSON.parse(Buffer.from(cookieValue, 'base64url').toString('utf8'));
    if (!isRecord(decoded)) return null;
    const publicCode = cleanPublicCode(decoded.publicCode);
    const token = cleanToken(decoded.token);
    return publicCode === cleanPublicCode(expectedPublicCode) && token ? token : null;
  } catch {
    return null;
  }
}

function cleanPublicCode(value: unknown): string | null {
  const code = String(value || '').trim();
  return /^\d{7}$/.test(code) ? code : null;
}

function cleanToken(value: unknown): string | null {
  const token = String(value || '').trim();
  return /^oa1_[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
