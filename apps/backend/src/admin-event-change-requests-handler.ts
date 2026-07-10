import type { ApplyEventChangeRequestInput, ApplyEventChangeRequestResult } from './event-change-request-applier.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';

export type ApplyEventChangeRequest = (
  input: ApplyEventChangeRequestInput,
) => Promise<ApplyEventChangeRequestResult>;

export interface AdminEventChangeRequestsHandlerDependencies {
  applyEventChangeRequest: ApplyEventChangeRequest;
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean }) => void;
}

export function createAdminEventChangeRequestsRouteHandler(
  deps: AdminEventChangeRequestsHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'POST') return false;

    const match = matchPath(context.pathname, /^\/api\/admin\/event-change-requests\/([^/]+)\/apply$/);
    if (!match) return false;

    const [requestId] = match;
    if (!requestId) return false;

    const result = await deps.applyEventChangeRequest({ requestId });
    deps.invalidatePublicCaches('event change request apply', { warm: true });
    sendJson(context.response, result);
    return true;
  };
}
