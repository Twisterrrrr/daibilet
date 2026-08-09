import { prisma, type Prisma } from '@daibilet/db';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

export interface AdminFinanceLedgerDto {
  generatedAt: string;
  filters: {
    supplier: string | null;
    from: string | null;
    to: string | null;
  };
  metrics: {
    saleKopecks: number;
    commissionKopecks: number;
    refundKopecks: number;
    payoutKopecks: number;
    adjustmentKopecks: number;
    netKopecks: number;
    openRefundRequests: number;
    failedReceipts: number;
    draftReports: number;
    openSettlements: number;
    pendingDocuments: number;
  };
  suppliers: Array<{ id: string; slug: string; title: string }>;
  ledger: Array<{
    id: string;
    supplierId: string;
    supplierTitle: string;
    type: string;
    amountKopecks: number;
    currency: string;
    referenceType: string | null;
    referenceId: string | null;
    checkoutOrderId: string | null;
    checkoutItemId: string | null;
    paymentId: string | null;
    note: string | null;
    createdAt: string;
  }>;
  refunds: Array<{
    id: string;
    status: string;
    supplierId: string | null;
    supplierTitle: string | null;
    orderPublicCode: string | null;
    amountKopecks: number;
    currency: string;
    reason: string;
    reasonNote: string | null;
    adminComment: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  reports: Array<{
    id: string;
    supplierId: string;
    supplierTitle: string;
    periodStart: string;
    periodEnd: string;
    basis: string;
    status: string;
    hasConflict: boolean;
    grossKopecks: number;
    commissionKopecks: number;
    refundKopecks: number;
    netKopecks: number;
    createdAt: string;
  }>;
  settlements: Array<{
    id: string;
    supplierId: string;
    supplierTitle: string;
    periodStart: string;
    periodEnd: string;
    status: string;
    grossKopecks: number;
    commissionKopecks: number;
    adjustmentKopecks: number;
    netKopecks: number;
    paidAt: string | null;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    supplierId: string;
    supplierTitle: string;
    type: string;
    status: string;
    title: string;
    reportId: string | null;
    settlementId: string | null;
    filesCount: number;
    createdAt: string;
  }>;
  reconcile: {
    readyToDraftReport: boolean;
    blockers: string[];
    nextActions: string[];
  };
}

export async function buildAdminFinanceLedgerDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<AdminFinanceLedgerDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const supplierKey = cleanString(searchParams.get('supplier'));
  const from = parseDate(searchParams.get('from'));
  const to = parseDate(searchParams.get('to'));

  const suppliers = await prisma.supplier.findMany({
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
    take: 500,
    select: { id: true, slug: true, title: true },
  });
  const supplier = supplierKey
    ? suppliers.find((item) => item.id === supplierKey || item.slug === supplierKey || item.title.toLowerCase() === supplierKey.toLowerCase())
    : null;
  const supplierId = supplier?.id || null;
  const createdAt: Prisma.DateTimeFilter = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };
  const hasDateFilter = Boolean(from || to);
  const ledgerWhere: Prisma.SupplierLedgerEntryWhereInput = {
    ...(supplierId ? { supplierId } : {}),
    ...(hasDateFilter ? { createdAt } : {}),
  };
  const refundWhere: Prisma.RefundRequestWhereInput = {
    status: { in: ['CREATED', 'APPROVED', 'PROCESSING'] },
    ...(supplierId ? { supplierId } : {}),
    ...(hasDateFilter ? { createdAt } : {}),
  };
  const reportWhere: Prisma.SupplierReportWhereInput = {
    ...(supplierId ? { supplierId } : {}),
  };
  if (from) reportWhere.periodStart = { gte: from };
  if (to) reportWhere.periodEnd = { lte: to };
  const settlementWhere: Prisma.SupplierSettlementWhereInput = {
    ...(supplierId ? { supplierId } : {}),
  };
  if (from) settlementWhere.periodStart = { gte: from };
  if (to) settlementWhere.periodEnd = { lte: to };
  const documentWhere: Prisma.SupplierDocumentWhereInput = {
    ...(supplierId ? { supplierId } : {}),
    ...(hasDateFilter ? { createdAt } : {}),
  };

  const [ledger, ledgerGroups, refunds, failedReceipts, reports, settlements, documents] = await prisma.$transaction([
    prisma.supplierLedgerEntry.findMany({
      where: ledgerWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit,
      include: { supplier: { select: { id: true, title: true } } },
    }),
    prisma.supplierLedgerEntry.groupBy({
      by: ['type'],
      where: ledgerWhere,
      _sum: { amountKopecks: true },
    }),
    prisma.refundRequest.findMany({
      where: refundWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 50,
      include: {
        supplier: { select: { id: true, title: true } },
        checkoutOrder: { select: { id: true, publicCode: true } },
      },
    }),
    prisma.fiscalReceipt.count({
      where: {
        status: 'FAILED',
        ...(supplierId ? { supplierId } : {}),
        ...(hasDateFilter ? { createdAt } : {}),
      },
    }),
    prisma.supplierReport.findMany({
      where: reportWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 30,
      include: { supplier: { select: { id: true, title: true } } },
    }),
    prisma.supplierSettlement.findMany({
      where: settlementWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 30,
      include: { supplier: { select: { id: true, title: true } } },
    }),
    prisma.supplierDocument.findMany({
      where: documentWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 30,
      include: {
        supplier: { select: { id: true, title: true } },
        files: { select: { id: true } },
      },
    }),
  ]);

  const metrics = summarizeLedgerGroups(ledgerGroups);
  const openSettlements = settlements.filter((item) => !['PAID', 'CANCELLED'].includes(String(item.status))).length;
  const pendingDocuments = documents.filter((item) => !['SIGNED', 'CANCELLED'].includes(String(item.status))).length;
  const draftReports = reports.filter((item) => String(item.status) === 'DRAFT').length;
  const blockers = [
    ...(refunds.length ? ['open_refund_requests'] : []),
    ...(failedReceipts ? ['failed_fiscal_receipts'] : []),
    ...(metrics.saleKopecks <= 0 ? ['no_sales_ledger'] : []),
  ];

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      supplier: supplierId,
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
    },
    metrics: {
      ...metrics,
      openRefundRequests: refunds.length,
      failedReceipts,
      draftReports,
      openSettlements,
      pendingDocuments,
    },
    suppliers,
    ledger: ledger.map((entry) => ({
      id: entry.id,
      supplierId: entry.supplierId,
      supplierTitle: entry.supplier.title,
      type: String(entry.type),
      amountKopecks: entry.amountKopecks,
      currency: entry.currency,
      referenceType: entry.referenceType || null,
      referenceId: entry.referenceId || null,
      checkoutOrderId: entry.checkoutOrderId || null,
      checkoutItemId: entry.checkoutItemId || null,
      paymentId: entry.paymentId || null,
      note: entry.note || null,
      createdAt: entry.createdAt.toISOString(),
    })),
    refunds: refunds.map((refund) => ({
      id: refund.id,
      status: String(refund.status),
      supplierId: refund.supplierId || null,
      supplierTitle: refund.supplier?.title || null,
      orderPublicCode: refund.checkoutOrder?.publicCode || refund.checkoutOrder?.id || null,
      amountKopecks: refund.amountKopecks,
      currency: refund.currency,
      reason: String(refund.reason),
      reasonNote: refund.reasonNote || null,
      adminComment: refund.adminComment || null,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
    })),
    reports: reports.map((report) => ({
      id: report.id,
      supplierId: report.supplierId,
      supplierTitle: report.supplier.title,
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      basis: String(report.basis),
      status: String(report.status),
      hasConflict: report.hasConflict,
      grossKopecks: report.grossKopecks,
      commissionKopecks: report.commissionKopecks,
      refundKopecks: report.refundKopecks,
      netKopecks: report.netKopecks,
      createdAt: report.createdAt.toISOString(),
    })),
    settlements: settlements.map((settlement) => ({
      id: settlement.id,
      supplierId: settlement.supplierId,
      supplierTitle: settlement.supplier.title,
      periodStart: settlement.periodStart.toISOString(),
      periodEnd: settlement.periodEnd.toISOString(),
      status: String(settlement.status),
      grossKopecks: settlement.grossKopecks,
      commissionKopecks: settlement.commissionKopecks,
      adjustmentKopecks: settlement.adjustmentKopecks,
      netKopecks: settlement.netKopecks,
      paidAt: settlement.paidAt ? settlement.paidAt.toISOString() : null,
      createdAt: settlement.createdAt.toISOString(),
    })),
    documents: documents.map((document) => ({
      id: document.id,
      supplierId: document.supplierId,
      supplierTitle: document.supplier.title,
      type: String(document.type),
      status: String(document.status),
      title: document.title,
      reportId: document.reportId || null,
      settlementId: document.settlementId || null,
      filesCount: document.files.length,
      createdAt: document.createdAt.toISOString(),
    })),
    reconcile: {
      readyToDraftReport: blockers.length === 0,
      blockers,
      nextActions: buildReconcileNextActions(blockers),
    },
  };
}

function summarizeLedgerGroups(groups: Array<{ type: string; _sum: { amountKopecks: number | null } }>) {
  const byType = new Map(groups.map((group) => [String(group.type), group._sum.amountKopecks || 0]));
  const saleKopecks = byType.get('SALE') || 0;
  const commissionKopecks = Math.abs(byType.get('COMMISSION') || 0);
  const refundKopecks = Math.abs(byType.get('REFUND') || 0);
  const payoutKopecks = Math.abs(byType.get('PAYOUT') || 0);
  const adjustmentKopecks = (byType.get('ADJUSTMENT') || 0) + (byType.get('CHARGEBACK_ADJUSTMENT') || 0) + (byType.get('FEE_RECHARGE') || 0);
  return {
    saleKopecks,
    commissionKopecks,
    refundKopecks,
    payoutKopecks,
    adjustmentKopecks,
    netKopecks: saleKopecks - commissionKopecks - refundKopecks - payoutKopecks + adjustmentKopecks,
  };
}

function buildReconcileNextActions(blockers: string[]): string[] {
  if (blockers.includes('open_refund_requests')) return ['Разобрать открытые заявки на возврат'];
  if (blockers.includes('failed_fiscal_receipts')) return ['Проверить ошибки чеков перед закрытием периода'];
  if (blockers.includes('no_sales_ledger')) return ['Дождаться продаж или выбрать другой период'];
  return ['Можно готовить черновик отчета агента и сверку с поставщиком'];
}

function parseDate(value: string | null): Date | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanString(value: string | null | undefined): string | null {
  const cleaned = String(value || '').trim();
  return cleaned ? cleaned : null;
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}
