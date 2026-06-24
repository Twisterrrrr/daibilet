import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from './http.js';
import { createRouteContext, type RouteContext } from './routing.js';
import {
  adminEventsQuerySchema,
  adminOrdersQuerySchema,
  lookupQuerySchema,
  paginationQuerySchema,
  publicCatalogQuerySchema,
  searchQuerySchema,
} from './types/schemas.js';
import { isRequestValidationError, parseSearchParams } from './validation.js';

export type AsyncRequestHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;

export function createValidatedHandler(legacyHandler: AsyncRequestHandler): AsyncRequestHandler {
  return async (request, response) => {
    try {
      const context = createRouteContext(request, response);
      validateSafeRouteQuery(context);
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

function validateSafeRouteQuery(context: RouteContext): void {
  if (context.method !== 'GET') return;

  const route = context.route;
  if (route === 'GET /api/public/events') {
    parseSearchParams(publicCatalogQuerySchema, context.searchParams);
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

  if (
    route === 'GET /api/admin/venues' ||
    route === 'GET /api/admin/buyers' ||
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
