import { isProjectionRequestAuthorized } from './public-finance-projection-handler.js';
import { sendJson } from './http.js';
import { verifyOrderAccessToken } from './order-access.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicCheckoutOrdersRouteHandlerDependencies {
  projectionToken?: string | null;
  orderAccessSecret?: string | null;
  requireOrderAccess?: boolean;
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
      if (deps.requireOrderAccess && !verifyOrderAccessToken({
        secret: deps.orderAccessSecret,
        publicCode: orderMatch[0],
        token: firstHeader(context.request.headers['x-daibilet-order-access']),
      })) {
        sendJson(context.response, { error: 'checkout_order_not_found' }, { statusCode: 404 });
        return true;
      }
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

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
