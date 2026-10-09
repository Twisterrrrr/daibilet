import type { DbClient } from './types/db.js';
import type { LandingMatchPayload } from './types/schemas.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import { landingMatchPayloadSchema } from './types/schemas.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export type UpdateAdminLandingMatch = (
  db: DbClient,
  landingSlug: string,
  eventId: string,
  payload: LandingMatchPayload,
) => Promise<unknown>;

export interface AdminLandingsHandlerDependencies {
  db: DbClient;
  updateAdminLandingMatch: UpdateAdminLandingMatch;
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean }) => void;
}

export function createAdminLandingsRouteHandler(deps: AdminLandingsHandlerDependencies): TypedRouteHandler {
  return async (context) => handleLandingMatchUpdate(context, deps);
}

async function handleLandingMatchUpdate(
  context: RouteContext,
  deps: AdminLandingsHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'PATCH') return false;

  const match = matchPath(context.pathname, /^\/api\/admin\/landings\/([^/]+)\/matches\/([^/]+)$/);
  if (!match) return false;

  const [landingSlug, eventId] = match;
  if (!landingSlug || !eventId) return false;

  const payload = await parseJsonBody(landingMatchPayloadSchema, context.request);
  const result = await deps.updateAdminLandingMatch(deps.db, landingSlug, eventId, payload);
  deps.invalidatePublicCaches('landing match update');
  sendJson(context.response, result);
  return true;
}
