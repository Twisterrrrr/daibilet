import type { DbClient } from './types/db.js';
import type { EventModerationPayload, EventOverridePayload } from './types/schemas.js';
import {
  AiRewriteError,
  rewriteEventDescription,
  type RewriteDescriptionResult,
} from './ai-rewrite-description.js';
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

export type LoadEventDescriptionForRewrite = (eventId: string) => Promise<{
  title: string | null;
  sourceDescription: string | null;
  overrideDescription: string | null;
} | null>;

export type RewriteEventDescriptionFn = (params: {
  eventId: string;
  originalDescription: string;
  meta?: { title?: string | null };
}) => Promise<RewriteDescriptionResult>;

export interface AdminEventsHandlerDependencies {
  db: DbClient;
  updateAdminEventOverride: UpdateAdminEventOverride;
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean; slug?: string }) => void;
  loadEventDescriptionForRewrite?: LoadEventDescriptionForRewrite;
  rewriteEventDescription?: RewriteEventDescriptionFn;
}

export function createAdminEventsRouteHandler(deps: AdminEventsHandlerDependencies): TypedRouteHandler {
  return async (context) => {
    if (await handleEventDescriptionRewrite(context, deps)) return true;
    if (await handleEventOverrideUpdate(context, deps)) return true;
    return handleEventModerationUpdate(context, deps);
  };
}

async function handleEventDescriptionRewrite(
  context: RouteContext,
  deps: AdminEventsHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'POST') return false;

  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/rewrite-description$/);
  if (!match) return false;

  const [eventId] = match;
  if (!eventId) return false;

  const load =
    deps.loadEventDescriptionForRewrite ||
    ((id: string) => loadEventDescriptionForRewriteFromDb(deps.db, id));
  const rewrite = deps.rewriteEventDescription || rewriteEventDescription;

  const row = await load(eventId);
  if (!row) {
    sendJson(context.response, { error: 'event_not_found', message: 'Событие не найдено' }, { statusCode: 404 });
    return true;
  }

  const source = String(row.sourceDescription || '').trim();
  const override = String(row.overrideDescription || '').trim();
  const originalDescription = source || override;
  if (!originalDescription) {
    sendJson(
      context.response,
      { error: 'empty_description', message: 'Нет исходного описания для рерайта' },
      { statusCode: 400 },
    );
    return true;
  }

  try {
    const result = await rewrite({
      eventId,
      originalDescription,
      meta: { title: row.title },
    });
    // Explicitly do NOT call updateAdminEventOverride — UI Save owns the write.
    sendJson(context.response, {
      text: result.text,
      model: result.model,
      truncatedInput: result.truncatedInput,
      sourceUsed: source ? 'source' : 'override',
    });
  } catch (error) {
    if (error instanceof AiRewriteError) {
      sendJson(
        context.response,
        { error: error.code, message: error.message },
        { statusCode: error.statusCode },
      );
      return true;
    }
    throw error;
  }

  return true;
}

export async function loadEventDescriptionForRewriteFromDb(
  db: DbClient,
  eventId: string,
): Promise<{
  title: string | null;
  sourceDescription: string | null;
  overrideDescription: string | null;
} | null> {
  const result = await db.query(
    `
      select
        e.title,
        e.description as "sourceDescription",
        override.description as "overrideDescription"
      from "Event" e
      left join "EventOverride" override on override."eventId" = e.id
      where e.id = $1
      limit 1
    `,
    [eventId],
  );
  const row = result.rows?.[0] as
    | {
        title?: string | null;
        sourceDescription?: string | null;
        overrideDescription?: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    title: row.title ?? null,
    sourceDescription: row.sourceDescription ?? null,
    overrideDescription: row.overrideDescription ?? null,
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
