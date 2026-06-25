import type { DbClient } from './types/db.js';
import type { OrderTicketPayload } from './types/schemas.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import { orderTicketPayloadSchema } from './types/schemas.js';
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
}

export function createAdminOrdersRouteHandler(deps: AdminOrdersHandlerDependencies): TypedRouteHandler {
  return async (context) => handleOrderTicketUpsert(context, deps);
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
