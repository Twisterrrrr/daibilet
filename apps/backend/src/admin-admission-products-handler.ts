import type { PrismaClient } from '@daibilet/db';
import { z } from 'zod';

import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody, parseSearchParams } from './validation.js';

const productTypes = [
  'MUSEUM_ENTRY', 'GALLERY_ENTRY', 'ART_SPACE_ENTRY', 'EXHIBITION_ENTRY',
  'OBSERVATION_ENTRY', 'PARK_ENTRY', 'ATTRACTION_ENTRY', 'ZOO_ENTRY',
  'AQUARIUM_ENTRY', 'COMPLEX_ENTRY', 'OTHER',
] as const;
const validityModes = ['OPEN_DATE', 'FIXED_WINDOW', 'VALID_DAYS_AFTER_PURCHASE'] as const;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

const classificationSchema = z.object({
  type: z.enum(productTypes),
  categoryId: z.string().trim().min(1).nullable(),
  primarySubcategoryId: z.string().trim().min(1).nullable(),
  validityMode: z.enum(validityModes),
  validFrom: dateOnly,
  validTo: dateOnly,
  validDaysAfterPurchase: z.number().int().min(1).max(3650).nullable(),
  salesStartsAt: dateOnly,
  salesEndsAt: dateOnly,
}).superRefine((value, ctx) => {
  if (value.validFrom && value.validTo && value.validFrom > value.validTo) {
    ctx.addIssue({ code: 'custom', path: ['validTo'], message: 'Дата окончания должна быть позже даты начала' });
  }
  if (value.salesStartsAt && value.salesEndsAt && value.salesStartsAt > value.salesEndsAt) {
    ctx.addIssue({ code: 'custom', path: ['salesEndsAt'], message: 'Продажи не могут завершаться раньше начала' });
  }
  if (value.validityMode === 'VALID_DAYS_AFTER_PURCHASE' && !value.validDaysAfterPurchase) {
    ctx.addIssue({ code: 'custom', path: ['validDaysAfterPurchase'], message: 'Укажите срок действия после покупки' });
  }
  if (value.validityMode !== 'VALID_DAYS_AFTER_PURCHASE' && value.validDaysAfterPurchase != null) {
    ctx.addIssue({ code: 'custom', path: ['validDaysAfterPurchase'], message: 'Это поле применяется только для срока после покупки' });
  }
});

export interface AdminAdmissionProductsHandlerDependencies {
  prisma: PrismaClient;
  invalidatePublicCaches: (reason: string) => void;
}

function asDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function asDateString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function createAdminAdmissionProductsRouteHandler(
  deps: AdminAdmissionProductsHandlerDependencies,
): TypedRouteHandler {
  return async (context) => {
    if (context.pathname === '/api/admin/admission-products' && context.method === 'GET') {
      const query = parseSearchParams(listQuerySchema, context.searchParams);
      const where = query.q
        ? { OR: [
            { title: { contains: query.q, mode: 'insensitive' as const } },
            { slug: { contains: query.q, mode: 'insensitive' as const } },
            { venue: { title: { contains: query.q, mode: 'insensitive' as const } } },
          ] }
        : {};
      const [rows, total, categories, subcategories] = await Promise.all([
        deps.prisma.admissionProduct.findMany({
          where,
          orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
          skip: query.offset,
          take: query.limit + 1,
          select: {
            id: true, slug: true, title: true, type: true, status: true,
            categoryId: true, primarySubcategoryId: true, validityMode: true,
            validFrom: true, validTo: true, validDaysAfterPurchase: true,
            salesStartsAt: true, salesEndsAt: true, updatedAt: true,
            category: { select: { id: true, slug: true, title: true } },
            primarySubcategory: { select: { id: true, slug: true, title: true, categoryId: true } },
            city: { select: { title: true, slug: true } },
            venue: { select: { title: true, slug: true } },
          },
        }),
        deps.prisma.admissionProduct.count({ where }),
        deps.prisma.category.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }], select: { id: true, slug: true, title: true } }),
        deps.prisma.subcategory.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }], select: { id: true, slug: true, title: true, categoryId: true } }),
      ]);
      const items = rows.slice(0, query.limit).map((row) => ({
        ...row,
        validFrom: asDateString(row.validFrom),
        validTo: asDateString(row.validTo),
        salesStartsAt: asDateString(row.salesStartsAt),
        salesEndsAt: asDateString(row.salesEndsAt),
        updatedAt: row.updatedAt.toISOString(),
      }));
      sendJson(context.response, {
        items,
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + items.length < total,
        categories,
        subcategories,
      });
      return true;
    }

    if (context.method !== 'PATCH') return false;
    const match = matchPath(context.pathname, /^\/api\/admin\/admission-products\/([^/]+)\/classification$/);
    if (!match?.[0]) return false;

    const [productId] = match;
    if (!productId) return false;
    const payload = await parseJsonBody(classificationSchema, context.request);
    const existing = await deps.prisma.admissionProduct.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!existing) {
      sendJson(context.response, { error: 'admission_product_not_found' }, { statusCode: 404 });
      return true;
    }

    if (payload.categoryId) {
      const category = await deps.prisma.category.findUnique({ where: { id: payload.categoryId }, select: { id: true } });
      if (!category) {
        sendJson(context.response, { error: 'category_not_found' }, { statusCode: 400 });
        return true;
      }
    }
    if (payload.primarySubcategoryId) {
      const subcategory = await deps.prisma.subcategory.findUnique({
        where: { id: payload.primarySubcategoryId },
        select: { id: true, categoryId: true },
      });
      if (!subcategory || subcategory.categoryId !== payload.categoryId) {
        sendJson(context.response, { error: 'subcategory_category_mismatch' }, { statusCode: 400 });
        return true;
      }
    }

    const row = await deps.prisma.admissionProduct.update({
      where: { id: productId },
      data: {
        type: payload.type,
        categoryId: payload.categoryId,
        primarySubcategoryId: payload.primarySubcategoryId,
        validityMode: payload.validityMode,
        validFrom: asDate(payload.validFrom),
        validTo: asDate(payload.validTo),
        validDaysAfterPurchase: payload.validDaysAfterPurchase,
        salesStartsAt: asDate(payload.salesStartsAt),
        salesEndsAt: asDate(payload.salesEndsAt),
      },
      select: {
        id: true, slug: true, title: true, type: true, status: true,
        categoryId: true, primarySubcategoryId: true, validityMode: true,
        validFrom: true, validTo: true, validDaysAfterPurchase: true,
        salesStartsAt: true, salesEndsAt: true, updatedAt: true,
        category: { select: { id: true, slug: true, title: true } },
        primarySubcategory: { select: { id: true, slug: true, title: true, categoryId: true } },
        city: { select: { title: true, slug: true } },
        venue: { select: { title: true, slug: true } },
      },
    });
    deps.invalidatePublicCaches('admission product classification updated');
    sendJson(context.response, {
      item: {
        ...row,
        validFrom: asDateString(row.validFrom),
        validTo: asDateString(row.validTo),
        salesStartsAt: asDateString(row.salesStartsAt),
        salesEndsAt: asDateString(row.salesEndsAt),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
    return true;
  };
}
