import type {
  AdminSupplierDetailDto,
  AdminSupplierEventsSummaryDto,
  AdminSupplierFinanceSummaryDto,
  AdminSupplierLegalSummaryDto,
  AdminSupplierOrdersSummaryDto,
  AdminSupplierReadinessCode,
  AdminSupplierReadinessDto,
  AdminSupplierReviewSummaryDto,
  AdminSupplierRowDto,
  AdminSuppliersListDto,
} from '@daibilet/contracts/admin';
import type { ReadinessIssue } from '@daibilet/contracts/common';
import { prisma, type Prisma } from '@daibilet/db';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type SupplierStatus = string;
type SupplierCatalogMode = string;
type PaymentMode = string;
type PspFeeMode = string;

export interface SupplierReadinessInput {
  status: SupplierStatus;
  legalProfileStatus?: string | null;
  hasLegalProfile: boolean;
  hasPrimaryBankAccount: boolean;
  ownerUsersCount: number;
  activeCommissionRules: number;
  defaultCommissionBps: number;
  yookassaShopId?: string | null;
  internalCheckoutEvents: number;
}

type SupplierBaseRow = {
  id: string;
  slug: string;
  title: string;
  legalName?: string | null;
  kind: string;
  status: string;
  inn?: string | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  yookassaShopId?: string | null;
  defaultCatalogMode: string;
  paymentMode: string;
  pspFeeMode: string;
  defaultCommissionBps: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  users?: SupplierUserRow[];
  legalProfile?: SupplierLegalProfileRow | null;
  commissionRules?: SupplierCommissionRuleRow[];
};

type SupplierUserRow = {
  id: string;
  role: string;
  isActive: boolean;
  acceptedAt?: Date | string | null;
  siteUser?: {
    email?: string | null;
    name?: string | null;
  } | null;
};

type SupplierLegalProfileRow = {
  status?: string | null;
  legalName?: string | null;
  inn?: string | null;
  taxMode?: string | null;
  isVatPayer?: boolean | null;
  bankAccounts?: Array<{ id: string; isPrimary: boolean }>;
};

type SupplierCommissionRuleRow = {
  id: string;
  scope: string;
  title?: string | null;
  percentBps: number;
  fixedFeeKopecks: number;
  priority: number;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  isActive: boolean;
};

interface SupplierAggregates {
  eventGroups: Map<string, EventGroupAggregate[]>;
  supplierEventGroups: Map<string, SupplierEventGroupAggregate[]>;
  orderGroups: Map<string, OrderGroupAggregate[]>;
  ledgerGroups: Map<string, LedgerGroupAggregate[]>;
  payoutGroups: Map<string, PayoutGroupAggregate[]>;
  refundGroups: Map<string, CountByStatusAggregate[]>;
  disputeGroups: Map<string, CountByStatusAggregate[]>;
  reviewGroups: Map<string, ReviewGroupAggregate[]>;
  reviewAverages: Map<string, number | null>;
}

type EventGroupAggregate = {
  supplierId: string | null;
  status: string;
  purchaseFlow: string;
  managementMode: string;
  _count: { _all: number };
};

type SupplierEventGroupAggregate = {
  supplierId: string;
  catalogMode: string;
  managementMode: string;
  isActive: boolean;
  _count: { _all: number };
};

type OrderGroupAggregate = {
  supplierId: string | null;
  status: string;
  _count: { _all: number };
  _sum: { totalKopecks: number | null; commissionKopecks: number | null };
};

type LedgerGroupAggregate = {
  supplierId: string;
  type: string;
  _sum: { amountKopecks: number | null };
};

type PayoutGroupAggregate = {
  supplierId: string;
  status: string;
  _sum: { amountKopecks: number | null };
};

type CountByStatusAggregate = {
  supplierId: string | null;
  status: string;
  _count: { _all: number };
};

type ReviewGroupAggregate = {
  supplierId: string | null;
  status: string;
  _count: { _all: number };
};

const readinessLabels: Record<AdminSupplierReadinessCode, { label: string; severity: 'medium' | 'high' }> = {
  SUPPLIER_NOT_ACTIVE: { label: 'Поставщик не активен', severity: 'high' },
  MISSING_OWNER_USER: { label: 'Нет активного владельца ЛК', severity: 'high' },
  MISSING_LEGAL_PROFILE: { label: 'Не заполнен юридический профиль', severity: 'high' },
  LEGAL_PROFILE_NOT_VERIFIED: { label: 'Юридический профиль не проверен', severity: 'high' },
  MISSING_PRIMARY_BANK_ACCOUNT: { label: 'Не указан основной банковский счет', severity: 'high' },
  MISSING_COMMISSION_RULE: { label: 'Не задана комиссия', severity: 'high' },
  MISSING_YOOKASSA_SHOP: { label: 'Не подключен магазин YooKassa', severity: 'high' },
  NO_INTERNAL_CHECKOUT_EVENTS: { label: 'Нет событий с внутренней оплатой', severity: 'medium' },
};

export async function buildAdminSuppliersListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<AdminSuppliersListDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const q = cleanString(searchParams.get('q'));
  const status = normalizeStatusFilter(searchParams.get('status'));
  const where = buildSupplierWhere(q, status);

  const [rows, total, statusGroups] = await prisma.$transaction([
    prisma.supplier.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      skip: offset,
      take: limit + 1,
      include: supplierListInclude,
    }),
    prisma.supplier.count({ where }),
    prisma.supplier.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const pageRows = rows.slice(0, limit);
  const aggregates = await loadSupplierAggregates(pageRows.map((row) => row.id));
  const items = pageRows.map((row) => mapAdminSupplierRow(row, aggregates));
  const metrics = buildSupplierListMetrics(statusGroups as Array<{ status: string; _count: { _all: number } }>, items);

  return {
    generatedAt: new Date().toISOString(),
    total,
    limit,
    offset,
    hasMore: rows.length > limit,
    filters: { q, status },
    metrics,
    items,
  };
}

export async function buildAdminSupplierDetailDto(idOrSlug: string): Promise<AdminSupplierDetailDto> {
  const supplier = await prisma.supplier.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: supplierDetailInclude,
  });

  if (!supplier) {
    const error = new Error('supplier_not_found');
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  const aggregates = await loadSupplierAggregates([supplier.id]);
  const row = mapAdminSupplierRow(supplier, aggregates);
  const [eventsSample, recentLedgerEntries] = await prisma.$transaction([
    prisma.event.findMany({
      where: { supplierId: supplier.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        purchaseFlow: true,
        managementMode: true,
        priceFromRub: true,
      },
    }),
    prisma.supplierLedgerEntry.findMany({
      where: { supplierId: supplier.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        amountKopecks: true,
        note: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    ...row,
    users: (supplier.users || []).map((user) => ({
      id: user.id,
      role: String(user.role),
      isActive: user.isActive,
      email: user.siteUser?.email || null,
      name: user.siteUser?.name || null,
      acceptedAt: toIso(user.acceptedAt),
    })),
    commissionRules: (supplier.commissionRules || []).map((rule) => ({
      id: rule.id,
      scope: String(rule.scope),
      title: rule.title || null,
      percentBps: rule.percentBps,
      fixedFeeKopecks: rule.fixedFeeKopecks,
      priority: rule.priority,
      startsAt: toIso(rule.startsAt),
      endsAt: toIso(rule.endsAt),
      isActive: rule.isActive,
    })),
    eventsSample: eventsSample.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: String(event.status),
      purchaseFlow: String(event.purchaseFlow),
      managementMode: String(event.managementMode),
      priceFromRub: event.priceFromRub,
    })),
    recentLedgerEntries: recentLedgerEntries.map((entry) => ({
      id: entry.id,
      type: String(entry.type),
      amountKopecks: entry.amountKopecks,
      note: entry.note || null,
      createdAt: toIso(entry.createdAt) || new Date(0).toISOString(),
    })),
  };
}

export function mapAdminSupplierRow(row: SupplierBaseRow, aggregates: SupplierAggregates): AdminSupplierRowDto {
  const users = (row.users || []).filter((user) => user.isActive);
  const ownerUsersCount = users.filter((user) => ['OWNER', 'ADMIN'].includes(String(user.role))).length;
  const legal = mapLegal(row.legalProfile);
  const events = summarizeEvents(row.id, aggregates);
  const orders = summarizeOrders(row.id, aggregates);
  const finance = summarizeFinance(row.id, aggregates);
  const reviews = summarizeReviews(row.id, aggregates);
  const activeCommissionRules = (row.commissionRules || []).filter((rule) => rule.isActive).length;
  const readiness = resolveSupplierCheckoutReadiness({
    status: row.status,
    legalProfileStatus: legal.status ?? null,
    hasLegalProfile: Boolean(row.legalProfile),
    hasPrimaryBankAccount: legal.hasPrimaryBankAccount,
    ownerUsersCount,
    activeCommissionRules,
    defaultCommissionBps: row.defaultCommissionBps || 0,
    yookassaShopId: row.yookassaShopId ?? null,
    internalCheckoutEvents: events.internalCheckout + events.hybrid,
  });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    legalName: row.legalName || legal.legalName || null,
    kind: String(row.kind),
    status: String(row.status),
    email: row.email || null,
    phone: row.phone || null,
    websiteUrl: row.websiteUrl || null,
    defaultCatalogMode: String(row.defaultCatalogMode),
    paymentMode: String(row.paymentMode),
    pspFeeMode: String(row.pspFeeMode),
    defaultCommissionBps: row.defaultCommissionBps || 0,
    yookassaShopId: row.yookassaShopId || null,
    usersCount: users.length,
    ownerUsersCount,
    legal,
    events,
    orders,
    finance,
    reviews,
    readiness,
    createdAt: toIso(row.createdAt) || new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date(0).toISOString(),
  };
}

export function resolveSupplierCheckoutReadiness(input: SupplierReadinessInput): AdminSupplierReadinessDto {
  const blockers: ReadinessIssue[] = [];
  const warnings: ReadinessIssue[] = [];

  addIssue(blockers, input.status !== 'ACTIVE', 'SUPPLIER_NOT_ACTIVE');
  addIssue(blockers, input.ownerUsersCount < 1, 'MISSING_OWNER_USER');
  addIssue(blockers, !input.hasLegalProfile, 'MISSING_LEGAL_PROFILE');
  addIssue(
    blockers,
    input.hasLegalProfile && input.legalProfileStatus !== 'VERIFIED',
    'LEGAL_PROFILE_NOT_VERIFIED',
  );
  addIssue(blockers, !input.hasPrimaryBankAccount, 'MISSING_PRIMARY_BANK_ACCOUNT');
  addIssue(
    blockers,
    input.activeCommissionRules < 1 && input.defaultCommissionBps <= 0,
    'MISSING_COMMISSION_RULE',
  );
  addIssue(blockers, !cleanString(input.yookassaShopId || null), 'MISSING_YOOKASSA_SHOP');
  addIssue(warnings, input.internalCheckoutEvents < 1, 'NO_INTERNAL_CHECKOUT_EVENTS');

  const canEnableInternalCheckout = blockers.length === 0;
  return {
    status: canEnableInternalCheckout ? (warnings.length ? 'review' : 'ready') : 'blocked',
    canEnableInternalCheckout,
    blockers,
    warnings,
  };
}

const supplierListInclude = {
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
        where: { isPrimary: true },
        take: 1,
        select: { id: true, isPrimary: true },
      },
    },
  },
  commissionRules: {
    where: { isActive: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 5,
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
} satisfies Prisma.SupplierInclude;

const supplierDetailInclude = {
  ...supplierListInclude,
  commissionRules: {
    orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    select: supplierListInclude.commissionRules.select,
  },
} satisfies Prisma.SupplierInclude;

async function loadSupplierAggregates(supplierIds: string[]): Promise<SupplierAggregates> {
  if (!supplierIds.length) return emptyAggregates();

  const [
    eventGroups,
    supplierEventGroups,
    orderGroups,
    ledgerGroups,
    payoutGroups,
    refundGroups,
    disputeGroups,
    reviewGroups,
    reviewAverages,
  ] = await prisma.$transaction([
    prisma.event.groupBy({
      by: ['supplierId', 'status', 'purchaseFlow', 'managementMode'],
      where: { supplierId: { in: supplierIds } },
      _count: { _all: true },
    }),
    prisma.supplierEvent.groupBy({
      by: ['supplierId', 'catalogMode', 'managementMode', 'isActive'],
      where: { supplierId: { in: supplierIds } },
      _count: { _all: true },
    }),
    prisma.checkoutItem.groupBy({
      by: ['supplierId', 'status'],
      where: { supplierId: { in: supplierIds } },
      _count: { _all: true },
      _sum: { totalKopecks: true, commissionKopecks: true },
    }),
    prisma.supplierLedgerEntry.groupBy({
      by: ['supplierId', 'type'],
      where: { supplierId: { in: supplierIds } },
      _sum: { amountKopecks: true },
    }),
    prisma.payout.groupBy({
      by: ['supplierId', 'status'],
      where: { supplierId: { in: supplierIds } },
      _sum: { amountKopecks: true },
    }),
    prisma.refundRequest.groupBy({
      by: ['supplierId', 'status'],
      where: { supplierId: { in: supplierIds } },
      _count: { _all: true },
    }),
    prisma.supplierDispute.groupBy({
      by: ['supplierId', 'status'],
      where: { supplierId: { in: supplierIds } },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ['supplierId', 'status'],
      where: { supplierId: { in: supplierIds } },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ['supplierId'],
      where: { supplierId: { in: supplierIds }, status: 'APPROVED' },
      _avg: { rating: true },
    }),
  ]);

  return {
    eventGroups: groupBySupplier(eventGroups as EventGroupAggregate[]),
    supplierEventGroups: groupBySupplier(supplierEventGroups as SupplierEventGroupAggregate[]),
    orderGroups: groupBySupplier(orderGroups as OrderGroupAggregate[]),
    ledgerGroups: groupBySupplier(ledgerGroups as LedgerGroupAggregate[]),
    payoutGroups: groupBySupplier(payoutGroups as PayoutGroupAggregate[]),
    refundGroups: groupBySupplier(refundGroups as CountByStatusAggregate[]),
    disputeGroups: groupBySupplier(disputeGroups as CountByStatusAggregate[]),
    reviewGroups: groupBySupplier(reviewGroups as ReviewGroupAggregate[]),
    reviewAverages: new Map(
      (reviewAverages as Array<{ supplierId: string | null; _avg: { rating: number | null } }>)
        .filter((row) => row.supplierId)
        .map((row) => [row.supplierId as string, row._avg.rating]),
    ),
  };
}

function emptyAggregates(): SupplierAggregates {
  return {
    eventGroups: new Map(),
    supplierEventGroups: new Map(),
    orderGroups: new Map(),
    ledgerGroups: new Map(),
    payoutGroups: new Map(),
    refundGroups: new Map(),
    disputeGroups: new Map(),
    reviewGroups: new Map(),
    reviewAverages: new Map(),
  };
}

function summarizeEvents(supplierId: string, aggregates: SupplierAggregates): AdminSupplierEventsSummaryDto {
  const events = aggregates.eventGroups.get(supplierId) || [];
  const supplierEvents = aggregates.supplierEventGroups.get(supplierId) || [];
  const summary: AdminSupplierEventsSummaryDto = {
    total: 0,
    active: 0,
    published: 0,
    internalCheckout: 0,
    hybrid: 0,
    widgetOnly: 0,
    sourceManaged: 0,
    daibiletManaged: 0,
    supplierDrafts: 0,
    supplierSelfService: 0,
  };

  for (const row of events) {
    const count = row._count._all;
    summary.total += count;
    if (row.status === 'PUBLISHED' || row.status === 'READY') summary.active += count;
    if (row.status === 'PUBLISHED') summary.published += count;
    if (row.purchaseFlow === 'PLATFORM') summary.internalCheckout += count;
    if (row.purchaseFlow === 'EXTERNAL') summary.widgetOnly += count;
    addManagementCount(summary, row.managementMode, count);
  }

  for (const row of supplierEvents) {
    const count = row._count._all;
    if (summary.total === 0) summary.total += count;
    if (row.isActive && summary.active === 0) summary.active += count;
    if (row.catalogMode === 'INTERNAL_CHECKOUT') summary.internalCheckout += count;
    if (row.catalogMode === 'HYBRID') summary.hybrid += count;
    if (row.catalogMode === 'WIDGET_ONLY') summary.widgetOnly += count;
    addManagementCount(summary, row.managementMode, count);
  }

  return summary;
}

function summarizeOrders(supplierId: string, aggregates: SupplierAggregates): AdminSupplierOrdersSummaryDto {
  const summary: AdminSupplierOrdersSummaryDto = {
    totalItems: 0,
    reserved: 0,
    confirmed: 0,
    fulfilled: 0,
    cancelled: 0,
    refunded: 0,
    grossKopecks: 0,
    commissionKopecks: 0,
  };

  for (const row of aggregates.orderGroups.get(supplierId) || []) {
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

function summarizeFinance(supplierId: string, aggregates: SupplierAggregates): AdminSupplierFinanceSummaryDto {
  const summary: AdminSupplierFinanceSummaryDto = {
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

  for (const row of aggregates.ledgerGroups.get(supplierId) || []) {
    const value = row._sum.amountKopecks || 0;
    summary.ledgerBalanceKopecks += value;
    if (row.type === 'SALE') summary.saleKopecks += value;
    if (row.type === 'COMMISSION') summary.commissionKopecks += Math.abs(value);
    if (row.type === 'REFUND') summary.refundKopecks += Math.abs(value);
    if (row.type === 'PAYOUT') summary.payoutKopecks += Math.abs(value);
  }

  for (const row of aggregates.payoutGroups.get(supplierId) || []) {
    const value = row._sum.amountKopecks || 0;
    if (row.status === 'PENDING' || row.status === 'DRAFT') summary.pendingPayoutsKopecks += value;
    if (row.status === 'PAID') summary.paidPayoutsKopecks += value;
  }

  for (const row of aggregates.refundGroups.get(supplierId) || []) {
    if (['CREATED', 'APPROVED', 'PROCESSING'].includes(row.status)) summary.openRefundRequests += row._count._all;
  }

  for (const row of aggregates.disputeGroups.get(supplierId) || []) {
    if (['OPEN', 'UNDER_REVIEW'].includes(row.status)) summary.openDisputes += row._count._all;
  }

  return summary;
}

function summarizeReviews(supplierId: string, aggregates: SupplierAggregates): AdminSupplierReviewSummaryDto {
  const summary: AdminSupplierReviewSummaryDto = {
    total: 0,
    pendingModeration: 0,
    approved: 0,
    hidden: 0,
    averageRating: aggregates.reviewAverages.get(supplierId) ?? null,
  };

  for (const row of aggregates.reviewGroups.get(supplierId) || []) {
    const count = row._count._all;
    summary.total += count;
    if (row.status === 'PENDING_MODERATION') summary.pendingModeration += count;
    if (row.status === 'APPROVED') summary.approved += count;
    if (row.status === 'HIDDEN') summary.hidden += count;
  }

  return summary;
}

function mapLegal(profile?: SupplierLegalProfileRow | null): AdminSupplierLegalSummaryDto {
  return {
    status: profile?.status || null,
    legalName: profile?.legalName || null,
    inn: profile?.inn || null,
    taxMode: profile?.taxMode || null,
    isVatPayer: profile?.isVatPayer ?? null,
    hasPrimaryBankAccount: Boolean(profile?.bankAccounts?.some((account) => account.isPrimary)),
  };
}

function buildSupplierWhere(q: string | null, status: string | null): Prisma.SupplierWhereInput {
  const where: Prisma.SupplierWhereInput = {};
  if (status) where.status = status as never;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { legalName: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { inn: { contains: q } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
    ];
  }
  return where;
}

function buildSupplierListMetrics(
  statusGroups: Array<{ status: string; _count: { _all: number } }>,
  items: AdminSupplierRowDto[],
) {
  const countStatus = (status: string) => statusGroups.find((row) => row.status === status)?._count._all || 0;
  return {
    total: statusGroups.reduce((sum, row) => sum + row._count._all, 0),
    active: countStatus('ACTIVE'),
    review: countStatus('REVIEW'),
    draft: countStatus('DRAFT'),
    paused: countStatus('PAUSED'),
    checkoutReady: items.filter((item) => item.readiness.canEnableInternalCheckout).length,
    needsAttention: items.filter((item) => item.readiness.status === 'blocked').length,
  };
}

function groupBySupplier<T extends { supplierId: string | null }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.supplierId) continue;
    const list = map.get(row.supplierId) || [];
    list.push(row);
    map.set(row.supplierId, list);
  }
  return map;
}

function addManagementCount(summary: AdminSupplierEventsSummaryDto, managementMode: string, count: number): void {
  if (managementMode === 'SOURCE_MANAGED') summary.sourceManaged += count;
  if (managementMode === 'DAIBILET_MANAGED') summary.daibiletManaged += count;
  if (managementMode === 'SUPPLIER_DRAFTS') summary.supplierDrafts += count;
  if (managementMode === 'SUPPLIER_SELF_SERVICE') summary.supplierSelfService += count;
}

function addIssue(
  target: ReadinessIssue[],
  condition: boolean,
  code: AdminSupplierReadinessCode,
): void {
  if (!condition) return;
  const meta = readinessLabels[code];
  target.push({ code, label: meta.label, severity: meta.severity });
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function normalizeStatusFilter(value: string | null): string | null {
  const normalized = cleanString(value)?.toUpperCase();
  if (!normalized || normalized === 'ALL') return null;
  if (!['DRAFT', 'REVIEW', 'ACTIVE', 'PAUSED', 'ARCHIVED'].includes(normalized)) return null;
  return normalized;
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
