import { sendJson } from './http.js';
import { buildBuyerPurchasesListDto } from './purchase-projection.js';
import type { RouteContext } from './routing.js';
import { requireSiteUserFromRequest } from './user-auth.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface AccountPurchasesRouteHandlerDependencies {
  db: unknown;
}

export function createAccountPurchasesRouteHandler(
  deps: AccountPurchasesRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'GET' || context.pathname !== '/api/account/purchases') return false;

    const user = await requireSiteUserFromRequest(deps.db, context.request) as {
      id: string;
      email: string;
      emailVerifiedAt: Date | string | null;
    };

    sendJson(
      context.response,
      await buildBuyerPurchasesListDto({
        siteUserId: user.id,
        // A password-only account does not prove ownership of guest purchases.
        email: user.emailVerifiedAt ? user.email : '',
        searchParams: context.searchParams,
      }),
    );
    return true;
  };
}
