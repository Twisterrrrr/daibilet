import { parseAdminSessionToken, resolveAdminSession } from './admin-session-auth.js';
import { adminRolesAllowRoute } from './admin-rbac-policy.js';

export async function authorizeAdminSessionRequest(request, db, { now = new Date() } = {}) {
  const token = parseAdminSessionToken(request?.headers?.cookie || '');
  const actor = await resolveAdminSession(db, token, { now });
  if (!actor) return { authorized: false, statusCode: 401, error: 'admin_session_required' };

  const pathname = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`).pathname;
  if (!adminRolesAllowRoute(actor.roles, request.method, pathname)) {
    return { authorized: false, statusCode: 403, error: 'admin_permission_denied' };
  }

  return { authorized: true, actor };
}
