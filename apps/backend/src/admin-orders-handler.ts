import type { DbClient } from './types/db.js';
import type { AdminOrderRefundRequestPayload, OrderTicketPayload } from './types/schemas.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import { adminOrderRefundRequestPayloadSchema, orderTicketPayloadSchema } from './types/schemas.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';
import { safeEqualString } from './auth.js';
import { AdminOrderOperationError } from './admin-order-operations.js';
import { z } from 'zod';
import type { FinanceAdminAuditEntry } from './admin-finance-audit.js';
import { financeAdminActorHasPermission, verifyFinanceAdminActorAssertion } from './admin-finance-actor.js';

export type UpsertAdminOrderTicket = (
  db: DbClient,
  orderId: string,
  payload: OrderTicketPayload,
) => Promise<unknown>;

export interface AdminOrdersHandlerDependencies {
  db: DbClient;
  upsertAdminOrderTicket: UpsertAdminOrderTicket;
  createRefundRequest?: (orderKey: string, payload: AdminOrderRefundRequestPayload) => Promise<unknown>;
  internalOperationToken?: string | null;
  actorAssertionSecret?: string | null;
  auditActorAccess?: (entry: FinanceAdminAuditEntry) => Promise<void>;
  operateInternalOrder?: (input: { orderKey: string; operation: 'cancel' | 'refund'; confirmCode: string; reason: string }) => Promise<unknown>;
}

export function createAdminOrdersRouteHandler(deps: AdminOrdersHandlerDependencies): TypedRouteHandler {
  return async (context) => {
    if (await handleInternalOperation(context, deps)) return true;
    if (await handleOrderRefundRequestCreate(context, deps)) return true;
    return handleOrderTicketUpsert(context, deps);
  };
}

const operationSchema = z.object({
  operation: z.enum(['cancel', 'refund']),
  confirmCode: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(3).max(500),
}).strict();

async function handleInternalOperation(context: RouteContext, deps: AdminOrdersHandlerDependencies): Promise<boolean> {
  if (context.method !== 'POST' || !deps.operateInternalOrder) return false;
  const match = matchPath(context.pathname, /^\/api\/internal\/admin\/orders\/([^/]+)\/operation$/);
  if (!match?.[0]) return false;
  const expected = deps.internalOperationToken?.trim();
  const header = String(context.request.headers.authorization || '');
  const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!expected || !provided || !safeEqualString(provided, expected)) {
    sendJson(context.response, { error: 'admin_operation_auth_required' }, { statusCode: 401 });
    return true;
  }
  const assertion = String(context.request.headers['x-daibilet-admin-assertion'] || '');
  const actor = verifyFinanceAdminActorAssertion(assertion, deps.actorAssertionSecret);
  if (!actor) {
    sendJson(context.response, { error: 'admin_actor_assertion_required' }, { statusCode: 401 });
    return true;
  }
  const payload = await parseJsonBody(operationSchema, context.request);
  const requiredPermission = payload.operation === 'refund' ? 'refunds.execute' : 'orders.cancel';
  if (!deps.auditActorAccess) {
    sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
    return true;
  }
  const auditEntry = {
    actorId: actor.id,
    actorName: actor.displayName,
    sessionId: actor.sessionId,
    assertionId: actor.assertionId,
    action: requiredPermission,
    resourceType: 'order',
    resourceId: match[0],
  };
  if (!financeAdminActorHasPermission(actor, requiredPermission)) {
    try { await deps.auditActorAccess({ ...auditEntry, outcome: 'denied' }); } catch {
      sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
      return true;
    }
    sendJson(context.response, { error: 'admin_permission_denied' }, { statusCode: 403 });
    return true;
  }
  try {
    await deps.auditActorAccess({ ...auditEntry, outcome: 'allowed' });
  } catch {
    sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
    return true;
  }
  try {
    sendJson(context.response, await deps.operateInternalOrder({ orderKey: match[0], ...payload }));
  } catch (error) {
    if (!(error instanceof AdminOrderOperationError)) throw error;
    sendJson(context.response, { error: error.code }, { statusCode: error.statusCode });
  }
  return true;
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
