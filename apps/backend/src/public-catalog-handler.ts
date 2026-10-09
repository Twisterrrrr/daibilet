import { sendPublicJson } from './http';
import { type RouteContext } from './routing';
import { publicCatalogQuerySchema, type PublicCatalogQuery } from './types/schemas';
import type { PublicCatalogDto } from './types/public';
import type { TypedRouteHandler } from './validated-handler';
import { parseSearchParams } from './validation';

export interface PublicCatalogHandlerDependencies {
  enabled: boolean;
  buildPublicCatalog: (query: PublicCatalogQuery) => Promise<PublicCatalogDto>;
}

export function createPublicCatalogRouteHandler(
  deps: PublicCatalogHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.route !== 'GET /api/public/events') return false;

    const query = parseSearchParams(publicCatalogQuerySchema, context.searchParams);
    sendPublicJson(context.response, await deps.buildPublicCatalog(query));
    return true;
  };
}
