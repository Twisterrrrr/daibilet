/**
 * Server-only finance checkout consumer (catalog buyer UX).
 * Soft-fail: missing env / timeout / non-OK → structured error, never throws to UI callers.
 * Does not invent secrets; uses FINANCE_API_BASE_URL (+ optional projection token / Host).
 */

import {
  amountRubFromKopecks,
  mapFinanceOrderStatus,
  type BuyerCheckoutMode,
  type BuyerInternalOrderRecord,
} from '@/lib/buyer-checkout';
import {
  resolveFinanceApiBaseUrl,
  resolveFinanceApiHost,
  resolveFinanceProjectionToken,
  type FinanceProjectionEnv,
} from '@/server/finance-projection-client';

export const FINANCE_CHECKOUT_TIMEOUT_MS = 12_000;

export type FinanceCheckoutSubmitInput = {
  admissionProductSlug: string;
  admissionOfferId: string;
  quantity: number;
  buyer: {
    email: string;
    name?: string | null;
    phone?: string | null;
  };
  returnUrl?: string;
  mode?: BuyerCheckoutMode;
};

export type FinanceCheckoutSubmitResult =
  | {
      ok: true;
      mode: string;
      publicCode: string;
      status: string;
      confirmationUrl: string | null;
      order: BuyerInternalOrderRecord;
      raw?: unknown;
    }
  | {
      ok: false;
      error: string;
      detail?: string;
      status?: number;
    };

function buildHeaders(env: FinanceProjectionEnv): Headers {
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  const host = resolveFinanceApiHost(env);
  if (host) headers.set('Host', host);
  const token = resolveFinanceProjectionToken(env);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function resolveBuyerCheckoutMode(env: FinanceProjectionEnv = process.env): BuyerCheckoutMode {
  // Default auto: try YooKassa confirmationUrl first; soft-fall to STUB until Codex
  // exposes public admission create-payment. Override: BUYER_CHECKOUT_MODE=yookassa|stub.
  const raw = String(env.BUYER_CHECKOUT_MODE || env.DAIBILET_BUYER_CHECKOUT_MODE || 'auto')
    .trim()
    .toLowerCase();
  if (raw === 'yookassa' || raw === 'auto' || raw === 'stub') return raw;
  return 'auto';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function pickConfirmationUrl(payload: Record<string, unknown>): string | null {
  const direct =
    asString(payload.confirmationUrl) ||
    asString(payload.confirmation_url) ||
    asString(payload.paymentUrl);
  if (direct) return direct;
  const payment = asRecord(payload.payment);
  if (payment) {
    return (
      asString(payment.confirmationUrl) ||
      asString(payment.confirmation_url) ||
      asString(payment.confirmationUrlRedirect) ||
      null
    );
  }
  const confirmation = asRecord(payload.confirmation);
  if (confirmation) return asString(confirmation.confirmation_url) || asString(confirmation.url);
  return null;
}

function mapOrderFromFinancePayload(
  payload: unknown,
  fallbackEmail: string,
  mode: string,
): BuyerInternalOrderRecord | null {
  const root = asRecord(payload);
  if (!root) return null;
  const order = asRecord(root.order) || root;
  const publicCode = asString(order.publicCode) || asString(order.public_code);
  if (!publicCode) return null;

  const buyer = asRecord(order.buyer) || {};
  const subject = asRecord(order.subject) || {};
  const totals = asRecord(order.totals) || {};
  const status = asString(order.status) || 'PENDING';
  const mapped = mapFinanceOrderStatus(status);
  const title =
    asString(subject.admissionProductTitle) ||
    asString(subject.eventTitle) ||
    asString(order.title) ||
    'Входной билет';
  const email = asString(buyer.email) || fallbackEmail;
  const amountRub =
    amountRubFromKopecks(
      typeof totals.totalKopecks === 'number' ? totals.totalKopecks : null,
    ) ??
    (typeof order.amountRub === 'number' ? order.amountRub : null);

  return {
    publicCode,
    status,
    displayStatus: mapped.displayStatus,
    statusTone: mapped.statusTone,
    title,
    email,
    purchasedAt:
      asString(order.paidAt) || asString(order.confirmedAt) || asString(order.createdAt) || null,
    amountRub,
    mode: asString(root.mode) || mode,
    confirmationUrl: pickConfirmationUrl(root) || pickConfirmationUrl(order),
    source: 'internal',
  };
}

async function financePostJson(
  apiPath: string,
  body: unknown,
  env: FinanceProjectionEnv = process.env,
): Promise<{ ok: true; status: number; json: unknown } | { ok: false; status: number; error: string; detail?: string }> {
  const base = resolveFinanceApiBaseUrl(env);
  if (!base) {
    return { ok: false, status: 503, error: 'finance_api_unavailable', detail: 'FINANCE_API_BASE_URL не задан' };
  }

  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const url = `${base}${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(env),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FINANCE_CHECKOUT_TIMEOUT_MS),
      cache: 'no-store',
    });
    const json = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      const record = asRecord(json);
      const detail =
        asString(record?.error) ||
        asString(record?.message) ||
        (Array.isArray(record?.issues) ? JSON.stringify(record?.issues).slice(0, 400) : null) ||
        `HTTP ${response.status}`;
      return { ok: false, status: response.status, error: 'finance_checkout_failed', detail };
    }
    return { ok: true, status: response.status, json };
  } catch (error) {
    return {
      ok: false,
      status: 503,
      error: 'finance_api_unreachable',
      detail: error instanceof Error ? error.message : 'network_error',
    };
  }
}

async function financeGetJson(
  apiPath: string,
  env: FinanceProjectionEnv = process.env,
): Promise<unknown | null> {
  const base = resolveFinanceApiBaseUrl(env);
  if (!base) return null;
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  try {
    const response = await fetch(`${base}${path}`, {
      method: 'GET',
      headers: buildHeaders(env),
      signal: AbortSignal.timeout(FINANCE_CHECKOUT_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function buildStubBody(input: FinanceCheckoutSubmitInput) {
  return {
    admissionProductSlug: input.admissionProductSlug,
    admissionOfferId: input.admissionOfferId,
    quantity: input.quantity,
    buyer: {
      email: input.buyer.email,
      name: input.buyer.name || undefined,
      phone: input.buyer.phone || undefined,
    },
  };
}

function buildYookassaBody(input: FinanceCheckoutSubmitInput) {
  return {
    ...buildStubBody(input),
    // Public /api/checkout/yookassa currently event-oriented; still send admission fields for Codex parity.
    offerId: input.admissionOfferId,
    returnUrl: input.returnUrl,
  };
}

export async function submitAdmissionCheckout(
  input: FinanceCheckoutSubmitInput,
  env: FinanceProjectionEnv = process.env,
): Promise<FinanceCheckoutSubmitResult> {
  const slug = input.admissionProductSlug.trim();
  const offerId = input.admissionOfferId.trim();
  const email = String(input.buyer.email || '')
    .trim()
    .toLowerCase();
  const quantity = Number(input.quantity);

  if (!slug || !offerId || !email.includes('@') || !Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: 'validation_error', detail: 'Нужны email, тариф и количество' };
  }

  const mode = input.mode || resolveBuyerCheckoutMode(env);
  const attempts: Array<{ label: string; path: string; body: unknown }> = [];

  if (mode === 'yookassa' || mode === 'auto') {
    // Prefer public create-payment; supplier authenticated path is out of catalog buyer scope.
    attempts.push({ label: 'YOOKASSA', path: '/api/checkout/yookassa', body: buildYookassaBody(input) });
  }
  // STUB only when explicitly requested or as auto soft-fallback (Codex admission YooKassa gap).
  if (mode === 'stub' || mode === 'auto') {
    attempts.push({ label: 'STUB', path: '/api/checkout/stub', body: buildStubBody(input) });
  }

  let lastFail: FinanceCheckoutSubmitResult = {
    ok: false,
    error: 'finance_checkout_failed',
    detail: 'Нет доступного режима оплаты',
  };

  for (const attempt of attempts) {
    const result = await financePostJson(attempt.path, attempt.body, env);
    if (!result.ok) {
      lastFail = {
        ok: false,
        error: result.error,
        detail: result.detail,
        status: result.status,
      };
      // For auto: if yookassa rejects admissions (400/404), fall through to stub.
      continue;
    }

    const order = mapOrderFromFinancePayload(result.json, email, attempt.label);
    if (!order?.publicCode) {
      lastFail = {
        ok: false,
        error: 'invalid_finance_response',
        detail: 'Finance не вернул publicCode',
        status: result.status,
      };
      continue;
    }

    return {
      ok: true,
      mode: order.mode || attempt.label,
      publicCode: order.publicCode,
      status: order.status,
      confirmationUrl: order.confirmationUrl || null,
      order,
      raw: result.json,
    };
  }

  return lastFail;
}

/** Soft publicCode lookup - fail empty until Codex exposes stable buyer order API. */
export async function lookupCheckoutOrderByPublicCode(
  publicCode: string,
  env: FinanceProjectionEnv = process.env,
): Promise<BuyerInternalOrderRecord | null> {
  const code = publicCode.trim();
  if (!code) return null;

  const candidates = [
    `/api/public/checkout/orders/${encodeURIComponent(code)}`,
    `/api/checkout/orders/${encodeURIComponent(code)}`,
    `/api/public/orders/${encodeURIComponent(code)}`,
    `/api/checkout/order?publicCode=${encodeURIComponent(code)}`,
  ];

  for (const path of candidates) {
    const raw = await financeGetJson(path, env);
    if (!raw) continue;
    const mapped = mapOrderFromFinancePayload(raw, '', 'LOOKUP');
    if (mapped) return mapped;
  }
  return null;
}

/** Soft buyer internal purchases by email - fail empty without inventing APIs. */
export async function fetchInternalPurchasesByEmail(
  email: string,
  env: FinanceProjectionEnv = process.env,
): Promise<BuyerInternalOrderRecord[]> {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized.includes('@')) return [];

  const candidates = [
    `/api/public/purchases?email=${encodeURIComponent(normalized)}`,
    `/api/public/checkout/purchases?email=${encodeURIComponent(normalized)}`,
  ];

  for (const path of candidates) {
    const raw = await financeGetJson(path, env);
    const root = asRecord(raw);
    if (!root) continue;
    const rowsRaw = Array.isArray(root.rows)
      ? root.rows
      : Array.isArray(root.items)
        ? root.items
        : Array.isArray(root.orders)
          ? root.orders
          : [];
    const mapped = rowsRaw
      .map((row) => mapOrderFromFinancePayload({ order: row, mode: 'INTERNAL' }, normalized, 'INTERNAL'))
      .filter((row): row is BuyerInternalOrderRecord => Boolean(row));
    if (mapped.length) return mapped;
  }
  return [];
}
