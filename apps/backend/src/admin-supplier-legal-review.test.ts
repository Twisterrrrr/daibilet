import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { reviewSupplierLegalProfile } from './admin-supplier-legal-review.js';

test('admin can approve supplier legal profile with primary bank account', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_legal_approve_${suffix}`;
  const slug = `supplier-legal-approve-${suffix}`;

  try {
    const legalProfile = await seedSupplierLegalProfile({
      supplierId,
      slug,
      bank: true,
    });

    const detail = await reviewSupplierLegalProfile({
      supplierIdOrSlug: slug,
      action: 'approve',
    });

    assert.equal(detail.legal.status, 'VERIFIED');
    assert.ok(detail.legal.verifiedAt);
    assert.equal(detail.legal.rejectionComment, null);

    const stored = await prisma.supplierLegalProfile.findUnique({
      where: { id: legalProfile.id },
      select: { status: true, verifiedAt: true, rejectionComment: true, metaJson: true },
    });
    assert.equal(stored?.status, 'VERIFIED');
    assert.ok(stored?.verifiedAt);
    assert.equal(stored?.rejectionComment, null);
    assert.equal((stored?.metaJson as any)?.lastLegalReview?.action, 'approve');
    assert.equal((stored?.metaJson as any)?.lastLegalReview?.primaryBankAccount?.accountMask, '****************0001');
  } finally {
    await cleanupSupplier(supplierId);
  }
});

test('admin can reject supplier legal profile with comment for supplier', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_legal_reject_${suffix}`;
  const slug = `supplier-legal-reject-${suffix}`;

  try {
    await seedSupplierLegalProfile({
      supplierId,
      slug,
      bank: false,
    });

    await assert.rejects(
      reviewSupplierLegalProfile({
        supplierIdOrSlug: supplierId,
        action: 'reject',
        adminComment: '',
      }),
      /Комментарий обязателен/,
    );

    const detail = await reviewSupplierLegalProfile({
      supplierIdOrSlug: supplierId,
      action: 'reject',
      adminComment: 'Проверьте ИНН и расчетный счет.',
    });

    assert.equal(detail.legal.status, 'REJECTED');
    assert.equal(detail.legal.verifiedAt, null);
    assert.equal(detail.legal.rejectionComment, 'Проверьте ИНН и расчетный счет.');
  } finally {
    await cleanupSupplier(supplierId);
  }
});

test('admin approve requires a complete primary bank account', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_legal_blocked_${suffix}`;
  const slug = `supplier-legal-blocked-${suffix}`;

  try {
    await seedSupplierLegalProfile({
      supplierId,
      slug,
      bank: false,
    });

    await assert.rejects(
      reviewSupplierLegalProfile({
        supplierIdOrSlug: supplierId,
        action: 'approve',
      }),
      /основной банковский счет/,
    );
  } finally {
    await cleanupSupplier(supplierId);
  }
});

async function seedSupplierLegalProfile(input: {
  supplierId: string;
  slug: string;
  bank: boolean;
}) {
  await prisma.supplier.create({
    data: {
      id: input.supplierId,
      slug: input.slug,
      title: 'Legal Review Supplier',
      status: 'ACTIVE',
      integrationMode: 'INTERNAL_SALES',
      defaultCatalogMode: 'INTERNAL_CHECKOUT',
      paymentMode: 'SINGLE_MERCHANT',
      pspFeeMode: 'PLATFORM_PAYS',
      defaultCommissionBps: 1200,
      yookassaShopId: '1424801',
    },
  });

  const legalProfile = await prisma.supplierLegalProfile.create({
    data: {
      supplierId: input.supplierId,
      status: 'INCOMPLETE',
      legalName: 'ООО Тестовый музей',
      inn: '7800000000',
      kpp: '780001001',
      ogrn: '1027800000000',
      taxMode: 'USN_6',
      isVatPayer: false,
      defaultVatRate: null,
      financeEmail: 'finance@example.test',
    },
  });

  if (input.bank) {
    await prisma.supplierBankAccount.create({
      data: {
        supplierLegalProfileId: legalProfile.id,
        bankName: 'Тест Банк',
        bik: '044525225',
        accountNumber: '40702810900000000001',
        correspondentAccount: '30101810400000000225',
        isPrimary: true,
      },
    });
  }

  return legalProfile;
}

async function cleanupSupplier(supplierId: string): Promise<void> {
  const legal = await prisma.supplierLegalProfile.findUnique({
    where: { supplierId },
    select: { id: true },
  });
  if (legal) await prisma.supplierBankAccount.deleteMany({ where: { supplierLegalProfileId: legal.id } });
  await prisma.supplierLegalProfile.deleteMany({ where: { supplierId } });
  await prisma.supplier.deleteMany({ where: { id: supplierId } });
}

async function canReachDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`select 1`;
    return true;
  } catch {
    return false;
  }
}
