import { sendJson } from './http';
import type { RouteContext } from './routing';
import type { TypedRouteHandler } from './validated-handler';

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
