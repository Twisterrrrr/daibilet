import { sendJson } from './http.js';
import { adminRolesMayReadOrderPii } from './admin-rbac-policy.js';
import { projectAdminOrdersPii } from './admin-order-pii.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminOrdersReadHandlerDependencies {
  enabled: boolean;
  buildOrdersList: (searchParams: URLSearchParams, options: { includePiiSearch: boolean }) => Promise<unknown>;
}

export function createAdminOrdersReadRouteHandler(
  deps: AdminOrdersReadHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    if (context.pathname !== '/api/admin/orders' && context.pathname !== '/api/admin/external-orders') {
      return false;
    }
    const actor = (context.request as typeof context.request & { adminSessionUser?: { roles?: string[] } }).adminSessionUser;
    const canReadPii = actor ? adminRolesMayReadOrderPii(actor.roles) : true;
    const payload = await deps.buildOrdersList(context.searchParams, { includePiiSearch: canReadPii });
    sendJson(context.response, projectAdminOrdersPii(payload, canReadPii));
    return true;
  };
}
