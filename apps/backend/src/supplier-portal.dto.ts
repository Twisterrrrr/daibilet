import type {
  SupplierPortalDashboardDto,
  SupplierPortalEventIssueDto,
  SupplierPortalEventRowDto,
  SupplierPortalEventsListDto,
  SupplierPortalFinanceDto,
  SupplierPortalIdentityDto,
  SupplierPortalOrderRowDto,
  SupplierPortalOrdersListDto,
  SupplierPortalProfileDto,
  SupplierPortalReadinessDto,
  SupplierPortalReviewsListDto,
  SupplierPortalSessionPreviewDto,
  SupplierPortalSummaryDto,
} from '@daibilet/contracts/supplier';
import { prisma, type Prisma } from '@daibilet/db';
import { loadAdmissionProductsList } from './admission-products.dto.js';
import { resolveSupplierCheckoutReadiness } from './admin-suppliers.dto.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const supplierPortalInclude = {
  users: {
    where: { isActive: true },
    select: {
      id: true,
      role: true,
      isActive: true,
      acceptedAt: true,
      siteUser: { select: { email: true, name: true } },
    },
  },
  legalProfile: {
    include: {
      bankAccounts: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          bankName: true,
          bik: true,
          accountNumber: true,
          correspondentAccount: true,
          isPrimary: true,
        },
      },
    },
  },
  commissionRules: {
    orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    select: {
      id: true,
      scope: true,
      title: true,
      percentBps: true,
      fixedFeeKopecks: true,
      priority: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
    },
  },
  venues: {
    where: { isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    include: {
      venue: {
        select: {
          id: true,
          slug: true,
          title: true,
          city: { select: { title: true } },
        },
      },
    },
  },
} satisfies Prisma.SupplierInclude;

const supplierEventListSelect = {
  id: true,
  slug: true,
  title: true,
  status: true,
  kind: true,
  purchaseFlow: true,
  managementMode: true,
  priceFromRub: true,
  ticketsVacant: true,
  imageUrl: true,
  updatedAt: true,
  primaryCity: { select: { id: true, slug: true, title: true } },
  venue: { select: { id: true, slug: true, title: true } },
  supplierLinks: {
    where: { isActive: true },
    select: {
      supplierId: true,
      catalogMode: true,
      managementMode: true,
      canEditContent: true,
      canEditMedia: true,
      canEditSeo: true,
      canEditSchedule: true,
      canEditOffers: true,
    },
  },
  offers: {
    where: { active: true },
    orderBy: [{ priceRub: 'asc' }, { id: 'asc' }],
    take: 10,
    select: {
      id: true,
      title: true,
      priceRub: true,
      widgetUrl: true,
      deeplinkUrl: true,
    },
  },
  sessions: {
    where: { isActive: true, cancelledAt: null },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    take: 10,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      priceFromRub: true,
      ticketsVacant: true,
      capacityTotal: true,
      capacitySold: true,
    },
  },
  _count: {
    select: {
      sessions: { where: { isActive: true, cancelledAt: null } },
      offers: { where: { active: true } },
    },
  },
} satisfies Prisma.EventSelect;

type SupplierPortalRow = Prisma.SupplierGetPayload<{ include: typeof supplierPortalInclude }>;
type SupplierEventListRow = Prisma.EventGetPayload<{ select: typeof supplierEventListSelect }>;
type SupplierEventLinkRow = SupplierEventListRow['supplierLinks'][number];

type SupplierOrderRow = Prisma.CheckoutItemGetPayload<{
  include: {
    order: {
      select: {
        id: true;
        publicCode: true;
        status: true;
        buyerEmail: true;
        buyerPhone: true;
        buyerName: true;
        paidAt: true;
        createdAt: true;
      };
    };
    event: { select: { id: true; slug: true; title: true } };
    session: { select: { id: true; startsAt: true } };
    offer: { select: { id: true; title: true } };
    admissionProduct: { select: { id: true; slug: true; title: true } };
    admissionOffer: { select: { id: true; title: true } };
  };
}>;

interface SupplierPortalAggregates {
  eventGroups: EventGroupAggregate[];
  supplierEventGroups: SupplierEventGroupAggregate[];
  orderGroups: OrderGroupAggregate[];
  ledgerGroups: LedgerGroupAggregate[];
  payoutGroups: PayoutGroupAggregate[];
  refundGroups: CountByStatusAggregate[];
  disputeGroups: CountByStatusAggregate[];
  reviewGroups: ReviewGroupAggregate[];
  reviewAverage: number | null;
  reviewsNeedingResponse: number;
  reviewDisputes: number;
  admissionGroups: AdmissionGroupAggregate[];
}

type EventGroupAggregate = {
  status: string;
  purchaseFlow: string;
  managementMode: string;
  _count: { _all: number };
};

type SupplierEventGroupAggregate = {
  catalogMode: string;
  managementMode: string;
  isActive: boolean;
  _count: { _all: number };
};

type OrderGroupAggregate = {
  status: string;
  _count: { _all: number };
  _sum: { totalKopecks: number | null; commissionKopecks: number | null };
};

type LedgerGroupAggregate = {
  type: string;
  _sum: { amountKopecks: number | null };
};

type PayoutGroupAggregate = {
  status: string;
  _sum: { amountKopecks: number | null };
};

type CountByStatusAggregate = {
  status: string;
  _count: { _all: number };
};

type ReviewGroupAggregate = {
  status: string;
  _count: { _all: number };
};

type AdmissionGroupAggregate = {
  status: string;
  purchaseFlow: string;
  _count: { _all: number };
};

export async function buildSupplierPortalDashboardDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<SupplierPortalDashboardDto> {
  const supplier = await resolveSupplierPortal(searchParams);
  const [aggregates, upcomingSessions, latestOrders, attentionEvents] = await Promise.all([
    loadSupplierPortalAggregates(supplier.id),
    loadUpcomingSessions(supplier.id, 5),
    loadSupplierOrderRows(supplier.id, new URLSearchParams({ limit: '5' })),
    loadSupplierEventRows(supplier.id, new URLSearchParams({ limit: '25' })),
  ]);
  const attentionAdmissions = await loadAdmissionProductsList(
    new URLSearchParams({ limit: '25' }),
    { supplierId: supplier.id },
  );
  const summary = summarizeSupplierPortal(aggregates);
  const readiness = resolveSupplierPortalReadiness(supplier, summary);

  return {
    generatedAt: new Date().toISOString(),
    supplier: mapSupplierPortalIdentity(supplier),
    summary,
    readiness,
    upcomingSessions,
    latestOrders: latestOrders.items,
    eventsNeedingAttention: attentionEvents.items.filter((event) => event.readinessIssues.length > 0).slice(0, 5),
    admissionsNeedingAttention: attentionAdmissions.items.filter((product) => product.health.status !== 'ready').slice(0, 5),
  };
}

export async function buildSupplierPortalProfileDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<SupplierPortalProfileDto> {
  const supplier = await resolveSupplierPortal(searchParams);
  const legal = supplier.legalProfile;

  return {
    generatedAt: new Date().toISOString(),
    supplier: mapSupplierPortalIdentity(supplier),
    legal: {
      status: legal ? String(legal.status) : null,
      legalName: legal?.legalName || supplier.legalName || null,
      legalAddress: legal?.legalAddress || null,
      inn: legal?.inn || supplier.inn || null,
      kpp: legal?.kpp || supplier.kpp || null,
      ogrn: legal?.ogrn || supplier.ogrn || null,
      taxMode: legal ? String(legal.taxMode) : null,
      isVatPayer: legal?.isVatPayer ?? null,
      defaultVatRate: legal?.defaultVatRate ?? null,
      signerFullName: legal?.signerFullName || null,
      signerPosition: legal?.signerPosition || null,
      financeEmail: legal?.financeEmail || supplier.email || null,
      docsEmail: legal?.docsEmail || null,
      rejectionComment: legal?.rejectionComment || null,
    },
    bankAccounts: (legal?.bankAccounts || []).map((account) => ({
      id: account.id,
      bankName: account.bankName || null,
      bik: account.bik || null,
      accountMask: maskAccount(account.accountNumber),
      correspondentMask: maskAccount(account.correspondentAccount),
      isPrimary: account.isPrimary,
    })),
    users: supplier.users.map((user) => ({
      id: user.id,
      role: String(user.role),
      isActive: user.isActive,
      email: user.siteUser?.email || null,
      name: user.siteUser?.name || null,
      acceptedAt: toIso(user.acceptedAt),
    })),
    venues: supplier.venues.map((link) => ({
      id: link.venue.id,
      slug: link.venue.slug,
      title: link.venue.title,
      cityTitle: link.venue.city?.title || null,
      isPrimary: link.isPrimary,
      isActive: link.isActive,
    })),
    commissionRules: supplier.commissionRules.map((rule) => ({
      id: rule.id,
      scope: String(rule.scope),
      title: rule.title || null,
      percentBps: rule.percentBps,
      fixedFeeKopecks: rule.fixedFeeKopecks,
      priority: rule.priority,
      isActive: rule.isActive,
      startsAt: toIso(rule.startsAt),
      endsAt: toIso(rule.endsAt),
    })),
  };
}

export async function buildSupplierPortalEventsListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<SupplierPortalEventsListDto> {
  const supplier = await resolveSupplierPortal(searchParams);
  return loadSupplierEventRows(supplier.id, searchParams);
}

export async function buildSupplierPortalOrdersListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<SupplierPortalOrdersListDto> {
  const supplier = await resolveSupplierPortal(searchParams);
  return loadSupplierOrderRows(supplier.id, searchParams);
}

export async function buildSupplierPortalFinanceDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<SupplierPortalFinanceDto> {
  const supplier = await resolveSupplierPortal(searchParams);
  const aggregates = await loadSupplierPortalAggregates(supplier.id);
  const [ledger, payouts] = await prisma.$transaction([
    prisma.supplierLedgerEntry.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        amountKopecks: true,
        currency: true,
        referenceType: true,
        referenceId: true,
        note: true,
        createdAt: true,
      },
    }),
    prisma.payout.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        status: true,
        amountKopecks: true,
        commissionKopecks: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
        comment: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    supplier: mapSupplierPortalIdentity(supplier),
    summary: summarizeSupplierPortal(aggregates).finance,
    ledger: ledger.map((entry) => ({
      id: entry.id,
      type: String(entry.type),
      amountKopecks: entry.amountKopecks,
      currency: entry.currency,
      referenceType: entry.referenceType || null,
      referenceId: entry.referenceId || null,
      note: entry.note || null,
      createdAt: toIso(entry.createdAt) || new Date(0).toISOString(),
    })),
    payouts: payouts.map((payout) => ({
      id: payout.id,
      status: String(payout.status),
      amountKopecks: payout.amountKopecks,
      commissionKopecks: payout.commissionKopecks,
      periodStart: toIso(payout.periodStart),
      periodEnd: toIso(payout.periodEnd),
      paidAt: toIso(payout.paidAt),
      comment: payout.comment || null,
      createdAt: toIso(payout.createdAt) || new Date(0).toISOString(),
    })),
  };
}

export async function buildSupplierPortalReviewsListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<SupplierPortalReviewsListDto> {
  const supplier = await resolveSupplierPortal(searchParams);
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const tab = normalizeTab(searchParams.get('tab'));
  const where = buildReviewWhere(supplier.id, tab);

  const [rows, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit + 1,
      include: {
        event: { select: { id: true, slug: true, title: true } },
        supplierResponse: { select: { status: true } },
        disputes: { where: { status: 'MODERATOR_REVIEW' }, select: { id: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    total,
    limit,
    offset,
    hasMore: rows.length > limit,
    filters: { tab },
    items: rows.slice(0, limit).map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title || null,
      text: review.text,
      authorName: review.authorName,
      isVerified: review.isVerified,
      status: String(review.status),
      eventId: review.event?.id || null,
      eventSlug: review.event?.slug || null,
      eventTitle: review.event?.title || null,
      supplierResponseStatus: review.supplierResponse ? String(review.supplierResponse.status) : null,
      hasDispute: review.disputes.length > 0,
      createdAt: toIso(review.createdAt) || new Date(0).toISOString(),
      publishedAt: toIso(review.publishedAt),
    })),
  };
}

export function mapSupplierPortalIdentity(row: SupplierPortalRow): SupplierPortalIdentityDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    legalName: row.legalName || row.legalProfile?.legalName || null,
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

export function summarizeSupplierPortal(aggregates: SupplierPortalAggregates): SupplierPortalSummaryDto {
  return {
    events: summarizeSupplierPortalEvents(aggregates),
    orders: summarizeSupplierPortalOrders(aggregates),
    finance: summarizeSupplierPortalFinance(aggregates),
    reviews: summarizeSupplierPortalReviews(aggregates),
    admissions: summarizeSupplierPortalAdmissions(aggregates),
  };
}

export function summarizeSupplierPortalFinance(
  aggregates: Pick<SupplierPortalAggregates, 'ledgerGroups' | 'payoutGroups' | 'refundGroups' | 'disputeGroups'>,
): SupplierPortalSummaryDto['finance'] {
  const summary: SupplierPortalSummaryDto['finance'] = {
    ledgerBalanceKopecks: 0,
    saleKopecks: 0,
    commissionKopecks: 0,
    refundKopecks: 0,
    payoutKopecks: 0,
    pendingPayoutsKopecks: 0,
    paidPayoutsKopecks: 0,
    openRefundRequests: 0,
    openDisputes: 0,
  };

  for (const row of aggregates.ledgerGroups) {
    const value = row._sum.amountKopecks || 0;
    summary.ledgerBalanceKopecks += value;
    if (row.type === 'SALE') summary.saleKopecks += value;
    if (row.type === 'COMMISSION') summary.commissionKopecks += Math.abs(value);
    if (row.type === 'REFUND') summary.refundKopecks += Math.abs(value);
    if (row.type === 'PAYOUT') summary.payoutKopecks += Math.abs(value);
  }

  for (const row of aggregates.payoutGroups) {
    const value = row._sum.amountKopecks || 0;
    if (row.status === 'PENDING' || row.status === 'DRAFT') summary.pendingPayoutsKopecks += value;
    if (row.status === 'PAID') summary.paidPayoutsKopecks += value;
  }

  for (const row of aggregates.refundGroups) {
    if (['CREATED', 'APPROVED', 'PROCESSING'].includes(row.status)) summary.openRefundRequests += row._count._all;
  }

  for (const row of aggregates.disputeGroups) {
    if (['OPEN', 'UNDER_REVIEW'].includes(row.status)) summary.openDisputes += row._count._all;
  }

  return summary;
}

export function resolveSupplierPortalEventIssues(input: {
  kind: string;
  imageUrl?: string | null;
  nextSessionAt?: string | null;
  offersCount: number;
  hasPurchaseEntry: boolean;
  priceFromRub?: number | null;
}): SupplierPortalEventIssueDto[] {
  const issues: SupplierPortalEventIssueDto[] = [];
  if (!cleanString(input.imageUrl)) {
    issues.push({ code: 'MISSING_IMAGE', label: 'Нет изображения', severity: 'medium' });
  }
  if (input.offersCount < 1) {
    issues.push({ code: 'MISSING_OFFER', label: 'Нет категорий билетов', severity: 'high' });
  }
  if (input.kind !== 'OPEN_DATE' && !input.nextSessionAt) {
    issues.push({ code: 'NO_FUTURE_SESSIONS', label: 'Нет ближайших сеансов', severity: 'high' });
  }
  if (!input.hasPurchaseEntry) {
    issues.push({ code: 'MISSING_PURCHASE_ENTRY', label: 'Не настроена покупка', severity: 'high' });
  }
  if (input.priceFromRub == null) {
    issues.push({ code: 'MISSING_PRICE', label: 'Нет цены', severity: 'high' });
  } else if (input.priceFromRub > 0 && input.priceFromRub < 100) {
    issues.push({ code: 'PRICE_TOO_LOW', label: 'Цена ниже 100 рублей', severity: 'medium' });
  }
  return issues;
}

export function mapSupplierPortalOrderRow(row: SupplierOrderRow): SupplierPortalOrderRowDto {
  return {
    id: row.id,
    orderId: row.order.id,
    publicCode: row.order.publicCode || shortCode(row.order.id),
    subjectType: String(row.subjectType),
    status: String(row.order.status),
    itemStatus: String(row.status),
    title: row.title,
    eventId: row.event?.id || row.eventId || null,
    eventSlug: row.event?.slug || null,
    eventTitle: row.event?.title || null,
    admissionProductId: row.admissionProduct?.id || row.admissionProductId || null,
    admissionProductSlug: row.admissionProduct?.slug || null,
    admissionProductTitle: row.admissionProduct?.title || null,
    sessionId: row.session?.id || row.sessionId || null,
    startsAt: toIso(row.session?.startsAt),
    ticketTitle: row.ticketTitle || row.offer?.title || row.admissionOffer?.title || null,
    quantity: row.quantity,
    unitPriceKopecks: row.unitPriceKopecks,
    totalKopecks: row.totalKopecks,
    commissionKopecks: row.commissionKopecks,
    buyerName: row.order.buyerName || null,
    buyerEmail: row.order.buyerEmail || null,
    buyerPhone: row.order.buyerPhone || null,
    paidAt: toIso(row.order.paidAt),
    createdAt: toIso(row.createdAt) || new Date(0).toISOString(),
  };
}

async function resolveSupplierPortal(searchParams: URLSearchParams): Promise<SupplierPortalRow> {
  const idOrSlug = cleanString(searchParams.get('supplierId')) ||
    cleanString(searchParams.get('slug')) ||
    cleanString(searchParams.get('supplier'));
  if (!idOrSlug) throwHttpError('supplier_required', 400);

  const supplier = await prisma.supplier.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: supplierPortalInclude,
  });
  if (!supplier) throwHttpError('supplier_not_found', 404);
  return supplier;
}

async function loadSupplierPortalAggregates(supplierId: string): Promise<SupplierPortalAggregates> {
  const eventWhere = buildSupplierEventWhere(supplierId);
  const [
    eventGroups,
    supplierEventGroups,
    orderGroups,
    ledgerGroups,
    payoutGroups,
    refundGroups,
    disputeGroups,
    reviewGroups,
    reviewAverage,
    approvedReviews,
    reviewDisputes,
    admissionGroups,
  ] = await prisma.$transaction([
    prisma.event.groupBy({
      by: ['status', 'purchaseFlow', 'managementMode'],
      where: eventWhere,
      _count: { _all: true },
    }),
    prisma.supplierEvent.groupBy({
      by: ['catalogMode', 'managementMode', 'isActive'],
      where: { supplierId },
      _count: { _all: true },
    }),
    prisma.checkoutItem.groupBy({
      by: ['status'],
      where: { supplierId },
      _count: { _all: true },
      _sum: { totalKopecks: true, commissionKopecks: true },
    }),
    prisma.supplierLedgerEntry.groupBy({
      by: ['type'],
      where: { supplierId },
      _sum: { amountKopecks: true },
    }),
    prisma.payout.groupBy({
      by: ['status'],
      where: { supplierId },
      _sum: { amountKopecks: true },
    }),
    prisma.refundRequest.groupBy({
      by: ['status'],
      where: { supplierId },
      _count: { _all: true },
    }),
    prisma.supplierDispute.groupBy({
      by: ['status'],
      where: { supplierId },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ['status'],
      where: { supplierId },
      _count: { _all: true },
    }),
    prisma.review.aggregate({
      where: { supplierId, status: 'APPROVED' },
      _avg: { rating: true },
    }),
    prisma.review.findMany({
      where: { supplierId, status: 'APPROVED' },
      select: { id: true, supplierResponse: { select: { id: true } } },
      take: 500,
    }),
    prisma.reviewDispute.count({
      where: { supplierId, status: 'MODERATOR_REVIEW' },
    }),
    prisma.admissionProduct.groupBy({
      by: ['status', 'purchaseFlow'],
      where: { supplierId },
      _count: { _all: true },
    }),
  ]);

  return {
    eventGroups: eventGroups as EventGroupAggregate[],
    supplierEventGroups: supplierEventGroups as SupplierEventGroupAggregate[],
    orderGroups: orderGroups as OrderGroupAggregate[],
    ledgerGroups: ledgerGroups as LedgerGroupAggregate[],
    payoutGroups: payoutGroups as PayoutGroupAggregate[],
    refundGroups: refundGroups as CountByStatusAggregate[],
    disputeGroups: disputeGroups as CountByStatusAggregate[],
    reviewGroups: reviewGroups as ReviewGroupAggregate[],
    reviewAverage: reviewAverage._avg.rating,
    reviewsNeedingResponse: approvedReviews.filter((review) => !review.supplierResponse).length,
    reviewDisputes,
    admissionGroups: admissionGroups as AdmissionGroupAggregate[],
  };
}

async function loadSupplierEventRows(
  supplierId: string,
  searchParams: URLSearchParams,
): Promise<SupplierPortalEventsListDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const q = cleanString(searchParams.get('q'));
  const status = normalizeStatusFilter(searchParams.get('status'));
  const where = buildSupplierEventWhere(supplierId, q, status);

  const [rows, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: offset,
      take: limit + 1,
      select: supplierEventListSelect,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    total,
    limit,
    offset,
    hasMore: rows.length > limit,
    filters: { q, status },
    items: rows.slice(0, limit).map((row) => mapSupplierPortalEventRow(row, supplierId)),
  };
}

async function loadSupplierOrderRows(
  supplierId: string,
  searchParams: URLSearchParams,
): Promise<SupplierPortalOrdersListDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const status = normalizeStatusFilter(searchParams.get('status'));
  const where: Prisma.CheckoutItemWhereInput = { supplierId };
  if (status) where.status = status as never;

  const [rows, total] = await prisma.$transaction([
    prisma.checkoutItem.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: offset,
      take: limit + 1,
      include: {
        order: {
          select: {
            id: true,
            publicCode: true,
            status: true,
            buyerEmail: true,
            buyerPhone: true,
            buyerName: true,
            paidAt: true,
            createdAt: true,
          },
        },
        event: { select: { id: true, slug: true, title: true } },
        session: { select: { id: true, startsAt: true } },
        offer: { select: { id: true, title: true } },
        admissionProduct: { select: { id: true, slug: true, title: true } },
        admissionOffer: { select: { id: true, title: true } },
      },
    }),
    prisma.checkoutItem.count({ where }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    total,
    limit,
    offset,
    hasMore: rows.length > limit,
    filters: { status },
    items: rows.slice(0, limit).map(mapSupplierPortalOrderRow),
  };
}

async function loadUpcomingSessions(supplierId: string, limit: number): Promise<SupplierPortalSessionPreviewDto[]> {
  const sessions = await prisma.eventSession.findMany({
    where: {
      isActive: true,
      cancelledAt: null,
      startsAt: { gte: new Date() },
      event: buildSupplierEventWhere(supplierId),
    },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    take: limit,
    select: {
      id: true,
      eventId: true,
      startsAt: true,
      endsAt: true,
      capacityTotal: true,
      capacitySold: true,
      ticketsVacant: true,
      event: { select: { slug: true, title: true } },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    eventId: session.eventId,
    eventSlug: session.event.slug,
    eventTitle: session.event.title,
    startsAt: toIso(session.startsAt),
    endsAt: toIso(session.endsAt),
    capacityTotal: session.capacityTotal,
    capacitySold: session.capacitySold,
    ticketsVacant: session.ticketsVacant,
  }));
}

function mapSupplierPortalEventRow(row: SupplierEventListRow, supplierId: string): SupplierPortalEventRowDto {
  const ownLink = row.supplierLinks.find((link) => link.supplierId === supplierId) || null;
  const nextSession = row.sessions.find((session) => session.startsAt && session.startsAt >= new Date()) ||
    row.sessions.find((session) => session.startsAt) ||
    null;
  const priceFromRub = pickPriceRub(row.priceFromRub, row.offers.map((offer) => offer.priceRub), row.sessions.map((session) => session.priceFromRub));
  const hasPurchaseEntry = row.purchaseFlow === 'PLATFORM' ||
    row.offers.some((offer) => Boolean(cleanString(offer.widgetUrl) || cleanString(offer.deeplinkUrl)));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: String(row.status),
    kind: String(row.kind),
    purchaseFlow: String(row.purchaseFlow),
    managementMode: String(ownLink?.managementMode || row.managementMode),
    catalogMode: String(ownLink?.catalogMode || (row.purchaseFlow === 'PLATFORM' ? 'INTERNAL_CHECKOUT' : 'WIDGET_ONLY')),
    sourceManaged: String(row.managementMode) === 'SOURCE_MANAGED',
    city: {
      id: row.primaryCity?.id || null,
      slug: row.primaryCity?.slug || null,
      title: row.primaryCity?.title || null,
    },
    venue: {
      id: row.venue?.id || null,
      slug: row.venue?.slug || null,
      title: row.venue?.title || null,
    },
    priceFromRub,
    imageUrl: row.imageUrl || null,
    nextSessionAt: toIso(nextSession?.startsAt),
    activeSessions: row._count.sessions,
    offersCount: row._count.offers,
    ticketsVacant: row.ticketsVacant ?? nextSession?.ticketsVacant ?? null,
    canEditContent: Boolean(ownLink?.canEditContent),
    canEditMedia: Boolean(ownLink?.canEditMedia),
    canEditSeo: Boolean(ownLink?.canEditSeo),
    canEditSchedule: Boolean(ownLink?.canEditSchedule),
    canEditOffers: Boolean(ownLink?.canEditOffers),
    readinessIssues: resolveSupplierPortalEventIssues({
      kind: String(row.kind),
      imageUrl: row.imageUrl,
      nextSessionAt: toIso(nextSession?.startsAt),
      offersCount: row._count.offers,
      hasPurchaseEntry,
      priceFromRub,
    }),
    updatedAt: toIso(row.updatedAt) || new Date(0).toISOString(),
  };
}

function resolveSupplierPortalReadiness(
  supplier: SupplierPortalRow,
  summary: SupplierPortalSummaryDto,
): SupplierPortalReadinessDto {
  const users = supplier.users.filter((user) => user.isActive);
  const ownerUsersCount = users.filter((user) => ['OWNER', 'ADMIN'].includes(String(user.role))).length;
  const activeCommissionRules = supplier.commissionRules.filter((rule) => rule.isActive).length;
  const legalProfileStatus = supplier.legalProfile ? String(supplier.legalProfile.status) : null;
  const hasPrimaryBankAccount = Boolean(supplier.legalProfile?.bankAccounts.some((account) => account.isPrimary));

  return resolveSupplierCheckoutReadiness({
    status: String(supplier.status),
    legalProfileStatus,
    hasLegalProfile: Boolean(supplier.legalProfile),
    hasPrimaryBankAccount,
    ownerUsersCount,
    activeCommissionRules,
    defaultCommissionBps: supplier.defaultCommissionBps || 0,
    yookassaShopId: supplier.yookassaShopId || null,
    internalCheckoutEvents: summary.events.internalCheckout + summary.events.hybrid + summary.admissions.platform,
  });
}

function summarizeSupplierPortalEvents(aggregates: SupplierPortalAggregates): SupplierPortalSummaryDto['events'] {
  const summary: SupplierPortalSummaryDto['events'] = {
    total: 0,
    active: 0,
    published: 0,
    widgetOnly: 0,
    internalCheckout: 0,
    hybrid: 0,
    sourceManaged: 0,
    daibiletManaged: 0,
    supplierDrafts: 0,
    supplierSelfService: 0,
  };

  for (const row of aggregates.eventGroups) {
    const count = row._count._all;
    summary.total += count;
    if (row.status === 'PUBLISHED' || row.status === 'READY') summary.active += count;
    if (row.status === 'PUBLISHED') summary.published += count;
    addManagementCount(summary, row.managementMode, count);
  }

  if (aggregates.supplierEventGroups.length) {
    for (const row of aggregates.supplierEventGroups) {
      const count = row._count._all;
      if (row.catalogMode === 'INTERNAL_CHECKOUT') summary.internalCheckout += count;
      if (row.catalogMode === 'HYBRID') summary.hybrid += count;
      if (row.catalogMode === 'WIDGET_ONLY') summary.widgetOnly += count;
      addManagementCount(summary, row.managementMode, count);
    }
  } else {
    for (const row of aggregates.eventGroups) {
      const count = row._count._all;
      if (row.purchaseFlow === 'PLATFORM') summary.internalCheckout += count;
      if (row.purchaseFlow === 'EXTERNAL') summary.widgetOnly += count;
    }
  }

  return summary;
}

function summarizeSupplierPortalAdmissions(aggregates: SupplierPortalAggregates): SupplierPortalSummaryDto['admissions'] {
  const summary: SupplierPortalSummaryDto['admissions'] = {
    total: 0,
    published: 0,
    platform: 0,
    canSell: 0,
    needsAttention: 0,
  };

  for (const row of aggregates.admissionGroups) {
    const count = row._count._all;
    summary.total += count;
    if (row.status === 'PUBLISHED') summary.published += count;
    if (row.purchaseFlow === 'PLATFORM') summary.platform += count;
    if (row.status === 'PUBLISHED' && row.purchaseFlow === 'PLATFORM') summary.canSell += count;
    if (row.status !== 'PUBLISHED' || row.purchaseFlow !== 'PLATFORM') summary.needsAttention += count;
  }

  return summary;
}

function summarizeSupplierPortalOrders(aggregates: SupplierPortalAggregates): SupplierPortalSummaryDto['orders'] {
  const summary: SupplierPortalSummaryDto['orders'] = {
    totalItems: 0,
    reserved: 0,
    confirmed: 0,
    fulfilled: 0,
    cancelled: 0,
    refunded: 0,
    grossKopecks: 0,
    commissionKopecks: 0,
  };

  for (const row of aggregates.orderGroups) {
    const count = row._count._all;
    summary.totalItems += count;
    summary.grossKopecks += row._sum.totalKopecks || 0;
    summary.commissionKopecks += row._sum.commissionKopecks || 0;
    if (row.status === 'RESERVED') summary.reserved += count;
    if (row.status === 'CONFIRMED') summary.confirmed += count;
    if (row.status === 'FULFILLED') summary.fulfilled += count;
    if (row.status === 'CANCELLED') summary.cancelled += count;
    if (row.status === 'REFUNDED') summary.refunded += count;
  }

  return summary;
}

function summarizeSupplierPortalReviews(aggregates: SupplierPortalAggregates): SupplierPortalSummaryDto['reviews'] {
  const summary: SupplierPortalSummaryDto['reviews'] = {
    total: 0,
    pendingModeration: 0,
    approved: 0,
    hidden: 0,
    needsResponse: aggregates.reviewsNeedingResponse,
    disputes: aggregates.reviewDisputes,
    averageRating: aggregates.reviewAverage,
  };

  for (const row of aggregates.reviewGroups) {
    const count = row._count._all;
    summary.total += count;
    if (row.status === 'PENDING_MODERATION') summary.pendingModeration += count;
    if (row.status === 'APPROVED') summary.approved += count;
    if (row.status === 'HIDDEN') summary.hidden += count;
  }

  return summary;
}

function buildSupplierEventWhere(supplierId: string, q?: string | null, status?: string | null): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {
    OR: [
      { supplierId },
      { supplierLinks: { some: { supplierId, isActive: true } } },
    ],
  };
  if (status) where.status = status as never;
  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { primaryCity: { title: { contains: q, mode: 'insensitive' } } },
          { venue: { title: { contains: q, mode: 'insensitive' } } },
        ],
      },
    ];
  }
  return where;
}

function buildReviewWhere(supplierId: string, tab: string): Prisma.ReviewWhereInput {
  if (tab === 'needs_response') {
    return {
      supplierId,
      status: 'APPROVED',
      supplierResponse: { is: null },
    };
  }
  if (tab === 'disputed') {
    return {
      supplierId,
      disputes: { some: { status: 'MODERATOR_REVIEW' } },
    };
  }
  if (tab === 'responded') {
    return {
      supplierId,
      supplierResponse: { isNot: null },
    };
  }
  return { supplierId };
}

function addManagementCount(summary: SupplierPortalSummaryDto['events'], managementMode: string, count: number): void {
  if (managementMode === 'SOURCE_MANAGED') summary.sourceManaged += count;
  if (managementMode === 'DAIBILET_MANAGED') summary.daibiletManaged += count;
  if (managementMode === 'SUPPLIER_DRAFTS') summary.supplierDrafts += count;
  if (managementMode === 'SUPPLIER_SELF_SERVICE') summary.supplierSelfService += count;
}

function pickPriceRub(primary: number | null, offers: Array<number | null>, sessions: Array<number | null>): number | null {
  const candidates = [primary, ...offers, ...sessions].filter((value): value is number => typeof value === 'number' && value >= 100);
  if (candidates.length) return Math.min(...candidates);
  const fallback = [primary, ...offers, ...sessions].find((value) => typeof value === 'number' && value > 0);
  return fallback ?? null;
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function normalizeStatusFilter(value: string | null): string | null {
  const normalized = cleanString(value)?.toUpperCase();
  if (!normalized || normalized === 'ALL') return null;
  return normalized;
}

function normalizeTab(value: string | null): string {
  const normalized = cleanString(value)?.toLowerCase();
  if (!normalized) return 'all';
  if (['all', 'needs_response', 'disputed', 'responded'].includes(normalized)) return normalized;
  return 'all';
}

function maskAccount(value: string | null | undefined): string | null {
  const cleaned = String(value || '').replace(/\D/g, '');
  if (!cleaned) return null;
  if (cleaned.length <= 4) return cleaned;
  return `${'*'.repeat(Math.max(0, cleaned.length - 4))}${cleaned.slice(-4)}`;
}

function shortCode(value: string): string {
  return value.replace(/\D/g, '').slice(-7) || value.slice(-7);
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
