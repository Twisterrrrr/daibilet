import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AdminEventsReadHandlerDependencies {
  enabled: boolean;
  buildEventsList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildEventDetail: (eventId: string) => Promise<unknown>;
}

export function createAdminEventsReadRouteHandler(
  deps: AdminEventsReadHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (!deps.enabled || context.method !== 'GET') return false;

    if (context.pathname === '/api/admin/events') {
      sendJson(context.response, await deps.buildEventsList(context.searchParams));
      return true;
    }

    const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)$/);
    if (!match?.[0]) return false;

    sendJson(context.response, await deps.buildEventDetail(match[0]));
    return true;
  };
}
