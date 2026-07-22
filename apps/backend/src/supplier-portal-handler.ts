import { sendJson } from './http.js';
import type { RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface SupplierPortalRouteHandlerDependencies {
  buildDashboard: (searchParams: URLSearchParams) => Promise<unknown>;
  buildProfile: (searchParams: URLSearchParams) => Promise<unknown>;
  buildEventsList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildOrdersList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildFinance: (searchParams: URLSearchParams) => Promise<unknown>;
  buildReviewsList: (searchParams: URLSearchParams) => Promise<unknown>;
}

export function createSupplierPortalRouteHandler(deps: SupplierPortalRouteHandlerDependencies): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET') return false;

    if (context.pathname === '/api/supplier/me' || context.pathname === '/api/supplier/profile') {
      sendJson(context.response, await deps.buildProfile(context.searchParams));
      return true;
    }

    if (context.pathname === '/api/supplier/dashboard') {
      sendJson(context.response, await deps.buildDashboard(context.searchParams));
      return true;
    }

    if (context.pathname === '/api/supplier/events') {
      sendJson(context.response, await deps.buildEventsList(context.searchParams));
      return true;
    }

    if (context.pathname === '/api/supplier/orders') {
      sendJson(context.response, await deps.buildOrdersList(context.searchParams));
      return true;
    }

    if (context.pathname === '/api/supplier/finance') {
      sendJson(context.response, await deps.buildFinance(context.searchParams));
      return true;
    }

    if (context.pathname === '/api/supplier/reviews') {
      sendJson(context.response, await deps.buildReviewsList(context.searchParams));
      return true;
    }

    return false;
  };
}
