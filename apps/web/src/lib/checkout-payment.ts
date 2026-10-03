/**
 * Shared catalog checkout payment helpers (embedded YooKassa + order projection poll).
 * Finance remains source of truth for order state; catalog only navigates after projection.
 */

export type CheckoutConfirmationMode = 'redirect' | 'embedded';

export const CHECKOUT_ORDER_POLL_INTERVAL_MS = 2_000;
export const CHECKOUT_ORDER_POLL_REQUEST_TIMEOUT_MS = 8_000;
export const CHECKOUT_ORDER_POLL_MAX_MS = 30 * 60 * 1_000;

const TERMINAL_ORDER_STATUSES = new Set([
  'CONFIRMED',
  'FULFILLED',
  'CANCELLED',
  'CANCELED',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
  'SUCCEEDED',
  'PAID',
]);

export function normalizeCheckoutOrderStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .toUpperCase();
}

export function isTerminalCheckoutOrderStatus(status?: string | null): boolean {
  return TERMINAL_ORDER_STATUSES.has(normalizeCheckoutOrderStatus(status));
}

export function isPendingCheckoutOrderStatus(status?: string | null): boolean {
  const raw = normalizeCheckoutOrderStatus(status);
  if (!raw) return true;
  if (isTerminalCheckoutOrderStatus(raw)) return false;
  return (
    raw === 'PENDING' ||
    raw === 'WAITING_FOR_CAPTURE' ||
    raw === 'CREATED' ||
    raw === 'PROCESSING' ||
    raw === 'UNKNOWN'
  );
}

/** Stable idempotency key for the same checkout payload (reuse after ambiguous network). */
export function buildAdmissionCheckoutIdempotencyKey(input: {
  admissionProductSlug: string;
  admissionOfferId: string;
  quantity: number;
  email: string;
  confirmationMode?: CheckoutConfirmationMode | null;
}): string {
  const slug = String(input.admissionProductSlug || '')
    .trim()
    .toLowerCase();
  const offer = String(input.admissionOfferId || '').trim();
  const qty = Math.max(1, Math.round(Number(input.quantity) || 1));
  const email = String(input.email || '')
    .trim()
    .toLowerCase();
  const mode = input.confirmationMode === 'embedded' ? 'embedded' : 'redirect';
  return `admission:${slug}:${offer}:q${qty}:${email}:${mode}`;
}

export type CheckoutOrderPollLookup = {
  found: boolean;
  status: string | null;
  order?: unknown;
};

export type PollCheckoutOrderOptions = {
  publicCode: string;
  lookup: (publicCode: string, signal: AbortSignal) => Promise<CheckoutOrderPollLookup>;
  intervalMs?: number;
  requestTimeoutMs?: number;
  maxDurationMs?: number;
  signal?: AbortSignal;
  onUpdate?: (lookup: CheckoutOrderPollLookup) => void;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};

export type PollCheckoutOrderResult =
  | { ok: true; reason: 'terminal'; lookup: CheckoutOrderPollLookup }
  | { ok: false; reason: 'aborted' | 'deadline'; lookup: CheckoutOrderPollLookup | null };

async function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    const err = new Error('aborted');
    err.name = 'AbortError';
    throw err;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      const err = new Error('aborted');
      err.name = 'AbortError';
      reject(err);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Sequential order projection poll: one in-flight request at a time, 8s abort per request,
 * stop on terminal status / caller abort / 30m deadline. Transport errors keep pending and retry.
 */
export async function pollCheckoutOrderUntilTerminal(
  options: PollCheckoutOrderOptions,
): Promise<PollCheckoutOrderResult> {
  const intervalMs = options.intervalMs ?? CHECKOUT_ORDER_POLL_INTERVAL_MS;
  const requestTimeoutMs = options.requestTimeoutMs ?? CHECKOUT_ORDER_POLL_REQUEST_TIMEOUT_MS;
  const maxDurationMs = options.maxDurationMs ?? CHECKOUT_ORDER_POLL_MAX_MS;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const startedAt = now();
  let lastLookup: CheckoutOrderPollLookup | null = null;

  while (true) {
    if (options.signal?.aborted) {
      return { ok: false, reason: 'aborted', lookup: lastLookup };
    }
    if (now() - startedAt >= maxDurationMs) {
      return { ok: false, reason: 'deadline', lookup: lastLookup };
    }

    const requestController = new AbortController();
    const onOuterAbort = () => requestController.abort();
    options.signal?.addEventListener('abort', onOuterAbort, { once: true });
    const timeout = setTimeout(() => requestController.abort(), requestTimeoutMs);

    try {
      const lookup = await options.lookup(options.publicCode, requestController.signal);
      lastLookup = lookup;
      options.onUpdate?.(lookup);
      if (lookup.found && isTerminalCheckoutOrderStatus(lookup.status)) {
        return { ok: true, reason: 'terminal', lookup };
      }
    } catch {
      // Transport / abort-of-request: keep pending UI and retry (unless outer aborted).
      if (options.signal?.aborted) {
        return { ok: false, reason: 'aborted', lookup: lastLookup };
      }
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onOuterAbort);
    }

    try {
      await sleep(intervalMs, options.signal);
    } catch {
      return { ok: false, reason: 'aborted', lookup: lastLookup };
    }
  }
}

export function pickCheckoutConfirmation(payment: {
  confirmationMode?: string | null;
  confirmationToken?: string | null;
  confirmationUrl?: string | null;
}): {
  confirmationMode: CheckoutConfirmationMode;
  confirmationToken: string | null;
  confirmationUrl: string | null;
} {
  const token = String(payment.confirmationToken || '').trim() || null;
  const url = String(payment.confirmationUrl || '').trim() || null;
  const rawMode = String(payment.confirmationMode || '')
    .trim()
    .toLowerCase();
  if (token) {
    return {
      confirmationMode: 'embedded',
      confirmationToken: token,
      confirmationUrl: url,
    };
  }
  if (rawMode === 'embedded' && !token && url) {
    // Finance asked for embedded but only returned redirect URL - fall back.
    return { confirmationMode: 'redirect', confirmationToken: null, confirmationUrl: url };
  }
  return {
    confirmationMode: rawMode === 'embedded' ? 'embedded' : 'redirect',
    confirmationToken: null,
    confirmationUrl: url,
  };
}

declare global {
  interface Window {
    YooMoneyCheckoutWidget?: new (options: {
      confirmation_token: string;
      error_callback?: (error: unknown) => void;
      customization?: Record<string, unknown>;
    }) => {
      render: (elementId: string) => Promise<void> | void;
      destroy?: () => void;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export const YOOKASSA_CHECKOUT_WIDGET_SCRIPT =
  'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';

export function loadYooKassaCheckoutWidgetScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window_unavailable'));
  }
  if (window.YooMoneyCheckoutWidget) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${YOOKASSA_CHECKOUT_WIDGET_SCRIPT}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.YooMoneyCheckoutWidget) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('yookassa_script_failed')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = YOOKASSA_CHECKOUT_WIDGET_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('yookassa_script_failed'));
    document.head.appendChild(script);
  });
}
