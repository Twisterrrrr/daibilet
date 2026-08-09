import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { buildAdminFinanceLedgerDto, closeAdminFinancePeriod } from './admin-finance.dto.js';

test('closes supplier finance period from reconciled ledger', async () => {
  const suffix = `finance-close-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_${suffix}`;
  const ledgerSale = `ledger_sale_${suffix}`;
  const ledgerCommission = `ledger_commission_${suffix}`;
  const periodStart = '2026-08-01T00:00:00.000Z';
  const periodEnd = '2026-08-31T23:59:59.999Z';

  try {
    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug: `supplier-${suffix}`,
        title: 'Finance Close Supplier',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
        paymentMode: 'SINGLE_MERCHANT',
        defaultCommissionBps: 1000,
      },
    });
    await prisma.supplierLedgerEntry.createMany({
      data: [
        {
          id: ledgerSale,
          supplierId,
          type: 'SALE',
          amountKopecks: 100_000,
          currency: 'RUB',
          referenceType: 'checkout_order',
          referenceId: `order_${suffix}`,
          checkoutOrderId: `order_${suffix}`,
          createdAt: new Date('2026-08-10T12:00:00.000Z'),
        },
        {
          id: ledgerCommission,
          supplierId,
          type: 'COMMISSION',
          amountKopecks: -10_000,
          currency: 'RUB',
          referenceType: 'checkout_order',
          referenceId: `order_${suffix}`,
          checkoutOrderId: `order_${suffix}`,
          createdAt: new Date('2026-08-10T12:00:01.000Z'),
        },
      ],
    });

    const before = await buildAdminFinanceLedgerDto(new URLSearchParams({ supplier: supplierId, from: '2026-08-01', to: '2026-08-31' }));
    assert.equal(before.reconcile.readyToDraftReport, true);
    assert.equal(before.metrics.netKopecks, 90_000);

    const result = await closeAdminFinancePeriod({
      supplierId,
      periodStart,
      periodEnd,
      basis: 'SOLD',
      issueDocuments: true,
    });
    assert.equal(result.report.status, 'DRAFT');
    assert.equal(result.report.netKopecks, 90_000);
    assert.equal(result.settlement.status, 'FINALIZED');
    assert.equal(result.settlement.netKopecks, 90_000);
    assert.deepEqual(result.documents.map((document) => document.type).sort(), ['AGENT_REPORT', 'PAYOUT_STATEMENT', 'SERVICE_ACT']);
    assert.equal(result.documents.every((document) => document.status === 'ISSUED'), true);

    const lines = await prisma.supplierReportLine.findMany({ where: { supplierReportId: result.report.id } });
    assert.equal(lines.length, 2);

    const repeat = await closeAdminFinancePeriod({
      supplierId,
      periodStart,
      periodEnd,
      basis: 'SOLD',
      issueDocuments: true,
    });
    assert.equal(repeat.report.id, result.report.id);
    assert.equal(repeat.documents.length, 3);
    assert.equal(await prisma.supplierReportLine.count({ where: { supplierReportId: result.report.id } }), 2);
  } finally {
    await prisma.supplierDocument.deleteMany({ where: { supplierId } });
    await prisma.supplierSettlement.deleteMany({ where: { supplierId } });
    await prisma.supplierReportLine.deleteMany({ where: { report: { supplierId } } });
    await prisma.supplierReport.deleteMany({ where: { supplierId } });
    await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
  }
});

test('blocks finance period close while refund request is open', async () => {
  const suffix = `finance-block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_${suffix}`;

  try {
    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug: `supplier-${suffix}`,
        title: 'Finance Block Supplier',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
        paymentMode: 'SINGLE_MERCHANT',
        defaultCommissionBps: 1000,
      },
    });
    await prisma.supplierLedgerEntry.create({
      data: {
        id: `ledger_${suffix}`,
        supplierId,
        type: 'SALE',
        amountKopecks: 100_000,
        referenceType: 'checkout_order',
        referenceId: `order_${suffix}`,
        createdAt: new Date('2026-08-10T12:00:00.000Z'),
      },
    });
    await prisma.refundRequest.create({
      data: {
        supplierId,
        amountKopecks: 10_000,
        reason: 'USER_REQUEST',
        status: 'CREATED',
      },
    });

    await assert.rejects(
      () => closeAdminFinancePeriod({
        supplierId,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-31T23:59:59.999Z',
        basis: 'SOLD',
      }),
      /finance_period_blocked/,
    );
  } finally {
    await prisma.refundRequest.deleteMany({ where: { supplierId } });
    await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
  }
});
