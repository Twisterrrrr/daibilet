import type { YooKassaCheckoutCreateDto } from '@daibilet/contracts/checkout';
import { z } from 'zod';
import {
  applyYooKassaWebhookPayload,
  createYooKassaCheckoutOrder,
  isYooKassaCheckoutError,
} from './checkout-yookassa.js';
import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

const CHECKOUT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const CHECKOUT_RATE_LIMIT_MAX = 20;
const checkoutRateBuckets = new Map<string, { count: number; resetAt: number }>();

const nullableString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().nullable().optional(),
);

const yookassaCheckoutCreatePayloadSchema = z.object({
  eventId: nullableString,
  eventSlug: nullableString,
  offerId: z.string().trim().min(1),
  sessionId: nullableString,
  quantity: z.coerce.number().int().min(1).max(10),
  buyer: z.object({
    email: z.string().trim().email(),
    name: nullableString,
    phone: nullableString,
  }),
  attendee: z.object({
    name: nullableString,
    phone: nullableString,
  }).nullable().optional(),
  idempotencyKey: nullableString,
  returnUrl: nullableString,
}).refine((payload) => Boolean(payload.eventId || payload.eventSlug), {
  path: ['eventId'],
  message: 'eventId or eventSlug is required',
});

const yookassaWebhookPayloadSchema = z.record(z.string(), z.unknown());

export function createYooKassaCheckoutRouteHandler(): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.pathname === '/api/checkout/yookassa' && context.method === 'POST') {
      if (!isAllowedCheckoutOrigin(firstHeader(context.request.headers.origin))) {
        sendJson(context.response, { error: 'checkout_origin_forbidden' }, { statusCode: 403 });
        return true;
      }
      if (!consumeCheckoutRateLimit(getClientIp(context))) {
        sendJson(context.response, { error: 'checkout_rate_limited' }, { statusCode: 429 });
        return true;
      }
      const payload = await parseJsonBody(
        yookassaCheckoutCreatePayloadSchema,
        context.request,
      ) as YooKassaCheckoutCreateDto;
      try {
        const idempotencyKey = firstHeader(context.request.headers['idempotency-key']) || payload.idempotencyKey || null;
        const result = await createYooKassaCheckoutOrder(payload, { idempotencyKey });
        sendJson(context.response, result, { statusCode: 201 });
      } catch (error) {
        if (!isYooKassaCheckoutError(error)) throw error;
        sendJson(context.response, error.toDto(), { statusCode: error.statusCode });
      }
      return true;
    }

    if (context.pathname === '/api/checkout/yookassa/webhook' && context.method === 'POST') {
      const payload = await parseJsonBody(yookassaWebhookPayloadSchema, context.request);
      try {
        const result = await applyYooKassaWebhookPayload(payload);
        sendJson(context.response, result);
      } catch (error) {
        if (!isYooKassaCheckoutError(error)) throw error;
        sendJson(context.response, error.toDto(), { statusCode: error.statusCode });
      }
      return true;
    }

    return false;
  };
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function isAllowedCheckoutOrigin(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return (
      hostname === 'daibilet.ru'
      || hostname === 'www.daibilet.ru'
      || hostname === 'admin.daibilet.ru'
      || hostname.endsWith('.daibilet.ru')
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
    );
  } catch {
    return false;
  }
}

function getClientIp(context: RouteContext): string {
  const forwarded = firstHeader(context.request.headers['x-forwarded-for']);
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return context.request.socket.remoteAddress || 'unknown';
}

function consumeCheckoutRateLimit(key: string): boolean {
  const now = Date.now();
  const existing = checkoutRateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    checkoutRateBuckets.set(key, { count: 1, resetAt: now + CHECKOUT_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (existing.count >= CHECKOUT_RATE_LIMIT_MAX) return false;
  existing.count += 1;
  return true;
}
