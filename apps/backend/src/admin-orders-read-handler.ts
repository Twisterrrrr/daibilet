import { safeEqualString } from './auth.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminOrdersReadHandlerDependencies {
  enabled: boolean;
  buildOrdersList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildOrderDetail: (orderKey: string) => Promise<unknown | null>;
  internalReadToken?: string | null;
}

export function createAdminOrdersReadRouteHandler(
  deps: AdminOrdersReadHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    if (context.pathname === '/api/internal/admin/orders') {
      const expected = deps.internalReadToken?.trim();
      const header = String(context.request.headers.authorization || '');
      const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!expected || !provided || !safeEqualString(provided, expected)) {
        sendJson(context.response, { error: 'admin_read_auth_required' }, { statusCode: 401 });
        return true;
      }
      sendJson(context.response, await deps.buildOrdersList(context.searchParams));
      return true;
    }
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
