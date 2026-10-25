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

export interface AdminFinanceClosePeriodInput {
  supplierId: string;
  periodStart: string;
  periodEnd: string;
  basis?: string | undefined;
  issueDocuments?: boolean | undefined;
}

export interface AdminFinanceClosePeriodDto {
  generatedAt: string;
  report: AdminFinanceLedgerDto['reports'][number];
  settlement: AdminFinanceLedgerDto['settlements'][number];
  documents: AdminFinanceLedgerDto['documents'];
  metrics: AdminFinanceLedgerDto['metrics'];
  actions: string[];
}

export async function buildAdminFinanceLedgerDto(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<AdminFinanceLedgerDto> {
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const supplierKey = cleanString(searchParams.get('supplier'));
  const from = parseDateStart(searchParams.get('from'));
  const to = parseDateEnd(searchParams.get('to'));

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

export async function closeAdminFinancePeriod(input: AdminFinanceClosePeriodInput): Promise<AdminFinanceClosePeriodDto> {
  const supplierId = cleanString(input.supplierId);
  const periodStart = parseRequiredDate(input.periodStart, 'period_start_required');
  const periodEnd = parseRequiredDate(input.periodEnd, 'period_end_required');
  const basis = normalizeReportBasis(input.basis);
  const issueDocuments = input.issueDocuments !== false;
  if (!supplierId) throw statusError(400, 'supplier_required');
  if (periodEnd.getTime() <= periodStart.getTime()) throw statusError(400, 'invalid_period');

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, slug: true, title: true, legalName: true, inn: true, kpp: true, legalProfile: true },
  });
  if (!supplier) throw statusError(404, 'supplier_not_found');

  const ledgerWhere: Prisma.SupplierLedgerEntryWhereInput = {
    supplierId,
    createdAt: { gte: periodStart, lte: periodEnd },
  };
  const [ledgerRows, ledgerGroups, openRefundRequests, failedReceipts] = await Promise.all([
    prisma.supplierLedgerEntry.findMany({
      where: ledgerWhere,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        amountKopecks: true,
        currency: true,
        referenceType: true,
        referenceId: true,
        checkoutOrderId: true,
        checkoutItemId: true,
        paymentId: true,
        note: true,
        metaJson: true,
        createdAt: true,
      },
    }),
    prisma.supplierLedgerEntry.groupBy({
      by: ['type'],
      where: ledgerWhere,
      _sum: { amountKopecks: true },
    }),
    // Open refunds block period close regardless of request createdAt:
    // a refund opened after the period still leaves money unsettled for the supplier.
    prisma.refundRequest.count({
      where: {
        supplierId,
        status: { in: ['CREATED', 'APPROVED', 'PROCESSING'] },
      },
    }),
    prisma.fiscalReceipt.count({
      where: {
        supplierId,
        status: 'FAILED',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);
  const totals = summarizeLedgerGroups(ledgerGroups);
  const blockers = [
    ...(openRefundRequests ? ['open_refund_requests'] : []),
    ...(failedReceipts ? ['failed_fiscal_receipts'] : []),
    ...(totals.saleKopecks <= 0 ? ['no_sales_ledger'] : []),
    ...(ledgerRows.length === 0 ? ['no_ledger_entries'] : []),
  ];
  if (blockers.length) {
    const error = statusError(409, 'finance_period_blocked');
    (error as Error & { blockers?: string[] }).blockers = blockers;
    throw error;
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingReport = await tx.supplierReport.findUnique({
      where: {
        supplierId_periodStart_periodEnd_basis: {
          supplierId,
          periodStart,
          periodEnd,
          basis: basis as never,
        },
      },
    });
    if (existingReport && String(existingReport.status) === 'FINAL') {
      throw statusError(409, 'supplier_report_already_final');
    }

    const report = existingReport
      ? await tx.supplierReport.update({
          where: { id: existingReport.id },
          data: {
            status: 'DRAFT',
            hasConflict: false,
            grossKopecks: totals.saleKopecks,
            commissionKopecks: totals.commissionKopecks,
            refundKopecks: totals.refundKopecks,
            netKopecks: totals.netKopecks,
            snapshotJson: buildReportSnapshotJson(ledgerRows, totals),
            legalProfileSnapshot: buildLegalSnapshot(supplier),
            metaJson: { source: 'admin_finance_close_period', refreshedAt: new Date().toISOString() },
          },
          include: { supplier: { select: { id: true, title: true } } },
        })
      : await tx.supplierReport.create({
          data: {
            supplierId,
            periodStart,
            periodEnd,
            basis: basis as never,
            status: 'DRAFT',
            hasConflict: false,
            grossKopecks: totals.saleKopecks,
            commissionKopecks: totals.commissionKopecks,
            refundKopecks: totals.refundKopecks,
            netKopecks: totals.netKopecks,
            snapshotJson: buildReportSnapshotJson(ledgerRows, totals),
            legalProfileSnapshot: buildLegalSnapshot(supplier),
            metaJson: { source: 'admin_finance_close_period', createdAt: new Date().toISOString() },
          },
          include: { supplier: { select: { id: true, title: true } } },
        });

    await tx.supplierReportLine.deleteMany({ where: { supplierReportId: report.id } });
    await tx.supplierReportLine.createMany({
      data: ledgerRows.map((entry) => ({
        supplierReportId: report.id,
        ledgerEntryId: entry.id,
        type: mapLedgerTypeToReportLineType(String(entry.type)) as never,
        referenceType: entry.referenceType || null,
        referenceId: entry.referenceId || entry.checkoutOrderId || entry.paymentId || null,
        amountKopecks: entry.amountKopecks,
        netKopecks: entry.amountKopecks,
        metaJson: {
          checkoutOrderId: entry.checkoutOrderId,
          checkoutItemId: entry.checkoutItemId,
          paymentId: entry.paymentId,
          note: entry.note,
          createdAt: entry.createdAt.toISOString(),
        },
      })),
    });

    const existingSettlement = await tx.supplierSettlement.findFirst({
      where: {
        supplierId,
        periodStart,
        periodEnd,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
      include: { supplier: { select: { id: true, title: true } } },
    });
    const settlement = existingSettlement
      ? await tx.supplierSettlement.update({
          where: { id: existingSettlement.id },
          data: {
            status: 'FINALIZED',
            grossKopecks: totals.saleKopecks,
            commissionKopecks: totals.commissionKopecks,
            adjustmentKopecks: totals.adjustmentKopecks,
            netKopecks: totals.netKopecks,
            finalizedAt: new Date(),
            metaJson: { source: 'admin_finance_close_period', reportId: report.id },
          },
          include: { supplier: { select: { id: true, title: true } } },
        })
      : await tx.supplierSettlement.create({
          data: {
            supplierId,
            periodStart,
            periodEnd,
            status: 'FINALIZED',
            grossKopecks: totals.saleKopecks,
            commissionKopecks: totals.commissionKopecks,
            adjustmentKopecks: totals.adjustmentKopecks,
            netKopecks: totals.netKopecks,
            finalizedAt: new Date(),
            metaJson: { source: 'admin_finance_close_period', reportId: report.id },
          },
          include: { supplier: { select: { id: true, title: true } } },
        });

    const documents = issueDocuments
      ? await issueSupplierDocuments(tx, {
          supplierId,
          supplierTitle: supplier.title,
          reportId: report.id,
          settlementId: settlement.id,
          periodStart,
          periodEnd,
          totals,
        })
      : [];

    return { report, settlement, documents };
  });

  return {
    generatedAt: new Date().toISOString(),
    report: mapReport(result.report),
    settlement: mapSettlement(result.settlement),
    documents: result.documents.map(mapDocument),
    metrics: {
      ...totals,
      openRefundRequests,
      failedReceipts,
      draftReports: 1,
      openSettlements: 1,
      pendingDocuments: result.documents.length,
    },
    actions: [
      'Создан или обновлен черновик отчета агента',
      'Settlement закрыт в статусе FINALIZED',
      ...(issueDocuments ? ['Документы выпущены в статусе ISSUED'] : []),
    ],
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

function mapReport(report: Prisma.SupplierReportGetPayload<{ include: { supplier: { select: { id: true; title: true } } } }>): AdminFinanceLedgerDto['reports'][number] {
  return {
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
  };
}

function mapSettlement(settlement: Prisma.SupplierSettlementGetPayload<{ include: { supplier: { select: { id: true; title: true } } } }>): AdminFinanceLedgerDto['settlements'][number] {
  return {
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
  };
}

function mapDocument(document: Prisma.SupplierDocumentGetPayload<{ include: { supplier: { select: { id: true; title: true } }; files: { select: { id: true } } } }>): AdminFinanceLedgerDto['documents'][number] {
  return {
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
  };
}

async function issueSupplierDocuments(
  tx: Prisma.TransactionClient,
  input: {
    supplierId: string;
    supplierTitle: string;
    reportId: string;
    settlementId: string;
    periodStart: Date;
    periodEnd: Date;
    totals: ReturnType<typeof summarizeLedgerGroups>;
  },
): Promise<Array<Prisma.SupplierDocumentGetPayload<{ include: { supplier: { select: { id: true; title: true } }; files: { select: { id: true } } } }>>> {
  const specs = [
    { type: 'AGENT_REPORT', title: `Отчет агента - ${input.supplierTitle}` },
    { type: 'SERVICE_ACT', title: `Акт услуг - ${input.supplierTitle}` },
    { type: 'PAYOUT_STATEMENT', title: `Реестр выплат - ${input.supplierTitle}` },
  ];
  const documents = [];
  for (const spec of specs) {
    const existing = await tx.supplierDocument.findFirst({
      where: {
        supplierId: input.supplierId,
        reportId: input.reportId,
        settlementId: input.settlementId,
        type: spec.type as never,
        status: { not: 'CANCELLED' },
      },
      include: {
        supplier: { select: { id: true, title: true } },
        files: { select: { id: true } },
      },
    });
    const payloadJson = {
      source: 'admin_finance_close_period',
      periodStart: input.periodStart.toISOString(),
      periodEnd: input.periodEnd.toISOString(),
      totals: input.totals,
    };
    const document = existing
      ? await tx.supplierDocument.update({
          where: { id: existing.id },
          data: {
            status: 'ISSUED',
            title: spec.title,
            payloadJson,
          },
          include: {
            supplier: { select: { id: true, title: true } },
            files: { select: { id: true } },
          },
        })
      : await tx.supplierDocument.create({
          data: {
            supplierId: input.supplierId,
            reportId: input.reportId,
            settlementId: input.settlementId,
            type: spec.type as never,
            status: 'ISSUED',
            title: spec.title,
            payloadJson,
          },
          include: {
            supplier: { select: { id: true, title: true } },
            files: { select: { id: true } },
          },
        });
    documents.push(document);
  }
  return documents;
}

function buildReportSnapshotJson(
  ledgerRows: Array<{ id: string; type: unknown; amountKopecks: number; currency: string; referenceType: string | null; referenceId: string | null; checkoutOrderId: string | null; checkoutItemId: string | null; createdAt: Date }>,
  totals: ReturnType<typeof summarizeLedgerGroups>,
) {
  return {
    source: 'admin_finance_close_period',
    totals,
    ledgerCount: ledgerRows.length,
    ledgerEntries: ledgerRows.map((entry) => ({
      id: entry.id,
      type: String(entry.type),
      amountKopecks: entry.amountKopecks,
      currency: entry.currency,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      checkoutOrderId: entry.checkoutOrderId,
      checkoutItemId: entry.checkoutItemId,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

function buildLegalSnapshot(supplier: {
  id: string;
  slug: string;
  title: string;
  legalName: string | null;
  inn: string | null;
  kpp: string | null;
  legalProfile: {
    status?: unknown;
    legalName?: unknown;
    inn?: unknown;
    kpp?: unknown;
    taxMode?: unknown;
    isVatPayer?: unknown;
    defaultVatRate?: unknown;
    signerFullName?: unknown;
    signerPosition?: unknown;
    financeEmail?: unknown;
    docsEmail?: unknown;
  } | null;
}) {
  return {
    supplierId: supplier.id,
    slug: supplier.slug,
    title: supplier.title,
    legalName: supplier.legalName,
    inn: supplier.inn,
    kpp: supplier.kpp,
    legalProfile: supplier.legalProfile ? {
      status: String(supplier.legalProfile.status || ''),
      legalName: nullableSnapshotString(supplier.legalProfile.legalName),
      inn: nullableSnapshotString(supplier.legalProfile.inn),
      kpp: nullableSnapshotString(supplier.legalProfile.kpp),
      taxMode: nullableSnapshotString(supplier.legalProfile.taxMode),
      isVatPayer: typeof supplier.legalProfile.isVatPayer === 'boolean' ? supplier.legalProfile.isVatPayer : null,
      defaultVatRate: typeof supplier.legalProfile.defaultVatRate === 'string' ? supplier.legalProfile.defaultVatRate : null,
      signerFullName: nullableSnapshotString(supplier.legalProfile.signerFullName),
      signerPosition: nullableSnapshotString(supplier.legalProfile.signerPosition),
      financeEmail: nullableSnapshotString(supplier.legalProfile.financeEmail),
      docsEmail: nullableSnapshotString(supplier.legalProfile.docsEmail),
    } : null,
  };
}

function nullableSnapshotString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function mapLedgerTypeToReportLineType(type: string): string {
  if (type === 'SALE') return 'SALE';
  if (type === 'COMMISSION') return 'COMMISSION';
  if (type === 'REFUND') return 'REFUND';
  if (type === 'PAYOUT') return 'PAYOUT';
  return 'ADJUSTMENT';
}

function normalizeReportBasis(value: string | null | undefined): string {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'COMPLETED') return 'COMPLETED';
  return 'SOLD';
}

function buildReconcileNextActions(blockers: string[]): string[] {
  if (blockers.includes('open_refund_requests')) return ['Разобрать открытые заявки на возврат'];
  if (blockers.includes('failed_fiscal_receipts')) return ['Проверить ошибки чеков перед закрытием периода'];
  if (blockers.includes('no_sales_ledger')) return ['Дождаться продаж или выбрать другой период'];
  return ['Можно готовить черновик отчета агента и сверку с поставщиком'];
}

function parseDateStart(value: string | null): Date | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | null): Date | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(`${cleaned}T23:59:59.999Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequiredDate(value: string, errorMessage: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw statusError(400, errorMessage);
  return date;
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

function statusError(statusCode: number, message: string): Error & { statusCode: number } {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}
