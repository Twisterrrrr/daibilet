import { sendPublicJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { PublicEventPageDto } from './types/public.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface PublicEventHandlerDependencies {
  enabled: boolean;
  buildPublicEvent: (slugOrId: string, forceRefresh?: boolean) => Promise<PublicEventPageDto | null>;
}

export function createPublicEventRouteHandler(
  deps: PublicEventHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;
    const match = matchPath(context.pathname, /^\/api\/public\/events\/([^/]+)$/);
    if (!match?.[0]) return false;
    const payload = await deps.buildPublicEvent(match[0], context.searchParams.get('refresh') === '1');
    sendPublicJson(context.response, payload);
    return true;
  };
}
