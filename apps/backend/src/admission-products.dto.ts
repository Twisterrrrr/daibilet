import type { AdmissionProductDto, AdmissionProductsListDto } from '@daibilet/contracts/admission';
import type { SupplierPortalAdmissionsListDto, SupplierPortalIdentityDto } from '@daibilet/contracts/supplier';
import { prisma, type Prisma } from '@daibilet/db';
import { resolveAdmissionProductReadiness } from './admission-products.js';
import { resolveAdmissionProductListingHealth } from './listing-health.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const admissionProductSelect = {
  id: true,
  slug: true,
  title: true,
  shortTitle: true,
  description: true,
  shortDescription: true,
  type: true,
  status: true,
  purchaseFlow: true,
  managementMode: true,
  imageUrl: true,
  priceFromRub: true,
  ticketsVacant: true,
  validityMode: true,
  validFrom: true,
  validTo: true,
  validDaysAfterPurchase: true,
  salesStartsAt: true,
  salesEndsAt: true,
  cityId: true,
  venueId: true,
  supplierId: true,
  city: { select: { id: true, slug: true, title: true } },
  venue: { select: { id: true, slug: true, title: true, kind: true } },
  supplier: { select: { id: true, slug: true, title: true, status: true } },
  offers: {
    orderBy: [{ active: 'desc' }, { priceRub: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      priceRub: true,
      oldPriceRub: true,
      active: true,
      capacityTotal: true,
      groupSize: true,
    },
  },
} satisfies Prisma.AdmissionProductSelect;

const supplierIdentitySelect = {
  id: true,
  slug: true,
  title: true,
  legalName: true,
  status: true,
  kind: true,
  integrationMode: true,
  defaultCatalogMode: true,
  paymentMode: true,
  pspFeeMode: true,
  defaultCommissionBps: true,
  yookassaShopId: true,
  email: true,
  phone: true,
  websiteUrl: true,
} satisfies Prisma.SupplierSelect;

type AdmissionProductRow = Prisma.AdmissionProductGetPayload<{ select: typeof admissionProductSelect }>;
type SupplierIdentityRow = Prisma.SupplierGetPayload<{ select: typeof supplierIdentitySelect }>;

export async function buildAdminAdmissionProductsListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<AdmissionProductsListDto> {
  return loadAdmissionProductsList(searchParams, {});
}

export async function buildSupplierPortalAdmissionProductsListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<SupplierPortalAdmissionsListDto> {
  const supplier = await resolveSupplierIdentity(searchParams);
  const list = await loadAdmissionProductsList(searchParams, { supplierId: supplier.id });
  return {
    ...list,
    supplier: mapSupplierIdentity(supplier),
  };
}

export async function buildAdminVenueAdmissionProductsListDto(
  venueId: string,
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<AdmissionProductsListDto> {
  const params = new URLSearchParams(searchParams);
  params.set('venueId', venueId);
  return loadAdmissionProductsList(params, {});
}

export async function loadAdmissionProductsList(
  searchParams: URLSearchParams,
  enforced: { supplierId?: string | null; venueId?: string | null } = {},
): Promise<AdmissionProductsListDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const q = cleanString(searchParams.get('q'));
  const status = normalizeStatusFilter(searchParams.get('status'));
  const supplierId = enforced.supplierId || cleanString(searchParams.get('supplierId'));
  const venueId = enforced.venueId || cleanString(searchParams.get('venueId'));
  const cityId = cleanString(searchParams.get('cityId'));
  const type = normalizeTypeFilter(searchParams.get('type'));
  const where = buildAdmissionProductWhere({ q, status, supplierId, venueId, cityId, type });

  const [rows, total, statusGroups] = await prisma.$transaction([
    prisma.admissionProduct.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      skip: offset,
      take: limit + 1,
      select: admissionProductSelect,
    }),
    prisma.admissionProduct.count({ where }),
    prisma.admissionProduct.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
  ]);

  const items = rows.slice(0, limit).map((row) => mapAdmissionProductDto(row));
  return {
    generatedAt: new Date().toISOString(),
    total,
    limit,
    offset,
    hasMore: rows.length > limit,
    filters: { q, status, supplierId, venueId, cityId, type },
    metrics: {
      total,
      published: (statusGroups as Array<{ status: string; _count: { _all: number } }>).find((row) => row.status === 'PUBLISHED')?._count._all || 0,
      canSell: items.filter((item) => item.readiness.canSell).length,
      needsAttention: items.filter((item) => item.health.status !== 'ready').length,
      blocked: items.filter((item) => item.health.status === 'blocked').length,
    },
    items,
  };
}

export function mapAdmissionProductDto(row: AdmissionProductRow, now = new Date()): AdmissionProductDto {
  const readiness = resolveAdmissionProductReadiness({
    now,
    venueId: row.venueId,
    venueKind: String(row.venue.kind),
    supplierId: row.supplierId,
    supplierStatus: row.supplier ? String(row.supplier.status) : null,
    status: String(row.status),
    purchaseFlow: String(row.purchaseFlow),
    managementMode: String(row.managementMode),
    validityMode: String(row.validityMode),
    validFrom: row.validFrom,
    validTo: row.validTo,
    validDaysAfterPurchase: row.validDaysAfterPurchase,
    salesStartsAt: row.salesStartsAt,
    salesEndsAt: row.salesEndsAt,
    ticketsVacant: row.ticketsVacant,
    offers: row.offers.map((offer) => ({
      active: offer.active,
      priceRub: offer.priceRub,
    })),
  });
  const health = resolveAdmissionProductListingHealth({
    title: row.title,
    description: row.description,
    shortDescription: row.shortDescription,
    imageUrl: row.imageUrl,
    status: String(row.status),
    priceFromRub: row.priceFromRub,
    readiness,
  });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.shortTitle || null,
    type: String(row.type) as AdmissionProductDto['type'],
    status: String(row.status),
    purchaseFlow: String(row.purchaseFlow),
    managementMode: String(row.managementMode),
    validityMode: String(row.validityMode) as AdmissionProductDto['validityMode'],
    validFrom: toIso(row.validFrom),
    validTo: toIso(row.validTo),
    validDaysAfterPurchase: row.validDaysAfterPurchase,
    salesStartsAt: toIso(row.salesStartsAt),
    salesEndsAt: toIso(row.salesEndsAt),
    priceFromRub: pickPriceRub(row.priceFromRub, row.offers.map((offer) => offer.priceRub)),
    ticketsVacant: row.ticketsVacant,
    city: {
      id: row.city?.id || null,
      slug: row.city?.slug || null,
      title: row.city?.title || null,
    },
    venue: {
      id: row.venue.id,
      slug: row.venue.slug,
      title: row.venue.title,
      kind: String(row.venue.kind),
    },
    supplier: {
      id: row.supplier?.id || null,
      slug: row.supplier?.slug || null,
      title: row.supplier?.title || null,
      status: row.supplier ? String(row.supplier.status) : null,
    },
    offers: row.offers.map((offer) => ({
      id: offer.id,
      title: offer.title || null,
      priceRub: offer.priceRub,
      oldPriceRub: offer.oldPriceRub,
      active: offer.active,
      capacityTotal: offer.capacityTotal,
      groupSize: offer.groupSize,
    })),
    readiness,
    health,
  };
}

function buildAdmissionProductWhere(input: {
  q: string | null;
  status: string | null;
  supplierId: string | null;
  venueId: string | null;
  cityId: string | null;
  type: string | null;
}): Prisma.AdmissionProductWhereInput {
  const where: Prisma.AdmissionProductWhereInput = {};
  if (input.status) where.status = input.status as never;
  if (input.supplierId) where.supplierId = input.supplierId;
  if (input.venueId) where.venueId = input.venueId;
  if (input.cityId) where.cityId = input.cityId;
  if (input.type) where.type = input.type as never;
  if (input.q) {
    where.OR = [
      { title: { contains: input.q, mode: 'insensitive' } },
      { slug: { contains: input.q, mode: 'insensitive' } },
      { shortTitle: { contains: input.q, mode: 'insensitive' } },
      { venue: { title: { contains: input.q, mode: 'insensitive' } } },
      { city: { title: { contains: input.q, mode: 'insensitive' } } },
      { supplier: { title: { contains: input.q, mode: 'insensitive' } } },
    ];
  }
  return where;
}

async function resolveSupplierIdentity(searchParams: URLSearchParams): Promise<SupplierIdentityRow> {
  const idOrSlug = cleanString(searchParams.get('supplierId')) ||
    cleanString(searchParams.get('slug')) ||
    cleanString(searchParams.get('supplier'));
  if (!idOrSlug) throwHttpError('supplier_required', 400);

  const supplier = await prisma.supplier.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: supplierIdentitySelect,
  });
  if (!supplier) throwHttpError('supplier_not_found', 404);
  return supplier;
}

function mapSupplierIdentity(row: SupplierIdentityRow): SupplierPortalIdentityDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    legalName: row.legalName || null,
    status: String(row.status),
    kind: String(row.kind),
    integrationMode: String(row.integrationMode),
    defaultCatalogMode: String(row.defaultCatalogMode),
    paymentMode: String(row.paymentMode),
    pspFeeMode: String(row.pspFeeMode),
    defaultCommissionBps: row.defaultCommissionBps || 0,
    yookassaShopId: row.yookassaShopId || null,
    email: row.email || null,
    phone: row.phone || null,
    websiteUrl: row.websiteUrl || null,
  };
}

function normalizeStatusFilter(value: string | null): string | null {
  const normalized = cleanString(value)?.toUpperCase();
  if (!normalized || normalized === 'ALL') return null;
  return normalized;
}

function normalizeTypeFilter(value: string | null): string | null {
  const normalized = cleanString(value)?.toUpperCase();
  if (!normalized || normalized === 'ALL') return null;
  return normalized;
}

function pickPriceRub(primary: number | null, offers: Array<number | null>): number | null {
  const candidates = [primary, ...offers].filter((value): value is number => typeof value === 'number' && value >= 100);
  if (candidates.length) return Math.min(...candidates);
  const fallback = [primary, ...offers].find((value) => typeof value === 'number' && value > 0);
  return fallback ?? null;
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function throwHttpError(message: string, statusCode: number): never {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  throw error;
}
