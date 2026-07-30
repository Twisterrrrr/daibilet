import type {
  SupplierPortalAdmissionStubPurchaseRequestDto,
  SupplierPortalAdmissionStubPurchaseResultDto,
} from '@daibilet/contracts/supplier';
import { prisma, type Prisma } from '@daibilet/db';
import { z } from 'zod';
import { createStubCheckoutOrder, isStubCheckoutError } from './checkout-stub.js';
import { sendJson } from './http.js';
import { matchPath, type RouteContext } from './routing.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

export interface SupplierAdmissionStubPurchaseRouteHandlerDependencies {
  resolveSearchParams: (context: RouteContext) => Promise<URLSearchParams>;
}

const nullableString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || null : value),
  z.string().nullable().optional(),
);

const supplierAdmissionStubPurchaseSchema = z.object({
  admissionOfferId: nullableString,
  quantity: z.coerce.number().int().min(1).max(10).optional().default(1),
  buyer: z.object({
    email: z.string().trim().email().optional().nullable(),
    name: nullableString,
    phone: nullableString,
  }).optional().nullable(),
  idempotencyKey: nullableString,
});

const supplierAdmissionSmokeProductSelect = {
  id: true,
  slug: true,
  title: true,
  supplierId: true,
  offers: {
    orderBy: [{ active: 'desc' }, { priceRub: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      sourceCode: true,
      priceRub: true,
      active: true,
    },
  },
} satisfies Prisma.AdmissionProductSelect;

type SupplierAdmissionSmokeProductRow = Prisma.AdmissionProductGetPayload<{
  select: typeof supplierAdmissionSmokeProductSelect;
}>;

export function createSupplierAdmissionStubPurchaseRouteHandler(
  deps: SupplierAdmissionStubPurchaseRouteHandlerDependencies,
): TypedRouteHandler {
  return async (context: RouteContext) => {
    if (context.method !== 'POST') return false;
    const match = matchPath(context.pathname, /^\/api\/supplier\/admissions\/([^/]+)\/stub-purchase$/);
    if (!match) return false;

    const searchParams = await deps.resolveSearchParams(context);
    const payload = await parseJsonBody(supplierAdmissionStubPurchaseSchema, context.request);
    const idempotencyKey = firstHeader(context.request.headers['idempotency-key']) || payload.idempotencyKey || null;

    try {
      const result = await createSupplierAdmissionStubPurchase(
        searchParams,
        match[0] || '',
        normalizeSupplierAdmissionStubPurchasePayload(payload),
        { idempotencyKey },
      );
      sendJson(context.response, result, { statusCode: 201 });
    } catch (error) {
      if (!isStubCheckoutError(error)) throw error;
      sendJson(context.response, error.toDto(), { statusCode: error.statusCode });
    }
    return true;
  };
}

function normalizeSupplierAdmissionStubPurchasePayload(
  payload: z.infer<typeof supplierAdmissionStubPurchaseSchema>,
): SupplierPortalAdmissionStubPurchaseRequestDto {
  return {
    quantity: payload.quantity,
    ...(payload.admissionOfferId != null ? { admissionOfferId: payload.admissionOfferId } : {}),
    ...(payload.idempotencyKey != null ? { idempotencyKey: payload.idempotencyKey } : {}),
    ...(payload.buyer
      ? {
          buyer: {
            ...(payload.buyer.email != null ? { email: payload.buyer.email } : {}),
            ...(payload.buyer.name != null ? { name: payload.buyer.name } : {}),
            ...(payload.buyer.phone != null ? { phone: payload.buyer.phone } : {}),
          },
        }
      : {}),
  };
}

export async function createSupplierAdmissionStubPurchase(
  searchParams: URLSearchParams,
  admissionProductIdOrSlug: string,
  payload: SupplierPortalAdmissionStubPurchaseRequestDto,
  options: { idempotencyKey?: string | null } = {},
): Promise<SupplierPortalAdmissionStubPurchaseResultDto> {
  const supplierId = cleanString(searchParams.get('supplierId'));
  if (!supplierId) throwHttpError('Требуется поставщик.', 400);

  const product = await loadSupplierAdmissionSmokeProduct(supplierId, admissionProductIdOrSlug);
  if (!product) throwHttpError('Входной билет не найден у текущего поставщика.', 404);

  const offer = pickAdmissionSmokeOffer(product, cleanString(payload.admissionOfferId));
  if (!offer) throwHttpError('У входного билета нет категории для тестовой продажи.', 422);

  return createStubCheckoutOrder({
    subjectType: 'VENUE_ADMISSION',
    admissionProductId: product.id,
    admissionOfferId: offer.id,
    quantity: payload.quantity || 1,
    buyer: {
      email: cleanString(payload.buyer?.email)?.toLowerCase() || `smoke+${product.slug}@daibilet.ru`,
      name: cleanString(payload.buyer?.name) || 'Тестовый покупатель',
      phone: cleanString(payload.buyer?.phone),
    },
    attendee: null,
    idempotencyKey: options.idempotencyKey || payload.idempotencyKey || null,
  }, {
    idempotencyKey: options.idempotencyKey || payload.idempotencyKey || null,
  });
}

async function loadSupplierAdmissionSmokeProduct(
  supplierId: string,
  idOrSlug: string,
): Promise<SupplierAdmissionSmokeProductRow | null> {
  const key = cleanString(idOrSlug);
  if (!key) return null;
  return prisma.admissionProduct.findFirst({
    where: {
      supplierId,
      OR: [{ id: key }, { slug: key }],
    },
    select: supplierAdmissionSmokeProductSelect,
  });
}

function pickAdmissionSmokeOffer(
  product: SupplierAdmissionSmokeProductRow,
  preferredOfferId: string | null,
): SupplierAdmissionSmokeProductRow['offers'][number] | null {
  if (preferredOfferId) {
    const preferred = product.offers.find((offer) => offer.id === preferredOfferId);
    if (preferred) return preferred;
  }

  return product.offers.find((offer) => (
    offer.active &&
    String(offer.sourceCode) === 'MANUAL' &&
    offer.priceRub != null &&
    offer.priceRub >= 100
  )) || product.offers.find((offer) => offer.active) || product.offers[0] || null;
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
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
