import { safeEqualString } from './auth.js';
import {
  financeAdminActorHasPermission,
  projectInternalAdminOrderDetail,
  projectInternalAdminOrdersList,
  verifyFinanceAdminActorAssertion,
} from './admin-finance-actor.js';
import { sendJson } from './http.js';
import { adminRolesMayReadOrderPii } from './admin-rbac-policy.js';
import { projectAdminOrdersPii } from './admin-order-pii.js';
import type { FinanceAdminAuditEntry } from './admin-finance-audit.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminOrdersReadHandlerDependencies {
  enabled: boolean;
  buildOrdersList: (searchParams: URLSearchParams, options?: { includePiiSearch: boolean }) => Promise<unknown>;
  buildOrderDetail: (orderKey: string) => Promise<unknown | null>;
  internalReadToken?: string | null;
  actorAssertionSecret?: string | null;
  auditActorAccess?: (entry: FinanceAdminAuditEntry) => Promise<void>;
}

export function createAdminOrdersReadRouteHandler(
  deps: AdminOrdersReadHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    if (context.pathname === '/api/internal/admin/orders' || context.pathname.startsWith('/api/internal/admin/orders/')) {
      const expected = deps.internalReadToken?.trim();
      const header = String(context.request.headers.authorization || '');
      const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!expected || !provided || !safeEqualString(provided, expected)) {
        sendJson(context.response, { error: 'admin_read_auth_required' }, { statusCode: 401 });
        return true;
      }
      const assertion = String(context.request.headers['x-daibilet-admin-assertion'] || '');
      const actor = verifyFinanceAdminActorAssertion(assertion, deps.actorAssertionSecret);
      if (!actor) {
        sendJson(context.response, { error: 'admin_actor_assertion_required' }, { statusCode: 401 });
        return true;
      }
      if (!deps.auditActorAccess) {
        sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
        return true;
      }
      const detailMatch = matchPath(context.pathname, /^\/api\/internal\/admin\/orders\/([^/]+)$/);
      const resourceId = detailMatch?.[0] || null;
      const resourceType = resourceId ? 'order' : 'orders';
      const audit = async (action: string, outcome: 'allowed' | 'denied') => deps.auditActorAccess!({
        actorId: actor.id,
        actorName: actor.displayName,
        sessionId: actor.sessionId,
        assertionId: actor.assertionId,
        action,
        resourceType,
        resourceId,
        outcome,
      });
      if (!financeAdminActorHasPermission(actor, 'orders.read')) {
        try { await audit('orders.read', 'denied'); } catch {
          sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
          return true;
        }
        sendJson(context.response, { error: 'admin_permission_denied' }, { statusCode: 403 });
        return true;
      }
      if (context.searchParams.has('q') && !financeAdminActorHasPermission(actor, 'orders.pii.read')) {
        try { await audit('orders.pii.read', 'denied'); } catch {
          sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
          return true;
        }
        sendJson(context.response, { error: 'admin_pii_search_permission_required' }, { statusCode: 403 });
        return true;
      }
      try {
        await audit('orders.read', 'allowed');
        if (financeAdminActorHasPermission(actor, 'orders.pii.read')) await audit('orders.pii.read', 'allowed');
        if (resourceId && financeAdminActorHasPermission(actor, 'finance.read')) await audit('finance.read', 'allowed');
      } catch {
        sendJson(context.response, { error: 'admin_audit_unavailable' }, { statusCode: 503 });
        return true;
      }
      const internalDetail = matchPath(context.pathname, /^\/api\/internal\/admin\/orders\/([^/]+)$/);
      if (internalDetail?.[0]) {
        const detail = await deps.buildOrderDetail(internalDetail[0]);
        sendJson(context.response, detail ? projectInternalAdminOrderDetail(detail, actor) : { error: 'order_not_found' }, { statusCode: detail ? 200 : 404 });
        return true;
      }
      if (context.pathname !== '/api/internal/admin/orders') return false;
      sendJson(context.response, projectInternalAdminOrdersList(await deps.buildOrdersList(context.searchParams), actor));
      return true;
    }
    if (context.pathname === '/api/admin/orders' || context.pathname === '/api/admin/external-orders') {
      const sessionUser = (context.request as typeof context.request & { adminSessionUser?: { roles?: string[] } }).adminSessionUser;
      const canReadPii = sessionUser ? adminRolesMayReadOrderPii(sessionUser.roles || []) : true;
      const orders = await deps.buildOrdersList(context.searchParams, { includePiiSearch: canReadPii });
      sendJson(context.response, projectAdminOrdersPii(orders, canReadPii));
      return true;
    }

    const detailMatch = matchPath(context.pathname, /^\/api\/admin\/(?:orders|external-orders)\/([^/]+)$/);
    if (detailMatch?.[0]) {
      const detail = await deps.buildOrderDetail(detailMatch[0]);
      const sessionUser = (context.request as typeof context.request & { adminSessionUser?: { roles?: string[] } }).adminSessionUser;
      const canReadPii = sessionUser ? adminRolesMayReadOrderPii(sessionUser.roles || []) : true;
      sendJson(context.response, detail ? projectAdminOrdersPii(detail, canReadPii) : { error: 'order_not_found' }, { statusCode: detail ? 200 : 404 });
      return true;
    }

    return false;
  };
}
