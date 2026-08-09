import type { DbClient } from './types/db.js';
import type { AdminOrderRefundRequestPayload, OrderTicketPayload } from './types/schemas.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import { adminOrderRefundRequestPayloadSchema, orderTicketPayloadSchema } from './types/schemas.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export type UpsertAdminOrderTicket = (
  db: DbClient,
  orderId: string,
  payload: OrderTicketPayload,
) => Promise<unknown>;

export interface AdminOrdersHandlerDependencies {
  db: DbClient;
  upsertAdminOrderTicket: UpsertAdminOrderTicket;
  createRefundRequest?: (orderKey: string, payload: AdminOrderRefundRequestPayload) => Promise<unknown>;
}

export function createAdminOrdersRouteHandler(deps: AdminOrdersHandlerDependencies): TypedRouteHandler {
  return async (context) => {
    if (await handleOrderRefundRequestCreate(context, deps)) return true;
    return handleOrderTicketUpsert(context, deps);
  };
}

async function handleOrderRefundRequestCreate(
  context: RouteContext,
  deps: AdminOrdersHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'POST' || !deps.createRefundRequest) return false;

  const match = matchPath(context.pathname, /^\/api\/admin\/orders\/([^/]+)\/refunds$/);
  if (!match) return false;

  const [orderId] = match;
  if (!orderId) return false;

  const payload = await parseJsonBody(adminOrderRefundRequestPayloadSchema, context.request);
  try {
    const result = await deps.createRefundRequest(orderId, payload);
    sendJson(context.response, result, { statusCode: 201 });
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown })?.statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
    if (statusCode === 409 && Array.isArray((error as { blockers?: unknown }).blockers)) {
      sendJson(context.response, { error: 'refund_request_blocked', blockers: (error as { blockers: string[] }).blockers }, { statusCode });
      return true;
    }
    throw error;
  }
  return true;
}

async function handleOrderTicketUpsert(
  context: RouteContext,
  deps: AdminOrdersHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'POST') return false;

  const match = matchPath(context.pathname, /^\/api\/admin\/orders\/([^/]+)\/tickets$/);
  if (!match) return false;

  const [orderId] = match;
  if (!orderId) return false;

  const payload = await parseJsonBody(orderTicketPayloadSchema, context.request);
  const result = await deps.upsertAdminOrderTicket(deps.db, orderId, payload);
  sendJson(context.response, result);
  return true;
}
