import {
  buildAdminEventScheduleDto,
  cancelAdminEventScheduleSession,
  createAdminEventScheduleSession,
  restoreAdminEventScheduleSession,
  updateAdminEventScheduleMode,
  updateAdminEventScheduleSession,
} from './admin-event-schedule.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import {
  adminEventScheduleModePayloadSchema,
  adminEventScheduleSessionCancelPayloadSchema,
  adminEventScheduleSessionCreatePayloadSchema,
  adminEventScheduleSessionPatchPayloadSchema,
} from './types/schemas.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export interface AdminEventScheduleRouteHandlerDependencies {
  invalidatePublicCaches: (reason: string, options?: { warm?: boolean }) => void;
}

export function createAdminEventScheduleRouteHandler(
  deps: AdminEventScheduleRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context) => {
    if (await handleScheduleRead(context)) return true;
    if (await handleScheduleModePatch(context, deps)) return true;
    if (await handleSessionCreate(context, deps)) return true;
    if (await handleSessionPatch(context, deps)) return true;
    if (await handleSessionCancel(context, deps)) return true;
    return handleSessionRestore(context, deps);
  };
}

async function handleScheduleRead(context: RouteContext): Promise<boolean> {
  if (context.method !== 'GET') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/schedule$/);
  if (!match?.[0]) return false;
  sendJson(context.response, await buildAdminEventScheduleDto(match[0]));
  return true;
}

async function handleScheduleModePatch(
  context: RouteContext,
  deps: AdminEventScheduleRouteHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'PATCH') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/schedule$/);
  if (!match?.[0]) return false;

  const payload = await parseJsonBody(adminEventScheduleModePayloadSchema, context.request);
  const dto = await updateAdminEventScheduleMode(match[0], payload);
  deps.invalidatePublicCaches('admin event schedule mode update', { warm: true });
  sendJson(context.response, dto);
  return true;
}

async function handleSessionCreate(
  context: RouteContext,
  deps: AdminEventScheduleRouteHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'POST') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/schedule\/sessions$/);
  if (!match?.[0]) return false;

  const payload = await parseJsonBody(adminEventScheduleSessionCreatePayloadSchema, context.request);
  const dto = await createAdminEventScheduleSession(match[0], payload);
  deps.invalidatePublicCaches('admin event schedule session create', { warm: true });
  sendJson(context.response, dto, { statusCode: 201 });
  return true;
}

async function handleSessionPatch(
  context: RouteContext,
  deps: AdminEventScheduleRouteHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'PATCH') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/schedule\/sessions\/([^/]+)$/);
  if (!match?.[0] || !match[1]) return false;

  const payload = await parseJsonBody(adminEventScheduleSessionPatchPayloadSchema, context.request);
  const dto = await updateAdminEventScheduleSession(match[0], match[1], payload);
  deps.invalidatePublicCaches('admin event schedule session update', { warm: true });
  sendJson(context.response, dto);
  return true;
}

async function handleSessionCancel(
  context: RouteContext,
  deps: AdminEventScheduleRouteHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'POST') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/schedule\/sessions\/([^/]+)\/cancel$/);
  if (!match?.[0] || !match[1]) return false;

  const payload = await parseJsonBody(adminEventScheduleSessionCancelPayloadSchema, context.request);
  const dto = await cancelAdminEventScheduleSession(match[0], match[1], payload);
  deps.invalidatePublicCaches('admin event schedule session cancel', { warm: true });
  sendJson(context.response, dto);
  return true;
}

async function handleSessionRestore(
  context: RouteContext,
  deps: AdminEventScheduleRouteHandlerDependencies,
): Promise<boolean> {
  if (context.method !== 'POST') return false;
  const match = matchPath(context.pathname, /^\/api\/admin\/events\/([^/]+)\/schedule\/sessions\/([^/]+)\/restore$/);
  if (!match?.[0] || !match[1]) return false;

  const dto = await restoreAdminEventScheduleSession(match[0], match[1]);
  deps.invalidatePublicCaches('admin event schedule session restore', { warm: true });
  sendJson(context.response, dto);
  return true;
}
