import type {
  PublicAdmissionProductDto,
  PublicAdmissionProductsListDto,
  PublicAdmissionSummaryDto,
  PublicSupplierProjectionDto,
  PublicVenueAdmissionProductsDto,
} from '@daibilet/contracts/admission';
import { prisma, type Prisma } from '@daibilet/db';
import { resolveAdmissionProductReadiness } from './admission-products.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const publicAdmissionProductSelect = {
  id: true,
  slug: true,
  title: true,
  shortTitle: true,
  shortDescription: true,
  imageUrl: true,
  type: true,
  purchaseFlow: true,
  managementMode: true,
  validityMode: true,
  validFrom: true,
  validTo: true,
  validDaysAfterPurchase: true,
  salesStartsAt: true,
  salesEndsAt: true,
  priceFromRub: true,
  ticketsVacant: true,
  status: true,
  city: { select: { id: true, slug: true, title: true } },
  venue: {
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
      city: { select: { slug: true, title: true } },
    },
  },
  supplier: {
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      integrationMode: true,
      defaultCatalogMode: true,
    },
  },
  offers: {
    where: { active: true },
    orderBy: [{ priceRub: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      priceRub: true,
      oldPriceRub: true,
      groupSize: true,
      capacityTotal: true,
      active: true,
    },
  },
} satisfies Prisma.AdmissionProductSelect;

const publicSupplierSelect = {
  id: true,
  slug: true,
  title: true,
  status: true,
  integrationMode: true,
  defaultCatalogMode: true,
} satisfies Prisma.SupplierSelect;

const publicVenueSelect = {
  id: true,
  slug: true,
  title: true,
  kind: true,
  city: { select: { slug: true, title: true } },
} satisfies Prisma.VenueSelect;

type PublicAdmissionProductRow = Prisma.AdmissionProductGetPayload<{ select: typeof publicAdmissionProductSelect }>;
type PublicSupplierRow = Prisma.SupplierGetPayload<{ select: typeof publicSupplierSelect }>;
type PublicVenueRow = Prisma.VenueGetPayload<{ select: typeof publicVenueSelect }>;

export async function buildPublicAdmissionProductsListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<PublicAdmissionProductsListDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const q = cleanString(searchParams.get('q'));
  const citySlug = cleanString(searchParams.get('citySlug')) || cleanString(searchParams.get('city'));
  const venueSlug = cleanString(searchParams.get('venueSlug')) || cleanString(searchParams.get('venue'));
  const supplierSlug = cleanString(searchParams.get('supplierSlug')) || cleanString(searchParams.get('supplier'));
  const type = normalizeTypeFilter(searchParams.get('type'));
  const where = buildPublicAdmissionWhere({ q, citySlug, venueSlug, supplierSlug, type });

  const [rows, total, summaryRows] = await prisma.$transaction([
    prisma.admissionProduct.findMany({
      where,
      orderBy: [{ priceFromRub: 'asc' }, { title: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: limit + 1,
      select: publicAdmissionProductSelect,
    }),
    prisma.admissionProduct.count({ where }),
    prisma.admissionProduct.findMany({
      where,
      take: 500,
      select: publicAdmissionProductSelect,
    }),
  ]);

  const items = rows.slice(0, limit).map(mapPublicAdmissionProductDto);
  const summaryItems = summaryRows.map(mapPublicAdmissionProductDto);

  return {
    generatedAt: new Date().toISOString(),
    total,
    limit,
    offset,
    hasMore: rows.length > limit,
    filters: { q, citySlug, venueSlug, supplierSlug, type },
    summary: summarizePublicAdmissions(summaryItems),
    items,
  };
}

export async function buildPublicAdmissionProductDetailDto(
  slugOrId: string,
): Promise<PublicAdmissionProductDto | null> {
  const key = cleanString(slugOrId);
  if (!key) return null;

  const row = await prisma.admissionProduct.findFirst({
    where: {
      ...buildPublicAdmissionWhere({ q: null, citySlug: null, venueSlug: null, supplierSlug: null, type: null }),
      OR: [{ slug: key }, { id: key }],
    },
    select: publicAdmissionProductSelect,
  });

  return row ? mapPublicAdmissionProductDto(row) : null;
}

export async function buildPublicVenueAdmissionProductsDto(
  venueSlugOrId: string,
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<PublicVenueAdmissionProductsDto | null> {
  const key = cleanString(venueSlugOrId);
  if (!key) return null;

  const venue = await prisma.venue.findFirst({
    where: { OR: [{ slug: key }, { id: key }] },
    select: publicVenueSelect,
  });
  if (!venue) return null;

  const params = new URLSearchParams(searchParams);
  params.set('venueSlug', venue.slug);
  const list = await buildPublicAdmissionProductsListDto(params);

  return {
    generatedAt: list.generatedAt,
    venue: mapPublicVenueDto(venue),
    total: list.total,
    summary: list.summary,
    items: list.items,
  };
}

export async function buildPublicSupplierProjectionDto(
  supplierSlugOrId: string,
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<PublicSupplierProjectionDto | null> {
  const key = cleanString(supplierSlugOrId);
  if (!key) return null;

  const supplier = await prisma.supplier.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [{ slug: key }, { id: key }],
    },
    select: publicSupplierSelect,
  });
  if (!supplier) return null;

  const params = new URLSearchParams(searchParams);
  params.set('supplierSlug', supplier.slug);
  params.set('limit', params.get('limit') || '12');
  const list = await buildPublicAdmissionProductsListDto(params);

  return {
    generatedAt: list.generatedAt,
    supplier: mapPublicSupplierDto(supplier),
    admissionSummary: list.summary,
    admissionProducts: list.items,
  };
}

export function mapPublicAdmissionProductDto(row: PublicAdmissionProductRow): PublicAdmissionProductDto {
  const readiness = resolveAdmissionProductReadiness({
    now: new Date(),
    venueId: row.venue.id,
    venueKind: String(row.venue.kind),
    supplierId: row.supplier?.id || null,
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
    offers: row.offers.map((offer) => ({ active: offer.active, priceRub: offer.priceRub })),
  });
  const priceFromRub = pickPriceRub(row.priceFromRub, row.offers.map((offer) => offer.priceRub));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.shortTitle || null,
    shortDescription: row.shortDescription || null,
    imageUrl: row.imageUrl || null,
    type: String(row.type),
    purchaseFlow: String(row.purchaseFlow),
    managementMode: String(row.managementMode),
    validityMode: String(row.validityMode),
    validFrom: toIso(row.validFrom),
    validTo: toIso(row.validTo),
    validDaysAfterPurchase: row.validDaysAfterPurchase,
    salesStartsAt: toIso(row.salesStartsAt),
    salesEndsAt: toIso(row.salesEndsAt),
    priceFromRub,
    ticketsVacant: row.ticketsVacant,
    canSell: readiness.canSell,
    checkoutPath: readiness.canSell ? `/checkout/admissions/${encodeURIComponent(row.slug)}` : null,
    city: {
      id: row.city?.id || null,
      slug: row.city?.slug || row.venue.city?.slug || null,
      title: row.city?.title || row.venue.city?.title || null,
    },
    venue: mapPublicVenueDto(row.venue),
    supplier: mapPublicSupplierDto(row.supplier),
    offers: row.offers.map((offer) => ({
      id: offer.id,
      title: offer.title || null,
      priceRub: offer.priceRub,
      oldPriceRub: offer.oldPriceRub,
      groupSize: offer.groupSize,
      capacityTotal: offer.capacityTotal,
    })),
  };
}

function buildPublicAdmissionWhere(input: {
  q: string | null;
  citySlug: string | null;
  venueSlug: string | null;
  supplierSlug: string | null;
  type: string | null;
}): Prisma.AdmissionProductWhereInput {
  const where: Prisma.AdmissionProductWhereInput = {
    status: 'PUBLISHED',
    supplier: { status: 'ACTIVE' },
  };

  if (input.citySlug) {
    where.OR = [
      { city: { slug: input.citySlug } },
      { venue: { city: { slug: input.citySlug } } },
    ];
  }
  if (input.venueSlug) where.venue = { OR: [{ slug: input.venueSlug }, { id: input.venueSlug }] };
  if (input.supplierSlug) where.supplier = { status: 'ACTIVE', OR: [{ slug: input.supplierSlug }, { id: input.supplierSlug }] };
  if (input.type) where.type = input.type as never;
  if (input.q) {
    const queryOr: Prisma.AdmissionProductWhereInput[] = [
      { title: { contains: input.q, mode: 'insensitive' } },
      { slug: { contains: input.q, mode: 'insensitive' } },
      { shortTitle: { contains: input.q, mode: 'insensitive' } },
      { venue: { title: { contains: input.q, mode: 'insensitive' } } },
      { supplier: { title: { contains: input.q, mode: 'insensitive' } } },
    ];
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: queryOr }];
  }

  return where;
}

function summarizePublicAdmissions(items: PublicAdmissionProductDto[]): PublicAdmissionSummaryDto {
  const priceValues = items.map((item) => item.priceFromRub).filter((value): value is number => typeof value === 'number' && value >= 100);
  return {
    published: items.length,
    canSell: items.filter((item) => item.canSell).length,
    priceFromRub: priceValues.length ? Math.min(...priceValues) : null,
    venues: new Set(items.map((item) => item.venue.id)).size,
    suppliers: new Set(items.map((item) => item.supplier.id)).size,
  };
}

function mapPublicSupplierDto(row: PublicSupplierRow | null): PublicAdmissionProductDto['supplier'] {
  return {
    id: row?.id || '',
    slug: row?.slug || '',
    title: row?.title || '',
    status: row ? String(row.status) : '',
    integrationMode: row ? String(row.integrationMode) : '',
    defaultCatalogMode: row ? String(row.defaultCatalogMode) : '',
  };
}

function mapPublicVenueDto(row: PublicVenueRow): PublicAdmissionProductDto['venue'] {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: String(row.kind),
    citySlug: row.city?.slug || null,
    cityTitle: row.city?.title || null,
  };
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
