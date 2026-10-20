import type { DbClient } from './types/db.js';
import { z } from 'zod';

import {
  AiRewriteError,
  normalizeScheduledDurationMinutes,
  rewriteEventDescription,
  type RewriteDescriptionResult,
} from './ai-rewrite-description.js';
import type { RewriteEventDescriptionFn } from './admin-events-handler.js';
import { checkRewriteDraft, statusAfterQa } from './description-revision-qa.js';
import {
  descriptionContentHashOfRow,
  descriptionSourceHashOfRow,
  type DescriptionSourceHashRow,
} from './description-source-hash.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export const REWRITE_PROMPT_VERSION = 'hexagon-v1';

const generateBodySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).optional() });
const approveBodySchema = z.object({ finalText: z.string().max(20_000).optional() });

export interface DescriptionRevisionHandlerDependencies {
  db: DbClient;
  rewrite?: RewriteEventDescriptionFn;
  invalidatePublicCaches?: (reason: string, options?: { warm?: boolean; slug?: string }) => void;
  /**
   * Authenticated admin identity for the approval audit trail. Injected so the
   * identity ticket can wire the session in without touching the SQL again; until
   * then the stored value stays the legacy placeholder.
   */
  resolveActor?: (context: RouteContext) => string | null;
}

/**
 * Full hash canon (v2), shared with scripts/post-sync-event-descriptions.js. Written
 * to EventOverride.descriptionSourceHash: it includes the now()-relative session
 * fields, so the post-sync hook rebuilds the text when the nearest session moves.
 */
export function sourceHashOf(row: DescriptionSourceHashRow): string {
  return descriptionSourceHashOfRow(row);
}

/**
 * Content hash canon (v2c): what EventDescriptionRevision.sourceHash stores and
 * what STALE is decided by. A passing session must not expire an approval, so the
 * now()-relative fields are excluded here.
 */
export function contentHashOf(row: DescriptionSourceHashRow): string {
  return descriptionContentHashOfRow(row);
}

type RevisionRow = {
  id: string;
  eventId: string;
  status: string;
  priority: string | null;
  sourceHash: string;
  sourceText: string | null;
  draftText: string | null;
  finalText: string | null;
  model: string | null;
  qaFlags: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
  title?: string | null;
  slug?: string | null;
  city?: string | null;
};

function revisionDto(row: RevisionRow) {
  return {
    id: row.id,
    eventId: row.eventId,
    status: row.status,
    priority: row.priority,
    sourceHash: row.sourceHash,
    sourceText: row.sourceText || '',
    draftText: row.draftText || null,
    finalText: row.finalText || null,
    model: row.model || null,
    qaFlags: Array.isArray(row.qaFlags) ? row.qaFlags : [],
    eventTitle: row.title || null,
    eventSlug: row.slug || null,
    city: row.city || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function handleList(context: RouteContext, deps: DescriptionRevisionHandlerDependencies): Promise<boolean> {
  if (context.method !== 'GET') return false;
  if (context.pathname !== '/api/admin/rewrite-queue') return false;

  const params = context.searchParams || new URLSearchParams();
  const status = (params.get('status') || '').trim().toUpperCase();
  const limit = Math.min(Math.max(Number(params.get('limit') || 50) || 50, 1), 200);
  const result = await deps.db.query(
    `
      select
        r.id, r."eventId", r.status::text as status, r.priority, r."sourceHash",
        r."sourceText", r."draftText", r."finalText", r.model, r."qaFlags",
        r."createdAt", r."updatedAt",
        e.title, e.slug, c.title as city
      from "EventDescriptionRevision" r
      join "Event" e on e.id = r."eventId"
      left join "City" c on c.id = e."primaryCityId"
      where ($1::text = '' or r.status::text = $1)
      order by case r.priority when 'A' then 0 when 'B' then 1 else 2 end, r."updatedAt" desc
      limit $2
    `,
    [status, limit],
  );
  const counts = await deps.db.query(
    `select status::text as status, count(*)::int as n from "EventDescriptionRevision" group by status`,
  );
  sendJson(context.response, {
    items: (result.rows as RevisionRow[]).map(revisionDto),
    counts: Object.fromEntries((counts.rows as Array<{ status: string; n: number }>).map((row) => [row.status, row.n])),
  });
  return true;
}

async function loadRevisionContext(db: DbClient, revisionId: string) {
  const result = await db.query(
    `
      select
        r.id, r."eventId", r.status::text as status, r.priority, r."sourceHash",
        r."sourceText", r."draftText", r."finalText", r.model, r."qaFlags",
        r."createdAt", r."updatedAt",
        e.title, e.slug, e."priceFromRub", e."ageLimit", e.kind::text as kind,
        e.description as source_description,
        coalesce(o.title, e.title) as eff_title,
        c.title as city, v.title as venue, v.address as venue_address,
        cat.title as category, sub.title as subcategory,
        (
          select min(s2."startsAt") from "EventSession" s2
          where s2."eventId" = e.id and s2."isActive" is not false
            and s2."cancelledAt" is null and s2."startsAt" >= now()
        ) as next_session,
        (
          select count(*)::int from "EventSession" s3
          where s3."eventId" = e.id and s3."isActive" is not false
            and s3."cancelledAt" is null and s3."startsAt" >= now()
        ) as future_sessions,
        (
          select array_agg(distinct ((extract(epoch from (s4."endsAt" - s4."startsAt")) / 60))::int)
          from "EventSession" s4
          where s4."eventId" = e.id and s4."isActive" is not false
            and s4."cancelledAt" is null and s4."startsAt" >= now()
            and s4."endsAt" > s4."startsAt"
        ) as durations,
        coalesce(
          array_agg(
            distinct extract(epoch from (s."endsAt" - s."startsAt")) / 60.0
          ) filter (
            where s."startsAt" is not null and s."endsAt" is not null
              and s."endsAt" > s."startsAt" and s."isActive" = true
          ), '{}'::numeric[]
        ) as "sessionDurationMinutes"
      from "EventDescriptionRevision" r
      join "Event" e on e.id = r."eventId"
      left join "EventOverride" o on o."eventId" = e.id
      left join "City" c on c.id = e."primaryCityId"
      left join "Venue" v on v.id = e."venueId"
      left join "Category" cat on cat.id = e."categoryId"
      left join "Subcategory" sub on sub.id = e."primarySubcategoryId"
      left join "EventSession" s on s."eventId" = e.id
      where r.id = $1
      group by r.id, e.id, o.id, c.id, v.id, cat.id, sub.id
      limit 1
    `,
    [revisionId],
  );
  const row = result.rows?.[0] as
    | (RevisionRow & DescriptionSourceHashRow & { sessionDurationMinutes?: unknown[] | null })
    | undefined;
  if (!row) return null;
  return {
    row,
    scheduledDurationMinutes: normalizeScheduledDurationMinutes(row.sessionDurationMinutes),
    sourceDescription: row.source_description ?? row.sourceDescription ?? null,
    slug: row.slug ?? null,
  };
}

/**
 * POST /api/admin/rewrite-queue/generate - draft N QUEUED revisions with the
 * safety-hexagon prompt, run the deterministic fact-check, store results. Never
 * publishes.
 */
async function handleGenerate(context: RouteContext, deps: DescriptionRevisionHandlerDependencies): Promise<boolean> {
  if (context.method !== 'POST') return false;
  if (context.pathname !== '/api/admin/rewrite-queue/generate') return false;

  const body = await parseJsonBody(generateBodySchema, context.request);
  const limit = body.limit || 10;
  const rewrite = deps.rewrite || rewriteEventDescription;

  const queued = await deps.db.query(
    `
      select r.id
      from "EventDescriptionRevision" r
      where r.status = 'QUEUED'
      order by case r.priority when 'A' then 0 when 'B' then 1 else 2 end, r."updatedAt" asc
      limit $1
    `,
    [limit],
  );

  const results: Array<{ id: string; status: string; flags: number; error?: string }> = [];
  for (const item of queued.rows as Array<{ id: string }>) {
    const loaded = await loadRevisionContext(deps.db, item.id);
    if (!loaded) continue;
    const sourceText = String(loaded.row.sourceText || loaded.sourceDescription || '').trim();
    if (!sourceText) {
      results.push({ id: item.id, status: 'QUEUED', flags: 0, error: 'empty_source' });
      continue;
    }
    try {
      const result: RewriteDescriptionResult = await rewrite({
        eventId: loaded.row.eventId,
        originalDescription: sourceText,
        meta: {
          title: loaded.row.title ?? null,
          scheduledDurationMinutes: loaded.scheduledDurationMinutes,
        },
      });
      const flags = checkRewriteDraft(result.text, {
        sourceText,
        title: loaded.row.title ?? null,
        city: loaded.row.city ?? null,
        scheduledDurationMinutes: loaded.scheduledDurationMinutes,
      });
      const status = statusAfterQa(flags);
      await deps.db.query(
        `update "EventDescriptionRevision"
         set "draftText" = $2, model = $3, "promptVersion" = $4, "qaFlags" = $5::jsonb,
             status = $6::"DescriptionRevisionStatus", "updatedAt" = now()
         where id = $1`,
        [item.id, result.text, result.model, REWRITE_PROMPT_VERSION, JSON.stringify(flags), status],
      );
      results.push({ id: item.id, status, flags: flags.length });
    } catch (error) {
      const message = error instanceof AiRewriteError ? error.message : String((error as Error)?.message || error);
      results.push({ id: item.id, status: 'QUEUED', flags: 0, error: message.slice(0, 200) });
    }
  }

  sendJson(context.response, { generated: results.length, results });
  return true;
}

/**
 * POST /api/admin/rewrite-queue/:id/approve - editorial confirmation.
 *
 * Moves GENERATED/CHECKED to APPROVED and stores the editor-supplied finalText.
 * Does NOT touch the public page: publication is POST /publish. Refuses when the
 * source changed since enqueue (stale).
 */
async function handleApprove(context: RouteContext, deps: DescriptionRevisionHandlerDependencies): Promise<boolean> {
  if (context.method !== 'POST') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/rewrite-queue\/([^/]+)\/approve$/);
  if (!match) return false;
  const revisionId = match[0];
  if (!revisionId) return false;

  const body = await parseJsonBody(approveBodySchema, context.request);
  const loaded = await loadRevisionContext(deps.db, revisionId);
  if (!loaded) {
    sendJson(context.response, { error: 'revision_not_found', message: 'Ревизия не найдена' }, { statusCode: 404 });
    return true;
  }

  const currentHash = contentHashOf(loaded.row);
  if (currentHash !== loaded.row.sourceHash) {
    await deps.db.query(
      `update "EventDescriptionRevision" set status = 'STALE', "updatedAt" = now() where id = $1`,
      [revisionId],
    );
    sendJson(
      context.response,
      { error: 'stale_source', message: 'Исходное описание изменилось - черновик устарел, нужна новая генерация' },
      { statusCode: 409 },
    );
    return true;
  }

  const finalText = String(body.finalText || loaded.row.draftText || '').trim();
  if (!finalText) {
    sendJson(context.response, { error: 'empty_draft', message: 'Нет черновика для одобрения' }, { statusCode: 400 });
    return true;
  }

  // Editorial confirmation only. Publishing is a separate, deliberate action:
  // approval can be batched, publication follows its own window, and the audit
  // trail only means something when the two are different events.
  //
  // Actor policy: once `resolveActor` is wired, an unresolved actor refuses the
  // operation instead of silently writing a placeholder - a fake approver is worse
  // than no approval. Until the identity ticket lands, the legacy placeholder is
  // kept so the path stays usable.
  const actor = deps.resolveActor ? deps.resolveActor(context) : 'admin';
  if (!actor) {
    sendJson(
      context.response,
      { error: 'actor_unresolved', message: 'Не удалось определить администратора для аудита одобрения' },
      { statusCode: 409 },
    );
    return true;
  }

  const approved = await deps.db.query(
    `update "EventDescriptionRevision"
     set status = 'APPROVED', "finalText" = $2, "approvedBy" = $3, "approvedAt" = now(), "updatedAt" = now()
     where id = $1 and status in ('GENERATED', 'CHECKED')
     returning id`,
    [revisionId, finalText, actor],
  );
  if (!approved.rows?.length) {
    sendJson(
      context.response,
      {
        error: 'revision_not_approvable',
        message: 'Одобрить можно только ревизию в статусе GENERATED или CHECKED',
      },
      { statusCode: 409 },
    );
    return true;
  }

  sendJson(context.response, { ok: true, status: 'APPROVED', eventId: loaded.row.eventId, slug: loaded.slug });
  return true;
}

/**
 * POST /api/admin/rewrite-queue/:id/publish - APPROVED -> PUBLISHED.
 *
 * Writes the approved text into EventOverride.description with origin=AI. Refuses
 * anything that is not APPROVED, and re-checks the source hash: an approval made
 * before the input changed must not reach the public page.
 */
async function handlePublish(context: RouteContext, deps: DescriptionRevisionHandlerDependencies): Promise<boolean> {
  if (context.method !== 'POST') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/rewrite-queue\/([^/]+)\/publish$/);
  if (!match) return false;
  const revisionId = match[0];
  if (!revisionId) return false;

  const loaded = await loadRevisionContext(deps.db, revisionId);
  if (!loaded) {
    sendJson(context.response, { error: 'revision_not_found', message: 'Ревизия не найдена' }, { statusCode: 404 });
    return true;
  }

  if (loaded.row.status !== 'APPROVED') {
    sendJson(
      context.response,
      {
        error: 'revision_not_approved',
        message: 'Опубликовать можно только одобренную ревизию (APPROVED)',
      },
      { statusCode: 409 },
    );
    return true;
  }

  const currentHash = contentHashOf(loaded.row);
  if (currentHash !== loaded.row.sourceHash) {
    await deps.db.query(
      `update "EventDescriptionRevision" set status = 'STALE', "updatedAt" = now() where id = $1`,
      [revisionId],
    );
    sendJson(
      context.response,
      {
        error: 'stale_source',
        message: 'Исходное описание изменилось после одобрения - нужна новая генерация',
      },
      { statusCode: 409 },
    );
    return true;
  }

  const finalText = String(loaded.row.finalText || loaded.row.draftText || '').trim();
  if (!finalText) {
    sendJson(context.response, { error: 'empty_draft', message: 'Нет текста для публикации' }, { statusCode: 400 });
    return true;
  }

  await deps.db.query(
    `insert into "EventOverride" (id, "eventId", description, "descriptionOrigin", "descriptionSourceHash", "createdAt", "updatedAt")
     values ($1, $2, $3, 'AI', $4, now(), now())
     on conflict ("eventId") do update set
       description = excluded.description,
       "descriptionOrigin" = 'AI',
       "descriptionSourceHash" = excluded."descriptionSourceHash",
       "updatedAt" = now()`,
    [
      `eov_${revisionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`,
      loaded.row.eventId,
      finalText,
      // Full hash: the hook compares this one to decide whether to rebuild the text.
      sourceHashOf(loaded.row),
    ],
  );
  await deps.db.query(
    `update "EventDescriptionRevision"
     set status = 'PUBLISHED', "updatedAt" = now()
     where id = $1 and status = 'APPROVED'`,
    [revisionId],
  );
  deps.invalidatePublicCaches?.('rewrite queue publish', loaded.slug ? { slug: loaded.slug } : undefined);

  sendJson(context.response, {
    ok: true,
    status: 'PUBLISHED',
    eventId: loaded.row.eventId,
    slug: loaded.slug,
  });
  return true;
}

/** POST /api/admin/rewrite-queue/:id/reject - send the draft back to the queue. */
async function handleReject(context: RouteContext, deps: DescriptionRevisionHandlerDependencies): Promise<boolean> {
  if (context.method !== 'POST') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/rewrite-queue\/([^/]+)\/reject$/);
  if (!match) return false;
  const revisionId = match[0];
  if (!revisionId) return false;

  const result = await deps.db.query(
    `update "EventDescriptionRevision"
     set status = 'QUEUED', "draftText" = null, "qaFlags" = null, model = null, "updatedAt" = now()
     where id = $1 and status in ('GENERATED', 'CHECKED', 'STALE')
     returning id`,
    [revisionId],
  );
  if (!result.rows?.length) {
    sendJson(
      context.response,
      { error: 'revision_not_rejectable', message: 'Ревизия не найдена или уже опубликована' },
      { statusCode: 404 },
    );
    return true;
  }
  sendJson(context.response, { ok: true });
  return true;
}

export function createDescriptionRevisionRouteHandler(
  deps: DescriptionRevisionHandlerDependencies,
): TypedRouteHandler {
  return async (context) => {
    if (await handleList(context, deps)) return true;
    if (await handleGenerate(context, deps)) return true;
    if (await handleApprove(context, deps)) return true;
    if (await handlePublish(context, deps)) return true;
    return handleReject(context, deps);
  };
}
