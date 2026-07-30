import type {
  SupplierPortalAuthDto,
  SupplierPortalMeDto,
  SupplierPortalSessionSupplierDto,
  SupplierPortalUserDto,
} from '@daibilet/contracts/supplier';
import { prisma } from '@daibilet/db';
import type { ServerResponse } from 'node:http';
import type { RouteContext } from './routing.js';
import {
  assertAuthRateLimit,
  authenticateAccessToken,
  buildClearRefreshCookie,
  buildRefreshCookie,
  loginSiteUser,
  logoutSiteUser,
  parseBearerToken,
} from './user-auth.js';
import { readJsonBody } from './http.js';
import type { TypedRouteHandler } from './validated-handler.js';

export interface SupplierAuthRouteHandlerDependencies {
  db: unknown;
}

type JwtPayload = {
  sub?: string;
  email?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
  supplier?: string;
};

type SupplierSessionRow = {
  role: string;
  siteUser: {
    id: string;
    email: string;
    name: string | null;
  };
  supplier: {
    id: string;
    slug: string;
    title: string;
    status: string;
  };
};

export function createSupplierAuthRouteHandler(
  deps: SupplierAuthRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.pathname === '/api/supplier/auth/login' && context.method === 'POST') {
      const clientIp = String(context.request.headers['x-real-ip'] || context.request.socket.remoteAddress || 'unknown');
      assertAuthRateLimit(`supplier-login:${clientIp}`, 20);

      const body = await readJsonBody<LoginBody>(context.request);
      const tokens = await loginSiteUser(deps.db, body?.email, body?.password);
      const payload = authenticateAccessToken(tokens.accessToken) as JwtPayload | null;
      if (!payload?.sub) throwHttpError('Не удалось открыть сеанс поставщика.', 401);

      let authDto: SupplierPortalAuthDto;
      try {
        authDto = await buildSupplierPortalAuthDto(payload.sub, tokens.accessToken, cleanString(body?.supplier));
      } catch (error) {
        await logoutSiteUser(deps.db, payload.sub);
        throw error;
      }
      writeSupplierJson(context.response, authDto, {
        statusCode: 200,
        headers: { 'Set-Cookie': buildRefreshCookie(tokens.refreshToken) },
      });
      return true;
    }

    if (context.pathname === '/api/supplier/auth/me' && context.method === 'GET') {
      const userId = requireSupplierSiteUserId(context);
      writeSupplierJson(
        context.response,
        await buildSupplierPortalMeDto(userId, cleanString(context.searchParams.get('supplier'))),
      );
      return true;
    }

    if (context.pathname === '/api/supplier/auth/logout' && context.method === 'POST') {
      const token = parseBearerToken(context.request);
      const payload = token ? (authenticateAccessToken(token) as JwtPayload | null) : null;
      if (payload?.sub) await logoutSiteUser(deps.db, payload.sub);
      writeSupplierJson(context.response, { ok: true }, {
        headers: { 'Set-Cookie': buildClearRefreshCookie() },
      });
      return true;
    }

    return false;
  };
}

export async function resolveSupplierPortalSearchParams(context: RouteContext): Promise<URLSearchParams> {
  const token = parseBearerToken(context.request);
  const payload = token ? (authenticateAccessToken(token) as JwtPayload | null) : null;
  if (payload?.sub) {
    const session = await buildSupplierPortalMeDto(payload.sub, cleanString(context.searchParams.get('supplier')));
    const next = new URLSearchParams(context.searchParams);
    next.set('supplierId', session.currentSupplier.id);
    next.delete('supplier');
    next.delete('slug');
    return next;
  }

  if (supplierQueryFallbackAllowed()) {
    const supplierKey = cleanString(context.searchParams.get('supplierId')) ||
      cleanString(context.searchParams.get('supplier')) ||
      cleanString(context.searchParams.get('slug'));
    if (supplierKey) return context.searchParams;
  }

  throwHttpError('Требуется вход поставщика.', 401);
}

export function supplierQueryFallbackAllowed(): boolean {
  if (process.env.DAIBILET_SUPPLIER_QUERY_FALLBACK === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

function requireSupplierSiteUserId(context: RouteContext): string {
  const token = parseBearerToken(context.request);
  if (!token) throwHttpError('Требуется вход поставщика.', 401);
  const payload = authenticateAccessToken(token) as JwtPayload | null;
  if (!payload?.sub) throwHttpError('Сеанс поставщика истек.', 401);
  return payload.sub;
}

async function buildSupplierPortalAuthDto(
  siteUserId: string,
  accessToken: string,
  preferredSupplier: string | null,
): Promise<SupplierPortalAuthDto> {
  const dto = await buildSupplierPortalMeDto(siteUserId, preferredSupplier);
  return {
    accessToken,
    ...dto,
  };
}

async function buildSupplierPortalMeDto(
  siteUserId: string,
  preferredSupplier: string | null,
): Promise<SupplierPortalMeDto> {
  const rows = await loadSupplierSessions(siteUserId);
  if (!rows.length) throwHttpError('Для этого аккаунта не подключен ЛК поставщика.', 403);

  const current = pickCurrentSupplier(rows, preferredSupplier);
  const suppliers = rows.map((row) => mapSessionSupplier(row));

  return {
    user: mapSessionUser(current),
    suppliers,
    currentSupplier: mapSessionSupplier(current),
  };
}

async function loadSupplierSessions(siteUserId: string): Promise<SupplierSessionRow[]> {
  const rows = await prisma.supplierUser.findMany({
    where: {
      siteUserId,
      isActive: true,
      supplier: { status: { not: 'ARCHIVED' } },
      siteUser: { isActive: true },
    },
    orderBy: [{ acceptedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      role: true,
      siteUser: { select: { id: true, email: true, name: true } },
      supplier: { select: { id: true, slug: true, title: true, status: true } },
    },
  });

  return rows.map((row) => ({
    role: String(row.role),
    siteUser: row.siteUser,
    supplier: {
      ...row.supplier,
      status: String(row.supplier.status),
    },
  }));
}

function pickCurrentSupplier(rows: SupplierSessionRow[], preferredSupplier: string | null): SupplierSessionRow {
  if (preferredSupplier) {
    const preferred = rows.find((row) => row.supplier.id === preferredSupplier || row.supplier.slug === preferredSupplier);
    if (preferred) return preferred;
  }
  return rows[0] as SupplierSessionRow;
}

function mapSessionUser(row: SupplierSessionRow): SupplierPortalUserDto {
  return {
    id: row.siteUser.id,
    email: row.siteUser.email,
    name: row.siteUser.name,
    role: row.role,
  };
}

function mapSessionSupplier(row: SupplierSessionRow): SupplierPortalSessionSupplierDto {
  return {
    id: row.supplier.id,
    slug: row.supplier.slug,
    title: row.supplier.title,
    status: row.supplier.status,
    role: row.role,
  };
}

function writeSupplierJson(
  response: ServerResponse,
  payload: unknown,
  options: { statusCode?: number; headers?: Record<string, string> } = {},
): void {
  response.writeHead(options.statusCode || 200, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, PATCH, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, idempotency-key',
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(options.headers || {}),
  });
  response.end(JSON.stringify(payload));
}

function cleanString(value: unknown): string | null {
  const text = String(value || '').trim();
  return text || null;
}

function throwHttpError(message: string, statusCode: number): never {
  const error = new Error(message);
  (error as Error & { statusCode: number }).statusCode = statusCode;
  throw error;
}
