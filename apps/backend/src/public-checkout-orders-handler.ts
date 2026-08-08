import { isProjectionRequestAuthorized } from './public-finance-projection-handler.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicCheckoutOrdersRouteHandlerDependencies {
  projectionToken?: string | null;
  buildOrderByCode: (publicCode: string) => Promise<unknown | null>;
  buildPurchasesByEmail: (searchParams: URLSearchParams) => Promise<unknown>;
}

export function createPublicCheckoutOrdersRouteHandler(
  deps: PublicCheckoutOrdersRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET') return false;

    const orderMatch = matchPath(context.pathname, /^\/api\/(?:public\/)?checkout\/orders\/([^/]+)$/);
    if (orderMatch?.[0]) {
      const detail = await deps.buildOrderByCode(orderMatch[0]);
      sendJson(context.response, detail || { error: 'checkout_order_not_found' }, { statusCode: detail ? 200 : 404 });
      return true;
    }

    if (context.pathname === '/api/public/purchases' || context.pathname === '/api/public/checkout/purchases') {
      if (!isProjectionRequestAuthorized(context.request, deps.projectionToken)) {
        sendJson(context.response, { error: 'finance_projection_auth_required' }, { statusCode: 401 });
        return true;
      }
      sendJson(context.response, await deps.buildPurchasesByEmail(context.searchParams));
      return true;
    }

    return false;
  };
}
