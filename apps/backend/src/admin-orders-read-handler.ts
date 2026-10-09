import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminOrdersReadHandlerDependencies {
  enabled: boolean;
  buildOrdersList: (searchParams: URLSearchParams) => Promise<unknown>;
}

export function createAdminOrdersReadRouteHandler(
  deps: AdminOrdersReadHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    if (context.pathname !== '/api/admin/orders' && context.pathname !== '/api/admin/external-orders') {
      return false;
    }
    sendJson(context.response, await deps.buildOrdersList(context.searchParams));
    return true;
  };
}
