import type { StubCheckoutCreateDto } from '@daibilet/contracts/checkout';
import { z } from 'zod';
import { createStubCheckoutOrder, isStubCheckoutError } from './checkout-stub.js';
import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

const nullableString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().nullable().optional(),
);

const stubCheckoutCreatePayloadSchema = z.object({
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
}).refine((payload) => Boolean(payload.eventId || payload.eventSlug), {
  path: ['eventId'],
  message: 'eventId or eventSlug is required',
});

export function createStubCheckoutRouteHandler(): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.pathname !== '/api/checkout/stub') return false;
    if (context.method !== 'POST') return false;

    const payload = await parseJsonBody(stubCheckoutCreatePayloadSchema, context.request) as StubCheckoutCreateDto;
    try {
      const idempotencyKey = firstHeader(context.request.headers['idempotency-key']) || payload.idempotencyKey || null;
      const result = await createStubCheckoutOrder(payload, { idempotencyKey });
      sendJson(context.response, result, { statusCode: 201 });
    } catch (error) {
      if (!isStubCheckoutError(error)) throw error;
      sendJson(context.response, error.toDto(), { statusCode: error.statusCode });
    }
    return true;
  };
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
