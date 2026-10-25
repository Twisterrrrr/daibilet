export const CHECKOUT_ORDER_ACCESS_COOKIE = 'daibilet_order_access';
export const CHECKOUT_ORDER_POLL_ACCESS_COOKIE = 'daibilet_order_poll_access';
export const CHECKOUT_ORDER_ACCESS_MAX_AGE_SECONDS = 2 * 60 * 60;

export type CheckoutOrderAccessProof = { publicCode: string; token: string };

export function readCheckoutOrderAccessProof(
  cookieHeader: string | null | undefined,
  expectedPublicCode: string,
  cookieName = CHECKOUT_ORDER_ACCESS_COOKIE,
): CheckoutOrderAccessProof | null {
  const expectedCode = cleanPublicCode(expectedPublicCode);
  if (!expectedCode) return null;
  const encoded = readCookie(cookieHeader, cookieName);
  if (!encoded) return null;

  let value = encoded;
  try { value = decodeURIComponent(encoded); } catch { return null; }
  const separator = value.indexOf('.');
  if (separator < 1) return null;
  const publicCode = cleanPublicCode(value.slice(0, separator));
  const token = value.slice(separator + 1);
  if (publicCode !== expectedCode || !/^oa1_[A-Za-z0-9_-]{43}$/u.test(token)) return null;
  return { publicCode, token };
}

export function extractCheckoutOrderAccessProof(
  payload: unknown,
  expectedPublicCode?: string | null,
): CheckoutOrderAccessProof | null {
  const root = asRecord(payload);
  if (!root) return null;
  const order = asRecord(root.order) || root;
  const publicCode = cleanPublicCode(String(order.publicCode || root.publicCode || ''));
  const token = String(order.orderAccessToken || root.orderAccessToken || '').trim();
  if (!publicCode || !/^oa1_[A-Za-z0-9_-]{43}$/u.test(token)) return null;
  if (expectedPublicCode && publicCode !== cleanPublicCode(expectedPublicCode)) return null;
  return { publicCode, token };
}

export function stripCheckoutOrderAccessToken(payload: unknown): unknown {
  const root = asRecord(payload);
  if (!root) return payload;
  const safeRoot = { ...root };
  delete safeRoot.orderAccessToken;
  if (root.order && typeof root.order === 'object' && !Array.isArray(root.order)) {
    const safeOrder = { ...(root.order as Record<string, unknown>) };
    delete safeOrder.orderAccessToken;
    safeRoot.order = safeOrder;
  }
  return safeRoot;
}

export function serializeCheckoutOrderAccessProof(proof: CheckoutOrderAccessProof): string {
  return `${cleanPublicCode(proof.publicCode)}.${proof.token}`;
}

function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  for (const part of String(cookieHeader || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim() || null;
  }
  return null;
}

function cleanPublicCode(value: string): string {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/gu, '').slice(0, 64);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
