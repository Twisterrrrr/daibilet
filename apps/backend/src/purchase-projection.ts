import { prisma, type Prisma } from '@daibilet/db';

const DEFAULT_LIMIT = 50;
const MAX_ADMIN_LIMIT = 100;
const MAX_BUYER_LIMIT = 50;

type StatusTone = 'draft' | 'ready' | 'live' | 'paused' | 'archived' | 'incomplete' | 'error';

export interface AdminPurchaseRowDto {
  id: string;
  sourceKind: 'internal' | 'external';
  externalOrderId: string;
  publicCode: string | null;
  status: string;
  displayStatus: string;
  statusTone: StatusTone;
  sourceCode: string;
  sourceName: string;
  sourceLabel: string;
  buyer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    notes?: string | null;
  };
  purchasedAt: string | null;
  updatedAt: string | null;
  archivedAt: string | null;
  isArchived: boolean;
  canArchive: boolean;
  ticketCount: number;
  unlinkedTickets: number;
  eventTitle: string | null;
  eventTitles: string[];
  eventDateLabel: string | null;
  amountRub: number | null;
  artifactStatus: 'missing' | 'tickets' | 'not_required' | string;
  refundRequestsCount: number;
  hasPendingRefundRequests: boolean;
  needsAttention: boolean;
  problems: string[];
  tickets: AdminPurchaseTicketDto[];
}

export interface AdminPurchaseTicketDto {
  id: string;
  externalTicketId: string;
  status: string;
  displayStatus: string;
  origin: string;
  eventId: string | null;
  sessionId: string | null;
  eventTitle: string | null;
  eventSlug: string | null;
  startsAt: string | null;
}

export interface AdminPurchasePaymentDto {
  id: string;
  provider: string;
  status: string;
  amountKopecks: number;
  currency: string;
  providerPaymentId: string | null;
  confirmationUrl: string | null;
  paidAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
  error: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminPurchaseFulfillmentDto {
  id: string;
  checkoutItemId: string | null;
  provider: string;
  status: string;
  purchaseFlow: string;
  amountKopecks: number;
  refundedKopecks: number;
  externalOrderId: string | null;
  externalPaymentUrl: string | null;
  ticketNumbers: string[];
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminPurchaseLedgerEntryDto {
  id: string;
  supplierId: string;
  supplierTitle: string | null;
  type: string;
  amountKopecks: number;
  currency: string;
  referenceType: string | null;
  referenceId: string | null;
  checkoutItemId: string | null;
  paymentId: string | null;
  note: string | null;
  createdAt: string | null;
}

export interface AdminPurchaseRefundDto {
  id: string;
  status: string;
  amountKopecks: number;
  currency: string;
  reason: string;
  reasonNote: string | null;
  providerRefundId: string | null;
  adminComment: string | null;
  processedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminPurchaseFiscalReceiptDto {
  id: string;
  type: string;
  status: string;
  amountKopecks: number;
  providerReceiptId: string | null;
  receiptUrl: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string | null;
}

export interface AdminPurchaseDetailDto extends AdminPurchaseRowDto {
  finance: {
    payments: AdminPurchasePaymentDto[];
    fulfillment: AdminPurchaseFulfillmentDto[];
    ledger: AdminPurchaseLedgerEntryDto[];
    refunds: AdminPurchaseRefundDto[];
    fiscalReceipts: AdminPurchaseFiscalReceiptDto[];
    totals: {
      currency: string;
      subtotalKopecks: number;
      discountKopecks: number;
      totalKopecks: number;
      commissionKopecks: number;
      ledgerGrossKopecks: number;
      ledgerCommissionKopecks: number;
      ledgerRefundKopecks: number;
      ledgerPayoutKopecks: number;
      ledgerNetKopecks: number;
    };
    operations: {
      canReconcile: boolean;
      canRefund: boolean;
      canIssueDocuments: boolean;
      canCloseSettlement: boolean;
      blockers: string[];
      nextActions: string[];
    };
  } | null;
}

export interface AdminPurchasesListDto {
  generatedAt: string;
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminPurchaseRowDto[];
  sources: string[];
  statuses: string[];
  quickFilters: Array<{ id: string; count: number }>;
  metrics: {
    imported: number;
    internal: number;
    external: number;
    confirmed: number;
    processing: number;
    canceled: number;
    archived: number;
    tickets: number;
    missingArtifacts: number;
    failedIntegration: number;
    needsAttention: number;
  };
}

export interface BuyerPurchasesListDto {
  generatedAt: string;
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: BuyerPurchaseRowDto[];
  metrics: {
    orders: number;
    tickets: number;
    active: number;
  };
}

export interface PublicCheckoutOrderDto {
  publicCode: string;
  status: string;
  buyer: {
    email: string;
    name: string | null;
    phone: string | null;
  };
  title: string;
  venueTitle: string | null;
  venueAddress: string | null;
  venueSlug: string | null;
  venueLatitude: number | null;
  venueLongitude: number | null;
  admissionProductSlug: string | null;
  validityMode: string | null;
  validTo: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  purchasedAt: string | null;
  ticketNumber: string | null;
  ticketNumbers: string[];
  supplierSupportPhone: string | null;
  items: Array<{
    id: string;
    title: string;
    ticketTitle: string | null;
    quantity: number;
    unitPriceKopecks: number;
    totalKopecks: number;
    ticketNumbers: string[];
  }>;
  totals: {
    currency: string;
    subtotalKopecks: number;
    discountKopecks: number;
    totalKopecks: number;
    commissionKopecks: number;
  };
  payment: {
    provider: string | null;
    status: string | null;
    confirmationUrl: string | null;
    paidAt: string | null;
  };
}

export interface PublicCheckoutPurchasesDto {
  generatedAt: string;
  total: number;
  items: PublicCheckoutOrderDto[];
}

export interface BuyerPurchaseRowDto {
  id: string;
  number: string;
  sourceOrderId: string | null;
  sourceKind: 'internal' | 'external';
  status: string;
  displayStatus: string;
  statusTone: StatusTone;
  isFinal: boolean;
  providerName: string | null;
  buyer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  eventId: string | null;
  eventTitle: string | null;
  eventUrl: string | null;
  purchasedAt: string | null;
  updatedAt: string | null;
  amountRub: number | null;
  ticketCount: number;
  artifactStatus: string;
  message: string | null;
  tickets: Array<{
    id: string;
    number: string | null;
    status: string;
    displayStatus: string;
    eventId: string | null;
    eventTitle: string | null;
    eventUrl: string | null;
    startsAt: string | null;
  }>;
}

const checkoutOrderInclude = {
  items: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      supplier: { select: { id: true, slug: true, title: true } },
      event: { select: { id: true, slug: true, title: true } },
      session: { select: { id: true, startsAt: true } },
      offer: { select: { id: true, title: true } },
      admissionProduct: {
        select: {
          id: true,
          slug: true,
          title: true,
          validityMode: true,
          validTo: true,
          venue: {
            select: {
              id: true,
              slug: true,
              title: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          supplier: {
            select: {
              id: true,
              slug: true,
              title: true,
              phone: true,
            },
          },
        },
      },
      admissionOffer: { select: { id: true, title: true } },
      fulfillmentItem: {
        select: {
          id: true,
          status: true,
          provider: true,
          externalOrderId: true,
          externalPaymentUrl: true,
          providerData: true,
        },
      },
    },
  },
  payments: {
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      provider: true,
      status: true,
      amountKopecks: true,
      currency: true,
      providerPaymentId: true,
      confirmationUrl: true,
      paidAt: true,
      capturedAt: true,
      cancelledAt: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  fulfillmentItems: {
    orderBy: [{ lineItemIndex: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      checkoutItemId: true,
      provider: true,
      status: true,
      purchaseFlow: true,
      externalOrderId: true,
      externalPaymentUrl: true,
      lastError: true,
      providerData: true,
      amountKopecks: true,
      refundedKopecks: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  refundRequests: {
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      status: true,
      amountKopecks: true,
      currency: true,
      reason: true,
      reasonNote: true,
      providerRefundId: true,
      adminComment: true,
      processedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  fiscalReceipts: {
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      type: true,
      status: true,
      amountKopecks: true,
      providerReceiptId: true,
      receiptUrl: true,
      error: true,
      sentAt: true,
      createdAt: true,
    },
  },
  siteUser: { select: { id: true, email: true, name: true, phone: true } },
} satisfies Prisma.CheckoutOrderInclude;

const externalOrderInclude = {
  source: { select: { code: true, name: true } },
  siteUser: { select: { id: true, email: true, name: true, phone: true } },
  tickets: { orderBy: [{ id: 'asc' }] },
} satisfies Prisma.ExternalOrderInclude;

type CheckoutOrderRow = Prisma.CheckoutOrderGetPayload<{ include: typeof checkoutOrderInclude }>;
type CheckoutItemRow = CheckoutOrderRow['items'][number];
type ExternalOrderRow = Prisma.ExternalOrderGetPayload<{ include: typeof externalOrderInclude }>;
type LedgerEntryWithSupplier = Prisma.SupplierLedgerEntryGetPayload<{ include: { supplier: { select: { id: true; title: true } } } }>;

interface EventLookupRow {
  id: string;
  slug: string;
  title: string;
}

interface SessionLookupRow {
  id: string;
  startsAt: Date | null;
  event: EventLookupRow;
}

export async function buildAdminPurchasesListDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<AdminPurchasesListDto> {
  const q = cleanString(searchParams.get('q'))?.toLowerCase() || '';
  const view = cleanString(searchParams.get('view'))?.toLowerCase() || 'all';
  const provider = cleanString(searchParams.get('provider'))?.toUpperCase() || cleanString(searchParams.get('source'))?.toUpperCase() || 'ALL';
  const status = cleanString(searchParams.get('status'))?.toLowerCase() || 'all';
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_ADMIN_LIMIT);
  const page = clampInt(searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
  const includeArchived = view === 'archive';

  const [allRows, archiveCount] = await Promise.all([
    loadAdminPurchaseRows({ includeArchived }),
    prisma.externalOrder.count({ where: { archivedAt: { not: null } } }),
  ]);
  const activeRows = allRows.filter((row) => !row.isArchived);
  const filteredRows = allRows.filter((row) => matchesAdminPurchaseFilters(row, { q, view, provider, status }));
  const total = filteredRows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const rows = filteredRows.slice((safePage - 1) * limit, safePage * limit);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows,
    sources: uniqueSorted(allRows.map((row) => row.sourceCode).filter(Boolean)),
    statuses: uniqueSorted(allRows.map((row) => row.status).filter(Boolean), 'ru'),
    quickFilters: [
      { id: 'all', count: includeArchived ? activeRows.length : allRows.filter((row) => !row.isArchived).length },
      { id: 'attention', count: allRows.filter((row) => row.needsAttention).length },
      { id: 'pending_refunds', count: allRows.filter((row) => row.hasPendingRefundRequests || isRefundStatus(row.status)).length },
      { id: 'missing_artifact', count: allRows.filter((row) => row.artifactStatus === 'missing').length },
      { id: 'failed_integration', count: allRows.filter((row) => isProblemOrderStatus(row.status)).length },
      { id: 'unlinked', count: allRows.filter((row) => row.unlinkedTickets > 0).length },
      { id: 'archivable', count: allRows.filter((row) => row.canArchive).length },
      { id: 'archive', count: archiveCount },
    ],
    metrics: {
      imported: includeArchived ? archiveCount : activeRows.length,
      internal: allRows.filter((row) => row.sourceKind === 'internal').length,
      external: allRows.filter((row) => row.sourceKind === 'external').length,
      confirmed: allRows.filter((row) => isConfirmedOrderStatus(row.status)).length,
      processing: allRows.filter((row) => isProcessingOrderStatus(row.status)).length,
      canceled: allRows.filter((row) => isCanceledOrderStatus(row.status)).length,
      archived: archiveCount,
      tickets: allRows.reduce((sum, row) => sum + (row.ticketCount || 0), 0),
      missingArtifacts: allRows.filter((row) => row.artifactStatus === 'missing').length,
      failedIntegration: allRows.filter((row) => isProblemOrderStatus(row.status)).length,
      needsAttention: allRows.filter((row) => row.needsAttention).length,
    },
  };
}

export async function buildAdminPurchaseDetailDto(orderKeyInput: string): Promise<AdminPurchaseDetailDto | null> {
  const orderKey = cleanString(orderKeyInput);
  if (!orderKey) return null;

  const checkoutRow = await loadCheckoutOrderForAdminDetail(orderKey);
  if (checkoutRow) {
    return mapCheckoutOrderToAdminPurchaseDetail(checkoutRow, await loadCheckoutOrderLedger(checkoutRow.id));
  }

  const externalRow = await prisma.externalOrder.findFirst({
    where: {
      OR: [
        { id: orderKey },
        { externalOrderId: orderKey },
        { publicCode: orderKey },
      ],
    },
    include: externalOrderInclude,
  });
  if (!externalRow) return null;
  const lookup = await loadExternalTicketLookups([externalRow]);
  return {
    ...mapExternalOrderToAdminPurchaseRow(externalRow, lookup),
    finance: null,
  };
}

export interface AdminCreateRefundRequestInput {
  amountKopecks?: number | null | undefined;
  reason?: string | null | undefined;
  reasonNote?: string | null | undefined;
  adminComment?: string | null | undefined;
  fulfillmentItemId?: string | null | undefined;
}

export async function createAdminPurchaseRefundRequest(
  orderKeyInput: string,
  input: AdminCreateRefundRequestInput = {},
): Promise<AdminPurchaseDetailDto> {
  const orderKey = cleanString(orderKeyInput);
  if (!orderKey) throw statusError(400, 'order_key_required');

  const checkoutRow = await loadCheckoutOrderForAdminDetail(orderKey);
  if (!checkoutRow) throw statusError(404, 'checkout_order_not_found');

  const ledgerRows = await loadCheckoutOrderLedger(checkoutRow.id);
  const decision = resolveRefundRequestDecision(checkoutRow, ledgerRows, input);
  if (decision.blockers.length) {
    const error = statusError(409, 'refund_request_blocked');
    (error as Error & { blockers?: string[] }).blockers = decision.blockers;
    throw error;
  }

  await prisma.refundRequest.create({
    data: {
      checkoutOrderId: checkoutRow.id,
      fulfillmentItemId: decision.fulfillmentItemId,
      paymentId: decision.paymentId,
      supplierId: decision.supplierId,
      amountKopecks: decision.amountKopecks,
      currency: checkoutRow.currency,
      reason: decision.reason as never,
      reasonNote: cleanString(input.reasonNote) || null,
      adminComment: cleanString(input.adminComment) || null,
      createdByType: 'ADMIN',
      status: 'CREATED',
    },
  });

  const updated = await loadCheckoutOrderForAdminDetail(checkoutRow.id);
  if (!updated) throw statusError(500, 'checkout_order_reload_failed');
  return mapCheckoutOrderToAdminPurchaseDetail(updated, await loadCheckoutOrderLedger(updated.id));
}

async function loadCheckoutOrderForAdminDetail(orderKey: string): Promise<CheckoutOrderRow | null> {
  const checkoutRow = await prisma.checkoutOrder.findFirst({
    where: {
      OR: [
        { id: orderKey },
        { publicCode: orderKey },
        { externalOrderId: orderKey },
      ],
    },
    include: checkoutOrderInclude,
  });
  return checkoutRow;
}

async function loadCheckoutOrderLedger(checkoutOrderId: string): Promise<LedgerEntryWithSupplier[]> {
  return prisma.supplierLedgerEntry.findMany({
    where: { checkoutOrderId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { supplier: { select: { id: true, title: true } } },
  });
}

export async function buildBuyerPurchasesListDto(input: {
  siteUserId: string;
  email: string;
  searchParams?: URLSearchParams;
}): Promise<BuyerPurchasesListDto> {
  const searchParams = input.searchParams || new URLSearchParams();
  const limit = clampInt(searchParams.get('limit'), 10, 1, MAX_BUYER_LIMIT);
  const page = clampInt(searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
  const allRows = await loadBuyerPurchaseRows(input.siteUserId, input.email);
  const total = allRows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const rows = allRows.slice((safePage - 1) * limit, safePage * limit).map(mapBuyerPurchaseRow);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows,
    metrics: {
      orders: total,
      tickets: rows.reduce((sum, row) => sum + row.ticketCount, 0),
      active: rows.filter((row) => !row.isFinal).length,
    },
  };
}

export async function buildPublicCheckoutOrderByCodeDto(publicCodeInput: string): Promise<PublicCheckoutOrderDto | null> {
  const publicCode = cleanString(publicCodeInput);
  if (!publicCode) return null;
  const row = await prisma.checkoutOrder.findUnique({
    where: { publicCode },
    include: checkoutOrderInclude,
  });
  return row ? mapCheckoutOrderToPublicDto(row) : null;
}

export async function buildPublicCheckoutPurchasesByEmailDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<PublicCheckoutPurchasesDto> {
  const email = normalizeEmail(searchParams.get('email'));
  if (!email) {
    return { generatedAt: new Date().toISOString(), total: 0, items: [] };
  }
  const limit = clampInt(searchParams.get('limit'), 20, 1, MAX_BUYER_LIMIT);
  const rows = await prisma.checkoutOrder.findMany({
    where: { buyerEmail: { equals: email, mode: 'insensitive' } },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: limit,
    include: checkoutOrderInclude,
  });
  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    items: rows.map(mapCheckoutOrderToPublicDto),
  };
}

export async function loadSupplierCheckoutPurchaseRows(
  supplierId: string,
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<{
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  filters: { status: string | null };
  items: ReturnType<typeof mapSupplierCheckoutPurchaseItem>[];
}> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_ADMIN_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const status = normalizeStatusFilter(searchParams.get('status'));
  const where: Prisma.CheckoutItemWhereInput = { supplierId };
  applySupplierCheckoutItemStatusFilter(where, status);

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
    items: rows.slice(0, limit).map(mapSupplierCheckoutPurchaseItem),
  };
}

/**
 * Supplier LC tabs mix CheckoutOrderStatus and CheckoutItemStatus.
 * DTO exposes `status` from the parent order; only RESERVED is item-scoped.
 */
export function applySupplierCheckoutItemStatusFilter(
  where: Prisma.CheckoutItemWhereInput,
  status: string | null,
): void {
  if (!status) return;

  if (status === 'RESERVED') {
    where.status = 'RESERVED';
    return;
  }

  const orderStatuses = new Set([
    'DRAFT',
    'PENDING_PAYMENT',
    'PAID',
    'CONFIRMED',
    'FULFILLED',
    'CANCELLED',
    'REFUNDED',
    'EXPIRED',
    'FAILED',
  ]);
  if (orderStatuses.has(status)) {
    const existing = where.order && typeof where.order === 'object' && !Array.isArray(where.order)
      ? where.order as Prisma.CheckoutOrderWhereInput
      : {};
    where.order = { ...existing, status: status as never };
    return;
  }

  where.status = status as never;
}

async function loadAdminPurchaseRows(options: { includeArchived: boolean }): Promise<AdminPurchaseRowDto[]> {
  const [checkoutRows, externalRows] = await prisma.$transaction([
    prisma.checkoutOrder.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 5000,
      include: checkoutOrderInclude,
    }),
    prisma.externalOrder.findMany({
      where: options.includeArchived ? {} : { archivedAt: null },
      orderBy: [{ purchasedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      take: 5000,
      include: externalOrderInclude,
    }),
  ]);
  const externalLookup = await loadExternalTicketLookups(externalRows);

  return [
    ...checkoutRows.map(mapCheckoutOrderToAdminPurchaseRow),
    ...externalRows.map((row) => mapExternalOrderToAdminPurchaseRow(row, externalLookup)),
  ].sort((a, b) => sortDate(b.purchasedAt || b.updatedAt) - sortDate(a.purchasedAt || a.updatedAt));
}

async function loadBuyerPurchaseRows(siteUserId: string, emailInput: string): Promise<AdminPurchaseRowDto[]> {
  const email = normalizeEmail(emailInput);
  if (!siteUserId && !email) return [];

  const checkoutWhere: Prisma.CheckoutOrderWhereInput = {
    OR: [
      siteUserId ? { siteUserId } : undefined,
      email ? { buyerEmail: { equals: email, mode: 'insensitive' } } : undefined,
    ].filter(Boolean) as Prisma.CheckoutOrderWhereInput[],
  };
  const externalWhere: Prisma.ExternalOrderWhereInput = {
    archivedAt: null,
    OR: [
      siteUserId ? { siteUserId } : undefined,
      email ? { buyerEmailNormalized: email } : undefined,
    ].filter(Boolean) as Prisma.ExternalOrderWhereInput[],
  };

  const [checkoutRows, externalRows] = await prisma.$transaction([
    prisma.checkoutOrder.findMany({
      where: checkoutWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 500,
      include: checkoutOrderInclude,
    }),
    prisma.externalOrder.findMany({
      where: externalWhere,
      orderBy: [{ purchasedAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      take: 500,
      include: externalOrderInclude,
    }),
  ]);
  const externalLookup = await loadExternalTicketLookups(externalRows);

  return [
    ...checkoutRows.map(mapCheckoutOrderToAdminPurchaseRow),
    ...externalRows.map((row) => mapExternalOrderToAdminPurchaseRow(row, externalLookup)),
  ].sort((a, b) => sortDate(b.purchasedAt || b.updatedAt) - sortDate(a.purchasedAt || a.updatedAt));
}

function mapCheckoutOrderToAdminPurchaseRow(row: CheckoutOrderRow): AdminPurchaseRowDto {
  const tickets = row.items.map((item, index) => mapCheckoutItemToTicket(row, item, index));
  const ticketCount = row.items.reduce((sum, item) => sum + Math.max(1, item.quantity || 1), 0);
  const primaryItem = row.items[0] || null;
  const eventTitles = uniqueSorted(row.items.map(checkoutItemTitle).filter(Boolean), 'ru');
  const paymentProblems = row.payments.filter((payment) => isProblemOrderStatus(String(payment.status)) || payment.error);
  const fulfillmentProblems = row.fulfillmentItems.filter((item) => isProblemOrderStatus(String(item.status)) || item.lastError);
  const problemStatus = isProblemOrderStatus(String(row.status)) || paymentProblems.length > 0 || fulfillmentProblems.length > 0;
  const processing = isProcessingOrderStatus(String(row.status));

  return {
    id: row.id,
    sourceKind: 'internal',
    externalOrderId: row.publicCode || shortCode(row.id),
    publicCode: row.publicCode || shortCode(row.id),
    status: String(row.status),
    displayStatus: orderStatusLabel(String(row.status)),
    statusTone: orderStatusTone(String(row.status)),
    sourceCode: 'MANUAL',
    sourceName: 'Дайбилет',
    sourceLabel: 'Дайбилет',
    buyer: {
      name: row.buyerName || row.siteUser?.name || null,
      email: row.buyerEmail || row.siteUser?.email || null,
      phone: row.buyerPhone || row.siteUser?.phone || null,
      notes: null,
    },
    purchasedAt: toIso(row.paidAt || row.confirmedAt || row.createdAt),
    updatedAt: toIso(row.updatedAt),
    archivedAt: null,
    isArchived: false,
    canArchive: false,
    ticketCount,
    unlinkedTickets: 0,
    eventTitle: eventTitles[0] || checkoutItemTitle(primaryItem) || null,
    eventTitles,
    eventDateLabel: toIso(primaryItem?.session?.startsAt),
    amountRub: kopecksToRub(row.totalKopecks),
    artifactStatus: ticketCount > 0 ? 'tickets' : 'not_required',
    refundRequestsCount: row.refundRequests.length,
    hasPendingRefundRequests: row.refundRequests.some((refund) => !['REJECTED', 'FAILED', 'COMPLETED'].includes(String(refund.status))) || isRefundStatus(String(row.status)),
    needsAttention: problemStatus || processing,
    problems: [
      ...(problemStatus ? ['Проверить внутренний checkout'] : []),
      ...(processing ? ['Ожидает завершения оплаты или подтверждения'] : []),
    ],
    tickets,
  };
}

function mapCheckoutOrderToAdminPurchaseDetail(
  row: CheckoutOrderRow,
  ledgerRows: LedgerEntryWithSupplier[],
): AdminPurchaseDetailDto {
  const base = mapCheckoutOrderToAdminPurchaseRow(row);
  const ledger = ledgerRows.map((entry) => ({
    id: entry.id,
    supplierId: entry.supplierId,
    supplierTitle: entry.supplier?.title || null,
    type: String(entry.type),
    amountKopecks: entry.amountKopecks,
    currency: entry.currency,
    referenceType: entry.referenceType || null,
    referenceId: entry.referenceId || null,
    checkoutItemId: entry.checkoutItemId || null,
    paymentId: entry.paymentId || null,
    note: entry.note || null,
    createdAt: toIso(entry.createdAt),
  }));
  const ledgerGrossKopecks = sumLedger(ledger, 'SALE');
  const ledgerCommissionKopecks = Math.abs(sumLedger(ledger, 'COMMISSION'));
  const ledgerRefundKopecks = Math.abs(sumLedger(ledger, 'REFUND'));
  const ledgerPayoutKopecks = Math.abs(sumLedger(ledger, 'PAYOUT'));
  const succeededPayment = row.payments.some((payment) => String(payment.status) === 'SUCCEEDED');
  const hasRefund = row.refundRequests.length > 0 || String(row.status) === 'REFUNDED';
  const hasFailedPayment = row.payments.some((payment) => isProblemOrderStatus(String(payment.status)) || payment.error);
  const fulfillmentPending = row.fulfillmentItems.some((item) => ['PENDING', 'RESERVING', 'RESERVED'].includes(String(item.status)));
  const blockers = [
    ...(!succeededPayment && !['CONFIRMED', 'FULFILLED', 'REFUNDED'].includes(String(row.status)) ? ['payment_not_confirmed'] : []),
    ...(hasFailedPayment ? ['payment_has_error'] : []),
    ...(fulfillmentPending ? ['fulfillment_not_final'] : []),
    ...(ledger.length === 0 && succeededPayment ? ['ledger_missing'] : []),
  ];

  return {
    ...base,
    finance: {
      payments: row.payments.map((payment) => ({
        id: payment.id,
        provider: String(payment.provider),
        status: String(payment.status),
        amountKopecks: payment.amountKopecks,
        currency: payment.currency,
        providerPaymentId: payment.providerPaymentId || null,
        confirmationUrl: payment.confirmationUrl || null,
        paidAt: toIso(payment.paidAt),
        capturedAt: toIso(payment.capturedAt),
        cancelledAt: toIso(payment.cancelledAt),
        error: payment.error || null,
        createdAt: toIso(payment.createdAt),
        updatedAt: toIso(payment.updatedAt),
      })),
      fulfillment: row.fulfillmentItems.map((item) => ({
        id: item.id,
        checkoutItemId: item.checkoutItemId || null,
        provider: item.provider,
        status: String(item.status),
        purchaseFlow: String(item.purchaseFlow),
        amountKopecks: item.amountKopecks,
        refundedKopecks: item.refundedKopecks,
        externalOrderId: item.externalOrderId || null,
        externalPaymentUrl: item.externalPaymentUrl || null,
        ticketNumbers: ticketNumbersFromProviderData(item.providerData),
        lastError: item.lastError || null,
        createdAt: toIso(item.createdAt),
        updatedAt: toIso(item.updatedAt),
      })),
      ledger,
      refunds: row.refundRequests.map((refund) => ({
        id: refund.id,
        status: String(refund.status),
        amountKopecks: refund.amountKopecks,
        currency: refund.currency,
        reason: String(refund.reason),
        reasonNote: refund.reasonNote || null,
        providerRefundId: refund.providerRefundId || null,
        adminComment: refund.adminComment || null,
        processedAt: toIso(refund.processedAt),
        createdAt: toIso(refund.createdAt),
        updatedAt: toIso(refund.updatedAt),
      })),
      fiscalReceipts: row.fiscalReceipts.map((receipt) => ({
        id: receipt.id,
        type: String(receipt.type),
        status: String(receipt.status),
        amountKopecks: receipt.amountKopecks,
        providerReceiptId: receipt.providerReceiptId || null,
        receiptUrl: receipt.receiptUrl || null,
        error: receipt.error || null,
        sentAt: toIso(receipt.sentAt),
        createdAt: toIso(receipt.createdAt),
      })),
      totals: {
        currency: row.currency,
        subtotalKopecks: row.subtotalKopecks,
        discountKopecks: row.discountKopecks,
        totalKopecks: row.totalKopecks,
        commissionKopecks: row.commissionKopecks,
        ledgerGrossKopecks,
        ledgerCommissionKopecks,
        ledgerRefundKopecks,
        ledgerPayoutKopecks,
        ledgerNetKopecks: ledgerGrossKopecks - ledgerCommissionKopecks - ledgerRefundKopecks - ledgerPayoutKopecks,
      },
      operations: {
        canReconcile: ['PENDING_PAYMENT', 'PAID'].includes(String(row.status)) || hasFailedPayment,
        canRefund: succeededPayment && ['CONFIRMED', 'FULFILLED'].includes(String(row.status)) && !hasRefund,
        canIssueDocuments: ledger.length > 0 && !blockers.length,
        canCloseSettlement: ledger.length > 0 && !blockers.length && !hasRefund,
        blockers,
        nextActions: buildInternalOrderNextActions({
          status: String(row.status),
          succeededPayment,
          hasFailedPayment,
          fulfillmentPending,
          ledgerMissing: ledger.length === 0 && succeededPayment,
          hasRefund,
        }),
      },
    },
  };
}

function resolveRefundRequestDecision(
  row: CheckoutOrderRow,
  ledgerRows: LedgerEntryWithSupplier[],
  input: AdminCreateRefundRequestInput,
): {
  blockers: string[];
  amountKopecks: number;
  paymentId: string | null;
  supplierId: string | null;
  fulfillmentItemId: string | null;
  reason: string;
} {
  const succeededPayment = row.payments.find((payment) => String(payment.status) === 'SUCCEEDED');
  const failedPayment = row.payments.find((payment) => isProblemOrderStatus(String(payment.status)) || payment.error);
  const finalFulfillment = row.fulfillmentItems.filter((item) => ['CONFIRMED', 'FULFILLED', 'REFUNDED'].includes(String(item.status)));
  const pendingFulfillment = row.fulfillmentItems.filter((item) => !['CONFIRMED', 'FULFILLED', 'REFUNDED'].includes(String(item.status)));
  const activeRefunds = row.refundRequests.filter((refund) => !['REJECTED', 'FAILED', 'COMPLETED'].includes(String(refund.status)));
  const countedRefunds = row.refundRequests.filter((refund) => !['REJECTED', 'FAILED'].includes(String(refund.status)));
  const supplierIds = uniqueSorted(row.items.map((item) => item.supplierId).filter(Boolean));
  const requestedFulfillmentId = cleanString(input.fulfillmentItemId);
  const requestedFulfillment = requestedFulfillmentId
    ? row.fulfillmentItems.find((item) => item.id === requestedFulfillmentId)
    : null;
  const requestedItem = requestedFulfillment?.checkoutItemId
    ? row.items.find((item) => item.id === requestedFulfillment.checkoutItemId)
    : null;
  const supplierId = requestedItem?.supplierId || (supplierIds.length === 1 ? supplierIds[0] || null : null);
  const paidKopecks = succeededPayment?.amountKopecks || 0;
  const alreadyRequestedKopecks = countedRefunds.reduce((sum, refund) => sum + refund.amountKopecks, 0);
  const maxRefundableKopecks = Math.max(0, paidKopecks - alreadyRequestedKopecks);
  const amountKopecks = Math.min(input.amountKopecks || maxRefundableKopecks, maxRefundableKopecks);
  const reason = normalizeRefundReason(input.reason);
  const blockers = [
    ...(!succeededPayment ? ['payment_not_confirmed'] : []),
    ...(failedPayment ? ['payment_has_error'] : []),
    ...(!['CONFIRMED', 'FULFILLED'].includes(String(row.status)) ? ['order_not_refundable_status'] : []),
    ...(row.fulfillmentItems.length === 0 ? ['fulfillment_missing'] : []),
    ...(pendingFulfillment.length > 0 ? ['fulfillment_not_final'] : []),
    ...(finalFulfillment.length === 0 && row.fulfillmentItems.length > 0 ? ['fulfillment_not_final'] : []),
    ...(ledgerRows.length === 0 ? ['ledger_missing'] : []),
    ...(sumLedger(ledgerRows, 'SALE') <= 0 ? ['ledger_sale_missing'] : []),
    ...(supplierIds.length !== 1 && !requestedFulfillment ? ['multi_supplier_refund_requires_item'] : []),
    ...(requestedFulfillmentId && !requestedFulfillment ? ['fulfillment_item_not_found'] : []),
    ...(activeRefunds.length > 0 ? ['refund_already_open'] : []),
    ...(maxRefundableKopecks <= 0 ? ['refund_amount_exhausted'] : []),
    ...(input.amountKopecks !== undefined && input.amountKopecks !== null && input.amountKopecks > maxRefundableKopecks ? ['refund_amount_too_high'] : []),
    ...(amountKopecks <= 0 ? ['refund_amount_required'] : []),
  ];

  return {
    blockers: uniqueSorted(blockers),
    amountKopecks,
    paymentId: succeededPayment?.id || null,
    supplierId,
    fulfillmentItemId: requestedFulfillment?.id || null,
    reason,
  };
}

function mapCheckoutItemToTicket(row: CheckoutOrderRow, item: CheckoutItemRow, index: number): AdminPurchaseTicketDto {
  const fulfillmentNumbers = item.fulfillmentItem ? ticketNumbersFromProviderData(item.fulfillmentItem.providerData) : [];
  const number = fulfillmentNumbers.join(', ') || `${row.publicCode || shortCode(row.id)}-${index + 1}`;
  const status = item.fulfillmentItem?.status ? String(item.fulfillmentItem.status) : String(item.status);
  return {
    id: item.id,
    externalTicketId: number,
    status,
    displayStatus: orderStatusLabel(status),
    origin: 'daibilet',
    eventId: item.event?.id || null,
    sessionId: item.session?.id || null,
    eventTitle: checkoutItemTitle(item),
    eventSlug: item.event?.slug || item.admissionProduct?.slug || null,
    startsAt: toIso(item.session?.startsAt),
  };
}

function mapExternalOrderToAdminPurchaseRow(
  row: ExternalOrderRow,
  lookup: { events: Map<string, EventLookupRow>; sessions: Map<string, SessionLookupRow> },
): AdminPurchaseRowDto {
  const buyer = normalizeBuyerSnapshot(row.buyerSnapshot);
  const tickets = row.tickets.map((ticket) => {
    const session = ticket.sessionId ? lookup.sessions.get(ticket.sessionId) : null;
    const event = ticket.eventId ? lookup.events.get(ticket.eventId) || session?.event || null : session?.event || null;
    const effectiveStatus = resolveTicketStatusForDisplay(ticket.status, row.status);
    return {
      id: ticket.id,
      externalTicketId: ticket.externalTicketId || ticket.id,
      status: ticket.status || 'unknown',
      displayStatus: orderStatusLabel(effectiveStatus),
      origin: ticket.origin || 'source',
      eventId: ticket.eventId || event?.id || null,
      sessionId: ticket.sessionId || null,
      eventTitle: event?.title || null,
      eventSlug: event?.slug || null,
      startsAt: toIso(session?.startsAt),
    };
  });
  const ticketCount = tickets.length;
  const shouldExpectTicket = shouldExpectOrderTicket(row.status);
  const unlinkedTickets = shouldExpectTicket ? tickets.filter((ticket) => !ticket.eventId || !ticket.eventTitle).length : 0;
  const problemStatus = isProblemOrderStatus(row.status);
  const missingArtifact = shouldExpectTicket && ticketCount === 0;
  const sourceCode = String(row.source.code || 'MANUAL');
  const eventTitles = uniqueSorted(tickets.map((ticket) => ticket.eventTitle).filter(Boolean), 'ru');

  return {
    id: row.id,
    sourceKind: 'external',
    externalOrderId: row.externalOrderId,
    publicCode: row.publicCode || null,
    status: row.status || 'unknown',
    displayStatus: orderStatusLabel(row.status),
    statusTone: orderStatusTone(row.status),
    sourceCode,
    sourceName: row.source.name || sourceCode,
    sourceLabel: sourceLabel(sourceCode),
    buyer: {
      name: buyer.name || row.siteUser?.name || null,
      email: buyer.email || row.siteUser?.email || null,
      phone: buyer.phone || row.siteUser?.phone || null,
      notes: buyer.notes || null,
    },
    purchasedAt: toIso(row.purchasedAt),
    updatedAt: toIso(row.updatedAt),
    archivedAt: toIso(row.archivedAt),
    isArchived: Boolean(row.archivedAt),
    canArchive: !row.archivedAt && isArchivableOrderStatus(row.status),
    ticketCount,
    unlinkedTickets,
    eventTitle: eventTitles[0] || null,
    eventTitles,
    eventDateLabel: tickets.find((ticket) => ticket.startsAt)?.startsAt || null,
    amountRub: extractOrderAmountRub(row.buyerSnapshot),
    artifactStatus: missingArtifact ? 'missing' : ticketCount > 0 ? 'tickets' : 'not_required',
    refundRequestsCount: 0,
    hasPendingRefundRequests: isRefundStatus(row.status),
    needsAttention: problemStatus || missingArtifact || unlinkedTickets > 0,
    problems: [
      ...(problemStatus ? ['Проверить статус у источника'] : []),
      ...(missingArtifact ? ['Нет билетов в зеркале'] : []),
      ...(unlinkedTickets > 0 ? ['Есть билеты без связи с событием'] : []),
    ],
    tickets,
  };
}

function mapBuyerPurchaseRow(row: AdminPurchaseRowDto): BuyerPurchaseRowDto {
  const primaryTicket = row.tickets.find((ticket) => ticket.eventTitle || ticket.eventId) || row.tickets[0] || null;
  const eventUrl = primaryTicket?.eventSlug
    ? `/events/${encodeURIComponent(primaryTicket.eventSlug)}`
    : primaryTicket?.eventId
      ? `/events/${encodeURIComponent(primaryTicket.eventId)}`
      : null;

  return {
    id: row.id,
    number: row.publicCode || row.externalOrderId || shortCode(row.id),
    sourceOrderId: row.sourceKind === 'external' ? row.externalOrderId : null,
    sourceKind: row.sourceKind,
    status: row.status,
    displayStatus: row.displayStatus,
    statusTone: row.statusTone,
    isFinal: isCanceledOrderStatus(row.status) || isConfirmedOrderStatus(row.status),
    providerName: row.sourceLabel,
    buyer: {
      name: row.buyer.name || null,
      email: maskEmail(row.buyer.email),
      phone: maskPhone(row.buyer.phone),
    },
    eventId: primaryTicket?.eventId || null,
    eventTitle: row.eventTitle,
    eventUrl,
    purchasedAt: row.purchasedAt,
    updatedAt: row.updatedAt,
    amountRub: row.amountRub,
    ticketCount: row.ticketCount,
    artifactStatus: row.artifactStatus,
    message: buyerPurchaseMessage(row),
    tickets: row.tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.externalTicketId,
      status: ticket.status,
      displayStatus: ticket.displayStatus,
      eventId: ticket.eventId,
      eventTitle: ticket.eventTitle,
      eventUrl: ticket.eventSlug ? `/events/${encodeURIComponent(ticket.eventSlug)}` : ticket.eventId ? `/events/${encodeURIComponent(ticket.eventId)}` : null,
      startsAt: ticket.startsAt,
    })),
  };
}

function mapCheckoutOrderToPublicDto(row: CheckoutOrderRow): PublicCheckoutOrderDto {
  const primaryItem = row.items[0] || null;
  const primaryAdmission = primaryItem?.admissionProduct || null;
  const primaryVenue = primaryAdmission?.venue || null;
  const supplierSupportPhone = primaryAdmission?.supplier?.phone || null;
  const payment = row.payments[0] || null;
  const fulfillmentNumbers = row.fulfillmentItems.flatMap((item) => ticketNumbersFromProviderData(item.providerData));
  const itemNumbers = new Map<string, string[]>();
  for (const item of row.items) {
    if (!item.fulfillmentItem) continue;
    itemNumbers.set(item.id, ticketNumbersFromProviderData(item.fulfillmentItem.providerData));
  }
  const title = checkoutItemTitle(primaryItem) || primaryAdmission?.title || 'Входной билет';

  return {
    publicCode: row.publicCode || shortCode(row.id),
    status: String(row.status),
    buyer: {
      email: row.buyerEmail || row.siteUser?.email || '',
      name: row.buyerName || row.siteUser?.name || null,
      phone: row.buyerPhone || row.siteUser?.phone || null,
    },
    title,
    venueTitle: primaryVenue?.title || null,
    venueAddress: primaryVenue?.address || null,
    venueSlug: primaryVenue?.slug || null,
    venueLatitude: primaryVenue?.latitude ?? null,
    venueLongitude: primaryVenue?.longitude ?? null,
    admissionProductSlug: primaryAdmission?.slug || null,
    validityMode: primaryAdmission ? String(primaryAdmission.validityMode) : null,
    validTo: toIso(primaryAdmission?.validTo),
    paidAt: toIso(row.paidAt),
    confirmedAt: toIso(row.confirmedAt),
    purchasedAt: toIso(row.paidAt || row.confirmedAt || row.createdAt),
    ticketNumber: fulfillmentNumbers[0] || null,
    ticketNumbers: fulfillmentNumbers,
    supplierSupportPhone,
    items: row.items.map((item) => ({
      id: item.id,
      title: item.title,
      ticketTitle: item.ticketTitle || item.offer?.title || item.admissionOffer?.title || null,
      quantity: item.quantity,
      unitPriceKopecks: item.unitPriceKopecks,
      totalKopecks: item.totalKopecks,
      ticketNumbers: itemNumbers.get(item.id) || [],
    })),
    totals: {
      currency: row.currency,
      subtotalKopecks: row.subtotalKopecks,
      discountKopecks: row.discountKopecks,
      totalKopecks: row.totalKopecks,
      commissionKopecks: row.commissionKopecks,
    },
    payment: {
      provider: payment ? String(payment.provider) : null,
      status: payment ? String(payment.status) : null,
      confirmationUrl: payment?.confirmationUrl || null,
      paidAt: toIso(payment?.paidAt),
    },
  };
}

function mapSupplierCheckoutPurchaseItem(row: Prisma.CheckoutItemGetPayload<{
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
}>) {
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

async function loadExternalTicketLookups(externalRows: ExternalOrderRow[]): Promise<{
  events: Map<string, EventLookupRow>;
  sessions: Map<string, SessionLookupRow>;
}> {
  const eventIds = uniqueSorted(externalRows.flatMap((row) => row.tickets.map((ticket) => ticket.eventId).filter(Boolean)));
  const sessionIds = uniqueSorted(externalRows.flatMap((row) => row.tickets.map((ticket) => ticket.sessionId).filter(Boolean)));
  const events = eventIds.length
    ? await prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, slug: true, title: true },
      })
    : [];
  const sessions = sessionIds.length
    ? await prisma.eventSession.findMany({
        where: { id: { in: sessionIds } },
        select: {
          id: true,
          startsAt: true,
          event: { select: { id: true, slug: true, title: true } },
        },
      })
    : [];
  return {
    events: new Map(events.map((event) => [event.id, event])),
    sessions: new Map(sessions.map((session) => [session.id, session])),
  };
}

function matchesAdminPurchaseFilters(
  row: AdminPurchaseRowDto,
  filters: { q: string; view: string; provider: string; status: string },
): boolean {
  if (filters.view === 'archive' && !row.isArchived) return false;
  if (filters.view !== 'archive' && row.isArchived) return false;
  if (filters.view === 'attention' && !row.needsAttention) return false;
  if (filters.view === 'missing_artifact' && row.artifactStatus !== 'missing') return false;
  if (filters.view === 'failed_integration' && !isProblemOrderStatus(row.status)) return false;
  if (filters.view === 'unlinked' && !(row.unlinkedTickets > 0)) return false;
  if (filters.view === 'pending_refunds' && !row.hasPendingRefundRequests && !isRefundStatus(row.status)) return false;
  if (filters.view === 'archivable' && !row.canArchive) return false;
  if (filters.provider !== 'ALL' && row.sourceCode !== filters.provider) return false;
  if (filters.status !== 'all' && String(row.status || '').toLowerCase() !== filters.status) return false;
  if (!filters.q) return true;
  const haystack = [
    row.id,
    row.publicCode,
    row.externalOrderId,
    row.status,
    row.sourceCode,
    row.sourceLabel,
    row.buyer.name,
    row.buyer.email,
    row.buyer.phone,
    row.eventTitle,
    ...row.eventTitles,
    ...row.tickets.flatMap((ticket) => [ticket.externalTicketId, ticket.eventTitle]),
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(filters.q);
}

function checkoutItemTitle(item: CheckoutItemRow | null): string | null {
  if (!item) return null;
  return item.event?.title || item.admissionProduct?.title || item.title || null;
}

function buyerPurchaseMessage(row: AdminPurchaseRowDto): string {
  if (row.sourceKind === 'internal') {
    if (isConfirmedOrderStatus(row.status)) return 'Покупка подтверждена в Дайбилет.';
    if (isProcessingOrderStatus(row.status)) return 'Платеж или подтверждение еще обрабатывается.';
    if (isCanceledOrderStatus(row.status)) return 'Покупка отменена или истекла.';
    return 'Статус покупки обновляется в Дайбилет.';
  }
  if (isConfirmedOrderStatus(row.status)) return 'Заказ подтвержден в билетной системе.';
  if (isCanceledOrderStatus(row.status)) return 'Заказ завершен или отменен в билетной системе.';
  if (row.artifactStatus === 'missing') return 'Билеты еще не попали в зеркало. Статус можно уточнить по номеру заказа.';
  if (isProcessingOrderStatus(row.status)) return 'Заказ обрабатывается в билетной системе.';
  return 'Статус получен из билетной системы.';
}

function resolveTicketStatusForDisplay(ticketStatus: string | null, orderStatus: string | null): string {
  const ticket = String(ticketStatus || '').toLowerCase();
  if (
    isConfirmedOrderStatus(orderStatus) &&
    ['reserved', 'hold', 'pending', 'open', 'new', 'created', 'processing'].some((token) => ticket.includes(token))
  ) {
    return 'issued';
  }
  return ticketStatus || 'unknown';
}

function normalizeBuyerSnapshot(snapshot: Prisma.JsonValue): {
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
} {
  const payload = isRecord(snapshot) ? snapshot : {};
  const customer = isRecord(payload.customer) ? payload.customer : {};
  const buyer = isRecord(payload.buyer) ? payload.buyer : {};
  const sourcePayload = isRecord(payload.sourcePayload) ? payload.sourcePayload : {};
  const settings = isRecord(payload.settings) ? payload.settings : {};
  const sourceSettings = isRecord(sourcePayload.settings) ? sourcePayload.settings : {};
  const settingsCustomer = isRecord(settings.customer) ? settings.customer : isRecord(sourceSettings.customer) ? sourceSettings.customer : {};
  const rawPhone = firstString(
    payload.phone,
    payload.customerPhone,
    buyer.phone,
    customer.phone,
    settingsCustomer.phone,
    settingsCustomer.phone_number,
  );

  return {
    name: firstString(payload.name, payload.fullName, payload.customerName, buyer.name, customer.name, customer.fullName, settingsCustomer.name, settingsCustomer.full_name),
    email: firstString(payload.email, payload.customerEmail, buyer.email, customer.email, settingsCustomer.email),
    phone: looksLikeDateTime(rawPhone) ? null : rawPhone,
    notes: firstString(payload.notes, payload.comment, buyer.notes, payload.code, payload.number, payload.source, payload.rawStatus),
  };
}

function extractOrderAmountRub(snapshot: Prisma.JsonValue): number | null {
  const payload = isRecord(snapshot) ? snapshot : {};
  const values = isRecord(payload.values) ? payload.values : {};
  const raw = firstNumber(payload.amountRub, payload.amount, payload.full, payload.total, values.full, values.amount, values.total);
  if (raw == null) return null;
  return Math.round(raw > 100000 ? raw / 100 : raw);
}

function orderStatusTone(status: string | null): StatusTone {
  if (isConfirmedOrderStatus(status)) return 'live';
  if (isCanceledOrderStatus(status)) return 'archived';
  if (isProblemOrderStatus(status)) return 'error';
  if (isProcessingOrderStatus(status)) return 'ready';
  return 'incomplete';
}

function orderStatusLabel(status: string | null): string {
  const value = String(status || '').toLowerCase();
  if (isRefundStatus(value)) return 'возвращен';
  if (isConfirmedOrderStatus(value)) return 'подтвержден';
  if (isCanceledOrderStatus(value)) return 'отменен';
  if (['issued', 'ticketed', 'generated', 'delivered', 'fulfilled'].some((token) => value.includes(token))) return 'выпущен';
  if (['used', 'visited', 'redeemed', 'checked'].some((token) => value.includes(token))) return 'использован';
  if (isProcessingOrderStatus(value)) return 'в обработке';
  return status || 'неизвестно';
}

function shouldExpectOrderTicket(status: string | null): boolean {
  const value = String(status || '').toLowerCase();
  if (!value || isCanceledOrderStatus(value) || isRefundStatus(value)) return false;
  return isConfirmedOrderStatus(value) || ['issued', 'ticketed', 'generated', 'delivered', 'voucher'].some((token) => value.includes(token));
}

function isConfirmedOrderStatus(status: string | null): boolean {
  const value = String(status || '').toLowerCase();
  return ['done', 'paid', 'confirmed', 'completed', 'success', 'executed', 'sold', 'fulfilled', 'succeeded'].some((token) => value.includes(token));
}

function isProcessingOrderStatus(status: string | null): boolean {
  const value = String(status || '').toLowerCase();
  return ['open', 'new', 'created', 'pending', 'processing', 'reserved', 'hold', 'draft', 'waiting'].some((token) => value.includes(token));
}

function isCanceledOrderStatus(status: string | null): boolean {
  const value = String(status || '').toLowerCase();
  return ['cancel', 'return', 'refund', 'reject', 'expired', 'deleted'].some((token) => value.includes(token));
}

function isRefundStatus(status: string | null): boolean {
  const value = String(status || '').toLowerCase();
  return ['refund', 'return'].some((token) => value.includes(token));
}

function isArchivableOrderStatus(status: string | null): boolean {
  const value = String(status || '').toLowerCase();
  return isCanceledOrderStatus(value) || isRefundStatus(value) || value.includes('deleted');
}

function isProblemOrderStatus(status: string | null): boolean {
  const value = String(status || '').toLowerCase();
  return ['fail', 'error', 'reject'].some((token) => value.includes(token));
}

function sourceLabel(sourceCode: string): string {
  if (sourceCode === 'TEPLOHOD') return 'Teplohod.info';
  if (sourceCode === 'TICKETSCLOUD') return 'Ticketscloud';
  if (sourceCode === 'MANUAL') return 'Дайбилет';
  return sourceCode || 'Источник';
}

function normalizeStatusFilter(value: string | null): string | null {
  const normalized = cleanString(value)?.toUpperCase();
  if (!normalized || normalized === 'ALL') return null;
  return normalized;
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function normalizeEmail(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function ticketNumbersFromProviderData(value: Prisma.JsonValue | null | undefined): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const payload = value as Record<string, unknown>;
  const rawList = Array.isArray(payload.ticketNumbers) ? payload.ticketNumbers : [];
  const list = rawList.map((item) => cleanString(String(item || ''))).filter((item): item is string => Boolean(item));
  const single = cleanString(typeof payload.ticketNumber === 'string' ? payload.ticketNumber : null);
  return list.length ? list : single ? [single] : [];
}

function sumLedger(entries: Array<{ type: string; amountKopecks: number }>, type: string): number {
  return entries
    .filter((entry) => String(entry.type) === type)
    .reduce((sum, entry) => sum + entry.amountKopecks, 0);
}

function normalizeRefundReason(value: string | null | undefined): string {
  const normalized = String(value || '').toUpperCase();
  if (['USER_REQUEST', 'EVENT_CANCELLED', 'SUPPORT', 'OTHER'].includes(normalized)) return normalized;
  return 'OTHER';
}

function statusError(statusCode: number, message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function buildInternalOrderNextActions(input: {
  status: string;
  succeededPayment: boolean;
  hasFailedPayment: boolean;
  fulfillmentPending: boolean;
  ledgerMissing: boolean;
  hasRefund: boolean;
}): string[] {
  if (input.hasFailedPayment) return ['Проверить ошибку платежа и запустить сверку YooKassa'];
  if (input.status === 'PENDING_PAYMENT') return ['Ждать webhook YooKassa или reconcile timer'];
  if (input.status === 'PAID') return ['Проверить fulfillment и выпуск билетов'];
  if (input.fulfillmentPending) return ['Проверить выпуск билетов'];
  if (input.ledgerMissing) return ['Проверить ledger entries по успешной оплате'];
  if (input.hasRefund) return ['Проверить возврат и отражение в ledger'];
  if (input.succeededPayment && ['CONFIRMED', 'FULFILLED'].includes(input.status)) {
    return ['Готово к включению в сверку и расчет с поставщиком'];
  }
  return ['Контроль статуса заказа'];
}

function maskEmail(value: string | null | undefined): string | null {
  const email = String(value || '').trim();
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  if (!name || !domain) return null;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function maskPhone(value: string | null | undefined): string | null {
  const digits = digitsOnly(value);
  if (digits.length < 6) return null;
  return `+${digits.slice(0, 1)} ${'*'.repeat(Math.max(3, digits.length - 5))} ${digits.slice(-4)}`;
}

function digitsOnly(value: string | null | undefined): string {
  return String(value || '').replace(/\D+/g, '');
}

function looksLikeDateTime(value: string | null): boolean {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/.test(text);
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function kopecksToRub(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value / 100);
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

function sortDate(value: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function uniqueSorted(values: Array<string | null | undefined>, locale?: string): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, locale));
}
