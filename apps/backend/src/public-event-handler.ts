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
    if (!payload) {
      // Never 200+null: web generateMetadata treats thrown cache-miss as HTTP 500.
      sendPublicJson(context.response, { error: 'not_found' }, { statusCode: 404 });
      return true;
    }
    sendPublicJson(context.response, payload);
    return true;
  };
}
