import type {
  AdminEventChangeRequestActionDto,
  AdminEventChangeRequestDetailDto,
  AdminEventChangeRequestsListDto,
} from '@daibilet/contracts/admin';
import { z } from 'zod';
import type { AdminEventChangeRequestsQuery } from './admin-event-change-requests.dto.js';
import type { ApplyEventChangeRequestInput, ApplyEventChangeRequestResult } from './event-change-request-applier.js';
import type { ReviewEventChangeRequestInput } from './event-change-request-review.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody, parseSearchParams } from './validation.js';

export type BuildAdminEventChangeRequests = (
  query: AdminEventChangeRequestsQuery,
) => Promise<AdminEventChangeRequestsListDto>;

export type BuildAdminEventChangeRequestDetail = (
  requestId: string,
) => Promise<AdminEventChangeRequestDetailDto | null>;

export type ApplyEventChangeRequest = (
  input: ApplyEventChangeRequestInput,
) => Promise<ApplyEventChangeRequestResult>;

export type ReviewEventChangeRequest = (
  input: ReviewEventChangeRequestInput,
) => Promise<AdminEventChangeRequestActionDto>;

export interface AdminEventChangeRequestsHandlerDependencies {
  buildEventChangeRequests: BuildAdminEventChangeRequests;
  buildEventChangeRequestDetail: BuildAdminEventChangeRequestDetail;
  reviewEventChangeRequest: ReviewEventChangeRequest;
  applyEventChangeRequest: ApplyEventChangeRequest;
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean }) => void;
}

const listQuerySchema = z.object({
  status: z.string().trim().optional(),
  type: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  eventId: z.string().trim().optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
}).strict();

const approveBodySchema = z.object({
  adminComment: z.string().trim().max(2000).optional(),
}).strict();

const rejectBodySchema = z.object({
  adminComment: z.string().trim().min(1).max(2000),
}).strict();

export function createAdminEventChangeRequestsRouteHandler(
  deps: AdminEventChangeRequestsHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (await handleList(context, deps)) return true;
    if (await handleDetail(context, deps)) return true;
    if (await handleApprove(context, deps)) return true;
    if (await handleReject(context, deps)) return true;
    return handleApply(context, deps);
  };
}

async function handleList(
  context: RouteContext,
  deps: AdminEventChangeRequestsHandlerDependencies,
): Promise<boolean> {
  if (context.route !== 'GET /api/admin/event-change-requests') return false;

  const query = parseSearchParams(listQuerySchema, context.searchParams);
  sendJson(context.response, await deps.buildEventChangeRequests(query));
  return true;
}

async function handleDetail(
  context: RouteContext,
  deps: AdminEventChangeRequestsHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'GET') return false;
  const requestId = matchDetailPath(context);
  if (!requestId) return false;

  const detail = await deps.buildEventChangeRequestDetail(requestId);
  if (!detail) {
    sendJson(context.response, { error: 'event_change_request_not_found' }, { statusCode: 404 });
    return true;
  }

  sendJson(context.response, detail);
  return true;
}

async function handleApprove(
  context: RouteContext,
  deps: AdminEventChangeRequestsHandlerDependencies,
): Promise<boolean> {
  const requestId = matchActionPath(context, 'approve');
  if (!requestId) return false;

  const body = await parseJsonBody(approveBodySchema, context.request);
  const result = await deps.reviewEventChangeRequest({
    requestId,
    action: 'approve',
    adminComment: body.adminComment,
  });
  sendJson(context.response, result);
  return true;
}

async function handleReject(
  context: RouteContext,
  deps: AdminEventChangeRequestsHandlerDependencies,
): Promise<boolean> {
  const requestId = matchActionPath(context, 'reject');
  if (!requestId) return false;

  const body = await parseJsonBody(rejectBodySchema, context.request);
  const result = await deps.reviewEventChangeRequest({
    requestId,
    action: 'reject',
    adminComment: body.adminComment,
  });
  sendJson(context.response, result);
  return true;
}

async function handleApply(
  context: RouteContext,
  deps: AdminEventChangeRequestsHandlerDependencies,
): Promise<boolean> {
  const requestId = matchActionPath(context, 'apply');
  if (!requestId) return false;

  const result = await deps.applyEventChangeRequest({ requestId });
  deps.invalidatePublicCaches('event change request apply', { warm: true });
  sendJson(context.response, result);
  return true;
}

function matchActionPath(context: RouteContext, action: 'approve' | 'reject' | 'apply'): string | null {
  if (context.method !== 'POST') return null;
  const match = matchPath(
    context.pathname,
    new RegExp(`^/api/admin/event-change-requests/([^/]+)/${action}$`),
  );
  return match?.[0] || null;
}

function matchDetailPath(context: RouteContext): string | null {
  const match = matchPath(context.pathname, /^\/api\/admin\/event-change-requests\/([^/]+)$/);
  return match?.[0] || null;
}
