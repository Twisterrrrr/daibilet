import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { ReviewSupplierLegalProfileInput } from './admin-supplier-legal-review.js';
import type { AdminSupplierInviteRequestDto } from '@daibilet/contracts/admin';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';
import { z } from 'zod';

export interface AdminSuppliersRouteHandlerDependencies {
  buildSuppliersList: (searchParams: URLSearchParams) => Promise<unknown>;
  buildSupplierDetail: (idOrSlug: string) => Promise<unknown>;
  reviewSupplierLegalProfile: (input: ReviewSupplierLegalProfileInput) => Promise<unknown>;
  inviteSupplierUser: (supplierIdOrSlug: string, input: AdminSupplierInviteRequestDto) => Promise<unknown>;
}

const approveLegalBodySchema = z.object({
  adminComment: z.string().trim().max(2000).nullable().optional(),
}).strict();

const rejectLegalBodySchema = z.object({
  adminComment: z.string().trim().min(1).max(2000),
}).strict();

const inviteSupplierUserBodySchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(200).nullable().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'OPERATOR', 'ACCOUNTANT', 'VIEWER']),
}).strict();

export function createAdminSuppliersRouteHandler(
  deps: AdminSuppliersRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (await handleSupplierUserInvite(context, deps)) return true;
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

async function handleSupplierUserInvite(
  context: RouteContext,
  deps: AdminSuppliersRouteHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'POST') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/suppliers\/([^/]+)\/users\/invite$/);
  const supplierIdOrSlug = match?.[0];
  if (!supplierIdOrSlug) return false;

  const body = await parseJsonBody(inviteSupplierUserBodySchema, context.request);
  sendJson(
    context.response,
    await deps.inviteSupplierUser(supplierIdOrSlug, {
      email: body.email,
      role: body.role,
      ...(body.name != null ? { name: body.name } : {}),
    }),
    { statusCode: 201 },
  );
  return true;
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
