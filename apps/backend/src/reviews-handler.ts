import { z } from 'zod';

import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import {
  adminListReviews,
  adminModerateReview,
  createReview,
  getReviewRequestInfo,
  listApprovedReviewsByEventSlug,
  ReviewServiceError,
  verifyReviewEmail,
} from './reviews.service.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody, parseSearchParams } from './validation.js';

const createBodySchema = z
  .object({
    eventId: z.string().min(1),
    rating: z.coerce.number().int().min(1).max(5),
    text: z.string().min(10).max(5000),
    authorName: z.string().min(2).max(120),
    authorEmail: z.string().email().max(200),
    title: z.string().max(200).optional().nullable(),
    orderOrTicketRef: z.string().max(120).optional().nullable(),
    reviewRequestToken: z.string().max(128).optional().nullable(),
    website: z.string().optional().nullable(),
    formStartedAt: z.union([z.number(), z.string()]).optional().nullable(),
    purchaseDate: z.string().optional().nullable(),
    siteUserId: z.string().optional().nullable(),
  })
  .strict();

const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

const tokenQuerySchema = z
  .object({
    token: z.string().min(1),
  })
  .strict();

function clientIp(context: RouteContext): string | undefined {
  const forwarded = context.request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0]?.trim();
  return context.request.socket.remoteAddress || undefined;
}

export function createPublicReviewsRouteHandler(): TypedRouteHandler {
  return async (context) => {
    try {
      if (context.route === 'POST /api/reviews') {
        const body = await parseJsonBody(createBodySchema, context.request);
        const result = await createReview(body, clientIp(context));
        sendJson(context.response, result, { statusCode: 201 });
        return true;
      }

      if (context.route === 'GET /api/reviews/request-info') {
        const query = parseSearchParams(tokenQuerySchema, context.searchParams);
        sendJson(context.response, await getReviewRequestInfo(query.token));
        return true;
      }

      if (context.route === 'GET /api/reviews/verify') {
        const query = parseSearchParams(tokenQuerySchema, context.searchParams);
        sendJson(context.response, await verifyReviewEmail(query.token));
        return true;
      }

      const bySlug = matchPath(context.pathname, /^\/api\/reviews\/events\/([^/]+)$/);
      if (context.method === 'GET' && bySlug) {
        const query = parseSearchParams(listQuerySchema, context.searchParams);
        sendJson(
          context.response,
          await listApprovedReviewsByEventSlug(bySlug[0], query.page || 1, query.limit || 10),
          { cacheControl: 'public, max-age=60' },
        );
        return true;
      }

      return false;
    } catch (error) {
      if (error instanceof ReviewServiceError) {
        sendJson(context.response, { error: error.code, message: error.message }, { statusCode: error.statusCode });
        return true;
      }
      throw error;
    }
  };
}

const adminListQuerySchema = z
  .object({
    status: z.string().optional(),
    eventId: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

const moderateBodySchema = z
  .object({
    adminComment: z.string().max(2000).optional().nullable(),
  })
  .strict();

export function createAdminReviewsRouteHandler(): TypedRouteHandler {
  return async (context) => {
    try {
      if (context.route === 'GET /api/admin/reviews') {
        const query = parseSearchParams(adminListQuerySchema, context.searchParams);
        sendJson(context.response, await adminListReviews(query));
        return true;
      }

      const approve = matchPath(context.pathname, /^\/api\/admin\/reviews\/([^/]+)\/approve$/);
      if (context.method === 'POST' && approve) {
        const body = await parseJsonBody(moderateBodySchema, context.request);
        sendJson(context.response, await adminModerateReview(approve[0], 'approve', body.adminComment));
        return true;
      }

      const reject = matchPath(context.pathname, /^\/api\/admin\/reviews\/([^/]+)\/reject$/);
      if (context.method === 'POST' && reject) {
        const body = await parseJsonBody(moderateBodySchema, context.request);
        sendJson(context.response, await adminModerateReview(reject[0], 'reject', body.adminComment));
        return true;
      }

      const hide = matchPath(context.pathname, /^\/api\/admin\/reviews\/([^/]+)\/hide$/);
      if (context.method === 'POST' && hide) {
        const body = await parseJsonBody(moderateBodySchema, context.request);
        sendJson(context.response, await adminModerateReview(hide[0], 'hide', body.adminComment));
        return true;
      }

      return false;
    } catch (error) {
      if (error instanceof ReviewServiceError) {
        sendJson(context.response, { error: error.code, message: error.message }, { statusCode: error.statusCode });
        return true;
      }
      throw error;
    }
  };
}
