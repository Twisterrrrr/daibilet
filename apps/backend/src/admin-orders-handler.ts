import type { DbClient } from './types/db';
import type { OrderTicketPayload } from './types/schemas';
import { sendJson } from './http';
import { matchPath, type RouteContext } from './routing';
import { orderTicketPayloadSchema } from './types/schemas';
import type { TypedRouteHandler } from './validated-handler';
import { parseJsonBody } from './validation';

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
