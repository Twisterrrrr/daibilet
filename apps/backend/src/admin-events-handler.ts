import type { DbClient } from './types/db.js';
import type { EventModerationPayload, EventOverridePayload } from './types/schemas.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import { eventModerationPayloadSchema, eventOverridePayloadSchema } from './types/schemas.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export type UpdateAdminEventOverride = (
  db: DbClient,
  eventId: string,
  payload: EventOverridePayload | EventModerationPayload,
) => Promise<unknown>;

export interface AdminEventsHandlerDependencies {
  db: DbClient;
  updateAdminEventOverride: UpdateAdminEventOverride;
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean }) => void;
}

export function createAdminEventsRouteHandler(deps: AdminEventsHandlerDependencies): TypedRouteHandler {
  return async (context) => {
    if (await handleEventOverrideUpdate(context, deps)) return true;
    return handleEventModerationUpdate(context, deps);
  };
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
  const result = await updateEventOverrideOrReject(deps, eventId, payload, context);
  if (!result) return true;
  deps.invalidatePublicCaches('event override update');
  sendJson(context.response, result);
  return true;
}

async function handleEventModerationUpdate(
  context: RouteContext,
  deps: AdminEventsHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'PATCH') return false;

  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/moderation$/);
  if (!match) return false;

  const [eventId] = match;
  if (!eventId) return false;

  const payload = await parseJsonBody(eventModerationPayloadSchema, context.request);
  const result = await updateEventOverrideOrReject(deps, eventId, { editorStatus: payload.editorStatus }, context);
  if (!result) return true;
  deps.invalidatePublicCaches('event moderation update');
  sendJson(context.response, result);
  return true;
}

async function updateEventOverrideOrReject(
  deps: AdminEventsHandlerDependencies,
  eventId: string,
  payload: EventOverridePayload | EventModerationPayload,
  context: RouteContext,
): Promise<unknown | null> {
  try {
    return await deps.updateAdminEventOverride(deps.db, eventId, payload);
  } catch (error) {
    const statusCode = (error as { statusCode?: unknown })?.statusCode;
    if (statusCode !== 404 && statusCode !== 422) throw error;
    sendJson(context.response, { error: error instanceof Error ? error.message : 'event_publish_blocked' }, { statusCode });
    return null;
  }
}
