import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminOrdersReadHandlerDependencies {
  enabled: boolean;
  buildOrdersList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildOrderDetail: (orderKey: string) => Promise<unknown | null>;
}

export function createAdminOrdersReadRouteHandler(
  deps: AdminOrdersReadHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    if (context.pathname === '/api/admin/orders' || context.pathname === '/api/admin/external-orders') {
      sendJson(context.response, await deps.buildOrdersList(context.searchParams));
      return true;
    }

    const detailMatch = matchPath(context.pathname, /^\/api\/admin\/(?:orders|external-orders)\/([^/]+)$/);
    if (detailMatch?.[0]) {
      const detail = await deps.buildOrderDetail(detailMatch[0]);
      sendJson(context.response, detail || { error: 'order_not_found' }, { statusCode: detail ? 200 : 404 });
      return true;
    }

    return false;
  };
}
