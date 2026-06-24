import type { DbClient } from './types/db.js';
import type { EventOverridePayload } from './types/schemas.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import { eventOverridePayloadSchema } from './types/schemas.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export type UpdateAdminEventOverride = (
  db: DbClient,
  eventId: string,
  payload: EventOverridePayload,
) => Promise<unknown>;

export interface AdminEventsHandlerDependencies {
  db: DbClient;
  updateAdminEventOverride: UpdateAdminEventOverride;
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean }) => void;
}

export function createAdminEventsRouteHandler(deps: AdminEventsHandlerDependencies): TypedRouteHandler {
  return async (context) => handleEventOverrideUpdate(context, deps);
}

async function handleEventOverrideUpdate(
  context: RouteContext,
  deps: AdminEventsHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'PATCH') return false;

  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/override$/);
  if (!match) return false;

  const [eventId] = match;
  if (!eventId) return false;

  const payload = await parseJsonBody(eventOverridePayloadSchema, context.request);
  const result = await deps.updateAdminEventOverride(deps.db, eventId, payload);
  deps.invalidatePublicCaches('event override update');
  sendJson(context.response, result);
  return true;
}
