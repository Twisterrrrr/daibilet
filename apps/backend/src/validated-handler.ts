import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AdminAuthConfig } from './auth.js';
import { isAuthorizedAdminRequest, isProtectedPath } from './auth.js';
import { sendAuthRequired, sendJson } from './http.js';
import { createRouteContext, type RouteContext } from './routing.js';
import {
  adminEventsQuerySchema,
  adminFinanceQuerySchema,
  adminOrdersQuerySchema,
  lookupQuerySchema,
  paginationQuerySchema,
  publicCatalogQuerySchema,
  publicFinanceProjectionQuerySchema,
  searchQuerySchema,
} from './types/schemas.js';
import { isRequestValidationError, parseSearchParams } from './validation.js';

export type AsyncRequestHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;
export type TypedRouteHandler = (context: RouteContext) => boolean | Promise<boolean>;

export interface ValidatedHandlerOptions {
  adminAuth?: AdminAuthConfig;
  routeHandlers?: TypedRouteHandler[];
}

export function createValidatedHandler(
  legacyHandler: AsyncRequestHandler,
  options: ValidatedHandlerOptions = {},
): AsyncRequestHandler {
  return async (request, response) => {
    try {
      const context = createRouteContext(request, response);
      if (options.adminAuth && isProtectedPath(context.pathname) && !isAuthorizedAdminRequest(request, options.adminAuth)) {
        sendAuthRequired(response, options.adminAuth);
        return;
      }

      validateSafeRouteQuery(context);

      for (const routeHandler of options.routeHandlers || []) {
        if (await routeHandler(context)) return;
      }

      await legacyHandler(request, response);
    } catch (error) {
      if (response.writableEnded) return;

      if (isRequestValidationError(error)) {
        sendJson(response, error.toDto(), { statusCode: 400 });
        return;
      }

      if (response.headersSent) {
        response.end();
        return;
      }

      const statusCode = errorStatusCode(error);
      if (statusCode) {
        const message = error instanceof Error ? error.message : String(error);
        sendJson(response, { error: message }, { statusCode });
        return;
      }

      sendJson(
        response,
        {
          error: 'internal_error',
          message: error instanceof Error ? error.message : String(error),
        },
        { statusCode: 500 },
      );
    }
  };
}

function errorStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value >= 400 && value <= 599 ? value : null;
}

function validateSafeRouteQuery(context: RouteContext): void {
  if (context.method !== 'GET') return;

  const route = context.route;
  if (route === 'GET /api/public/events') {
    parseSearchParams(publicCatalogQuerySchema, context.searchParams);
    return;
  }

  if (
    route === 'GET /api/public/admission-products' ||
    route === 'GET /api/public/finance/admission-products' ||
    /^GET \/api\/public(?:\/finance)?\/admission-products\/[^/]+$/.test(route) ||
    /^GET \/api\/public(?:\/finance)?\/venues\/[^/]+\/admission-products$/.test(route) ||
    /^GET \/api\/public(?:\/finance)?\/suppliers\/[^/]+$/.test(route)
  ) {
    parseSearchParams(publicFinanceProjectionQuerySchema, context.searchParams);
    return;
  }

  if (route === 'GET /api/public/orders') {
    parseSearchParams(lookupQuerySchema, context.searchParams);
    return;
  }

  if (route === 'GET /api/admin/events') {
    parseSearchParams(adminEventsQuerySchema, context.searchParams);
    return;
  }

  if (route === 'GET /api/admin/orders') {
    parseSearchParams(adminOrdersQuerySchema, context.searchParams);
    return;
  }

  if (route === 'GET /api/admin/finance/ledger' || route === 'GET /api/admin/finance/reconcile') {
    parseSearchParams(adminFinanceQuerySchema, context.searchParams);
    return;
  }

  if (
    route === 'GET /api/admin/venues' ||
    route === 'GET /api/admin/buyers' ||
    route === 'GET /api/admin/suppliers' ||
    route === 'GET /api/admin/order-event-candidates'
  ) {
    parseSearchParams(searchQuerySchema, context.searchParams);
    return;
  }

  if (route === 'GET /api/admin/landings') {
    parseSearchParams(paginationQuerySchema, context.searchParams);
    return;
  }

  if (/^GET \/api\/admin\/landings\/[^/]+\/candidates$/.test(route)) {
    parseSearchParams(searchQuerySchema, context.searchParams);
  }
}
