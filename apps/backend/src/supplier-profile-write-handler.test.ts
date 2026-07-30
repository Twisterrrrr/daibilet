import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import {
  updateSupplierBankAccount,
  updateSupplierLegalProfile,
} from './supplier-profile-write-handler.js';

test('supplier onboarding write-flow updates legal profile and primary bank account', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_onboarding_${suffix}`;

  try {
    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug: `supplier-onboarding-${suffix}`,
        title: 'Onboarding Supplier',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
        email: 'old-finance@example.test',
      },
    });

    const legalProfile = await updateSupplierLegalProfile(
      new URLSearchParams({ supplierId }),
      {
        legalName: 'ООО Тестовый музей',
        legalAddress: 'Санкт-Петербург, Невский пр., 1',
        inn: '7800000000',
        kpp: '780001001',
        ogrn: '1027800000000',
        taxMode: 'USN_6',
        isVatPayer: false,
        defaultVatRate: null,
        signerFullName: 'Иванов Иван Иванович',
        signerPosition: 'Директор',
        financeEmail: 'finance@example.test',
        docsEmail: 'docs@example.test',
      },
    );

    assert.equal(legalProfile.legal.status, 'INCOMPLETE');
    assert.equal(legalProfile.legal.legalName, 'ООО Тестовый музей');
    assert.equal(legalProfile.legal.inn, '7800000000');
    assert.equal(legalProfile.legal.taxMode, 'USN_6');
    assert.equal(legalProfile.legal.financeEmail, 'finance@example.test');
    assert.equal(legalProfile.supplier.legalName, 'ООО Тестовый музей');
    assert.equal(legalProfile.supplier.email, 'finance@example.test');

    const bankProfile = await updateSupplierBankAccount(
      new URLSearchParams({ supplierId }),
      {
        bankName: 'Тест Банк',
        bik: '044525225',
        accountNumber: '40702810900000000001',
        correspondentAccount: '30101810400000000225',
        isPrimary: true,
      },
    );

    assert.equal(bankProfile.legal.status, 'INCOMPLETE');
    assert.equal(bankProfile.bankAccounts.length, 1);
    assert.equal(bankProfile.bankAccounts[0]?.bankName, 'Тест Банк');
    assert.equal(bankProfile.bankAccounts[0]?.bik, '044525225');
    assert.equal(bankProfile.bankAccounts[0]?.accountMask, '************0001');
    assert.equal(bankProfile.bankAccounts[0]?.correspondentMask, '************0225');
    assert.equal(bankProfile.bankAccounts[0]?.isPrimary, true);
  } finally {
    const legal = await prisma.supplierLegalProfile.findUnique({
      where: { supplierId },
      select: { id: true },
    });
    if (legal) await prisma.supplierBankAccount.deleteMany({ where: { supplierLegalProfileId: legal.id } });
    await prisma.supplierLegalProfile.deleteMany({ where: { supplierId } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
  }
});

async function canReachDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`select 1`;
    return true;
  } catch {
    return false;
  }
}
