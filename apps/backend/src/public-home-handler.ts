import { sendJson } from './http.js';
import { type RouteContext } from './routing.js';
import type { PublicHomeDto, PublicHomePreviewDto, PublicStatsDto } from './types/public.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicHomeHandlerDependencies {
  enabled: boolean;
  buildHome: (forceRefresh?: boolean) => Promise<PublicHomeDto>;
  buildHomePreview: (forceRefresh?: boolean) => Promise<PublicHomePreviewDto>;
  buildStats: (forceRefresh?: boolean) => Promise<PublicStatsDto>;
  invalidateCaches?: (reason: string) => void;
}

export function createPublicHomeRouteHandler(
  deps: PublicHomeHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled) return false;

    const forceRefresh = context.searchParams.get('refresh') === '1';
    if (context.route === 'GET /api/public/home') {
      if (forceRefresh) deps.invalidateCaches?.('public home refresh');
      sendJson(context.response, await deps.buildHome(forceRefresh));
      return true;
    }

    if (context.route === 'GET /api/public/home/preview') {
      if (forceRefresh) deps.invalidateCaches?.('public home preview refresh');
      sendJson(context.response, await deps.buildHomePreview(forceRefresh));
      return true;
    }

    if (context.route === 'GET /api/public/stats') {
      if (forceRefresh) deps.invalidateCaches?.('public stats refresh');
      sendJson(context.response, await deps.buildStats(forceRefresh));
      return true;
    }

    return false;
  };
}
