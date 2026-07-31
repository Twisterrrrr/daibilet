import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { ReviewSupplierLegalProfileInput } from './admin-supplier-legal-review.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';
import { z } from 'zod';

export interface AdminSuppliersRouteHandlerDependencies {
  buildSuppliersList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildSupplierDetail: (idOrSlug: string) => Promise<unknown>;
  reviewSupplierLegalProfile: (input: ReviewSupplierLegalProfileInput) => Promise<unknown>;
}

const approveLegalBodySchema = z.object({
  adminComment: z.string().trim().max(2000).nullable().optional(),
}).strict();

const rejectLegalBodySchema = z.object({
  adminComment: z.string().trim().min(1).max(2000),
}).strict();

export function createAdminSuppliersRouteHandler(
  deps: AdminSuppliersRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (await handleLegalApprove(context, deps)) return true;
    if (await handleLegalReject(context, deps)) return true;

    if (context.method !== 'GET') return false;

    if (context.pathname === '/api/admin/suppliers') {
      sendJson(context.response, await deps.buildSuppliersList(context.searchParams));
      return true;
    }

    const match = matchPath(context.pathname, /^\/api\/admin\/suppliers\/([^/]+)$/);
    if (!match) return false;

    const [idOrSlug] = match;
    if (!idOrSlug) return false;

    sendJson(context.response, await deps.buildSupplierDetail(idOrSlug));
    return true;
  };
}

async function handleLegalApprove(
  context: RouteContext,
  deps: AdminSuppliersRouteHandlerDependencies,
): Promise<boolean> {
  const supplierIdOrSlug = matchLegalActionPath(context, 'approve');
  if (!supplierIdOrSlug) return false;

  const body = await parseJsonBody(approveLegalBodySchema, context.request);
  sendJson(
    context.response,
    await deps.reviewSupplierLegalProfile({
      supplierIdOrSlug,
      action: 'approve',
      adminComment: body.adminComment ?? null,
    }),
  );
  return true;
}

async function handleLegalReject(
  context: RouteContext,
  deps: AdminSuppliersRouteHandlerDependencies,
): Promise<boolean> {
  const supplierIdOrSlug = matchLegalActionPath(context, 'reject');
  if (!supplierIdOrSlug) return false;

  const body = await parseJsonBody(rejectLegalBodySchema, context.request);
  sendJson(
    context.response,
    await deps.reviewSupplierLegalProfile({
      supplierIdOrSlug,
      action: 'reject',
      adminComment: body.adminComment,
    }),
  );
  return true;
}

function matchLegalActionPath(context: RouteContext, action: 'approve' | 'reject'): string | null {
  if (context.method !== 'POST') return null;
  const match = matchPath(context.pathname, new RegExp(`^/api/admin/suppliers/([^/]+)/legal/${action}$`));
  return match?.[0] || null;
}
