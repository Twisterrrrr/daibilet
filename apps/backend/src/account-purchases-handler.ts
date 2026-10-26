import { sendJson } from './http.js';
import { buildBuyerPurchasesListDto, createBuyerPurchaseRefundRequest } from './purchase-projection.js';
import { matchPath, type RouteContext } from './routing.js';
import { requireSiteUserFromRequest } from './user-auth.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { z } from 'zod';
import { parseJsonBody } from './validation.js';

export interface AccountPurchasesRouteHandlerDependencies {
  db: unknown;
  buildPurchasesList?: typeof buildBuyerPurchasesListDto;
  createRefundRequest?: typeof createBuyerPurchaseRefundRequest;
  resolveUser?: typeof requireSiteUserFromRequest;
}

const buyerRefundRequestPayloadSchema = z.object({
  reasonNote: z.string().trim().min(5).max(500),
}).strict();

export function createAccountPurchasesRouteHandler(
  deps: AccountPurchasesRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    const refundMatch = context.method === 'POST'
      ? matchPath(context.pathname, /^\/api\/account\/purchases\/([^/]+)\/refunds$/)
      : null;
    const isListRequest = context.method === 'GET' && context.pathname === '/api/account/purchases';
    if (!isListRequest && !refundMatch) return false;

    const user = await (deps.resolveUser || requireSiteUserFromRequest)(deps.db, context.request) as {
      id: string;
      email: string;
      emailVerifiedAt: Date | string | null;
    };

    if (refundMatch?.[0]) {
      const payload = await parseJsonBody(buyerRefundRequestPayloadSchema, context.request);
      try {
        const result = await (deps.createRefundRequest || createBuyerPurchaseRefundRequest)({
          publicCode: refundMatch[0],
          siteUserId: user.id,
          email: user.email,
          emailVerified: Boolean(user.emailVerifiedAt),
          reasonNote: payload.reasonNote,
        });
        sendJson(context.response, result, { statusCode: 201 });
      } catch (error) {
        const statusCode = typeof (error as { statusCode?: unknown })?.statusCode === 'number'
          ? (error as { statusCode: number }).statusCode
          : 500;
        if (statusCode === 409 && Array.isArray((error as { blockers?: unknown }).blockers)) {
          sendJson(context.response, {
            error: 'refund_request_blocked',
            blockers: (error as { blockers: string[] }).blockers,
          }, { statusCode });
          return true;
        }
        throw error;
      }
      return true;
    }

    sendJson(
      context.response,
      await (deps.buildPurchasesList || buildBuyerPurchasesListDto)({
        siteUserId: user.id,
        email: user.email,
        emailVerified: Boolean(user.emailVerifiedAt),
        searchParams: context.searchParams,
      }),
    );
    return true;
  };
}
