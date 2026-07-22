import assert from 'node:assert/strict';
import test from 'node:test';
import { mapAdminSupplierRow, resolveSupplierCheckoutReadiness } from './admin-suppliers.dto.js';

test('blocks internal checkout when supplier commercial prerequisites are missing', () => {
  const readiness = resolveSupplierCheckoutReadiness({
    status: 'DRAFT',
    legalProfileStatus: null,
    hasLegalProfile: false,
    hasPrimaryBankAccount: false,
    ownerUsersCount: 0,
    activeCommissionRules: 0,
    defaultCommissionBps: 0,
    yookassaShopId: null,
    internalCheckoutEvents: 0,
  });

  assert.equal(readiness.canEnableInternalCheckout, false);
  assert.equal(readiness.status, 'blocked');
  assert.deepEqual(
    readiness.blockers.map((issue) => issue.code),
    [
      'SUPPLIER_NOT_ACTIVE',
      'MISSING_OWNER_USER',
      'MISSING_LEGAL_PROFILE',
      'MISSING_PRIMARY_BANK_ACCOUNT',
      'MISSING_COMMISSION_RULE',
      'MISSING_YOOKASSA_SHOP',
    ],
  );
  assert.deepEqual(readiness.warnings.map((issue) => issue.code), ['NO_INTERNAL_CHECKOUT_EVENTS']);
});

test('allows internal checkout readiness after legal, bank, commission and payment setup', () => {
  const readiness = resolveSupplierCheckoutReadiness({
    status: 'ACTIVE',
    legalProfileStatus: 'VERIFIED',
    hasLegalProfile: true,
    hasPrimaryBankAccount: true,
    ownerUsersCount: 1,
    activeCommissionRules: 1,
    defaultCommissionBps: 0,
    yookassaShopId: 'shop_123',
    internalCheckoutEvents: 2,
  });

  assert.equal(readiness.canEnableInternalCheckout, true);
  assert.equal(readiness.status, 'ready');
  assert.deepEqual(readiness.blockers, []);
  assert.deepEqual(readiness.warnings, []);
});

test('keeps supplier in review when commercial setup is ready but no internal events exist yet', () => {
  const readiness = resolveSupplierCheckoutReadiness({
    status: 'ACTIVE',
    legalProfileStatus: 'VERIFIED',
    hasLegalProfile: true,
    hasPrimaryBankAccount: true,
    ownerUsersCount: 1,
    activeCommissionRules: 0,
    defaultCommissionBps: 1500,
    yookassaShopId: 'shop_123',
    internalCheckoutEvents: 0,
  });

  assert.equal(readiness.canEnableInternalCheckout, true);
  assert.equal(readiness.status, 'review');
  assert.deepEqual(readiness.warnings.map((issue) => issue.code), ['NO_INTERNAL_CHECKOUT_EVENTS']);
});

test('maps supplier row with finance and event aggregates for admin list', () => {
  const dto = mapAdminSupplierRow(
    {
      id: 'sup_1',
      slug: 'museum',
      title: 'Museum',
      legalName: 'Museum LLC',
      kind: 'LEGAL_ENTITY',
      status: 'ACTIVE',
      email: 'ops@example.com',
      phone: null,
      websiteUrl: null,
      yookassaShopId: 'shop_123',
      defaultCatalogMode: 'HYBRID',
      paymentMode: 'SINGLE_MERCHANT',
      pspFeeMode: 'PLATFORM_PAYS',
      defaultCommissionBps: 1200,
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-02T10:00:00.000Z'),
      users: [
        { id: 'su_1', role: 'OWNER', isActive: true, acceptedAt: null, siteUser: { email: 'owner@example.com', name: 'Owner' } },
      ],
      legalProfile: {
        status: 'VERIFIED',
        legalName: 'Museum LLC',
        inn: '7700000000',
        taxMode: 'USN_6',
        isVatPayer: false,
        bankAccounts: [{ id: 'bank_1', isPrimary: true }],
      },
      commissionRules: [],
    } as any,
    {
      eventGroups: new Map([
        [
          'sup_1',
          [
            {
              supplierId: 'sup_1',
              status: 'PUBLISHED',
              purchaseFlow: 'PLATFORM',
              managementMode: 'DAIBILET_MANAGED',
              _count: { _all: 2 },
            },
          ],
        ],
      ]),
      supplierEventGroups: new Map(),
      orderGroups: new Map([
        [
          'sup_1',
          [
            {
              supplierId: 'sup_1',
              status: 'FULFILLED',
              _count: { _all: 3 },
              _sum: { totalKopecks: 300000, commissionKopecks: 36000 },
            },
          ],
        ],
      ]),
      ledgerGroups: new Map([
        [
          'sup_1',
          [
            { supplierId: 'sup_1', type: 'SALE', _sum: { amountKopecks: 300000 } },
            { supplierId: 'sup_1', type: 'COMMISSION', _sum: { amountKopecks: -36000 } },
          ],
        ],
      ]),
      payoutGroups: new Map(),
      refundGroups: new Map(),
      disputeGroups: new Map(),
      reviewGroups: new Map(),
      reviewAverages: new Map(),
    } as any,
  );

  assert.equal(dto.events.total, 2);
  assert.equal(dto.events.internalCheckout, 2);
  assert.equal(dto.orders.fulfilled, 3);
  assert.equal(dto.finance.ledgerBalanceKopecks, 264000);
  assert.equal(dto.readiness.canEnableInternalCheckout, true);
});
