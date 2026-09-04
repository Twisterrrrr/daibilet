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
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean; slug?: string }) => void;
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
  const result = await deps.updateAdminEventOverride(deps.db, eventId, payload);
  const slugRow = await deps.db
    .query('select slug from "Event" where id = $1 limit 1', [eventId])
    .catch(() => null);
  const overrideSlug =
    slugRow && 'rows' in slugRow
      ? (slugRow.rows?.[0] as { slug?: string } | undefined)?.slug
      : undefined;
  deps.invalidatePublicCaches(
    'event override update',
    overrideSlug ? { slug: overrideSlug } : {},
  );
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
  const result = await deps.updateAdminEventOverride(deps.db, eventId, { editorStatus: payload.editorStatus });
  const slugRow = await deps.db
    .query('select slug from "Event" where id = $1 limit 1', [eventId])
    .catch(() => null);
  const moderationSlug =
    slugRow && 'rows' in slugRow
      ? (slugRow.rows?.[0] as { slug?: string } | undefined)?.slug
      : undefined;
  deps.invalidatePublicCaches(
    'event moderation update',
    moderationSlug ? { slug: moderationSlug } : {},
  );
  sendJson(context.response, result);
  return true;
}
