import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { loadSupplierCheckoutPurchaseRows } from './purchase-projection.js';
import { createSupplierAdmissionStubPurchase } from './supplier-admission-stub-purchase-handler.js';

test('supplier admission smoke purchase creates visible supplier order', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    city: `city_supplier_smoke_${suffix}`,
    venue: `venue_supplier_smoke_${suffix}`,
    supplier: `sup_supplier_smoke_${suffix}`,
    otherSupplier: `sup_other_smoke_${suffix}`,
    product: `adp_supplier_smoke_${suffix}`,
    offer: `ado_supplier_smoke_${suffix}`,
  };
  const email = `smoke-buyer-${suffix}@example.test`;
  const idempotencyKey = `supplier-admission-smoke-${suffix}`;
  const originalStubCheckout = process.env.DAIBILET_STUB_CHECKOUT;

  try {
    process.env.DAIBILET_STUB_CHECKOUT = '1';
    await prisma.city.create({
      data: {
        id: ids.city,
        slug: `supplier-smoke-city-${suffix}`,
        title: 'Supplier smoke city',
      },
    });
    await prisma.venue.create({
      data: {
        id: ids.venue,
        slug: `supplier-smoke-venue-${suffix}`,
        title: 'Supplier smoke venue',
        cityId: ids.city,
        kind: 'MUSEUM_ART_SPACE',
        pageStatus: 'PUBLISHED',
      },
    });
    await prisma.supplier.createMany({
      data: [
        {
          id: ids.supplier,
          slug: `supplier-smoke-${suffix}`,
          title: 'Supplier smoke',
          status: 'ACTIVE',
          integrationMode: 'INTERNAL_SALES',
          defaultCatalogMode: 'INTERNAL_CHECKOUT',
          defaultCommissionBps: 1000,
        },
        {
          id: ids.otherSupplier,
          slug: `supplier-smoke-other-${suffix}`,
          title: 'Other supplier smoke',
          status: 'ACTIVE',
          integrationMode: 'INTERNAL_SALES',
          defaultCatalogMode: 'INTERNAL_CHECKOUT',
        },
      ],
    });
    await prisma.admissionProduct.create({
      data: {
        id: ids.product,
        slug: `supplier-smoke-admission-${suffix}`,
        title: 'Supplier smoke admission',
        type: 'MUSEUM_ENTRY',
        status: 'PUBLISHED',
        purchaseFlow: 'PLATFORM',
        managementMode: 'DAIBILET_MANAGED',
        sourceCode: 'MANUAL',
        priceFromRub: 700,
        ticketsVacant: 5,
        validityMode: 'OPEN_DATE',
        venueId: ids.venue,
        cityId: ids.city,
        supplierId: ids.supplier,
      },
    });
    await prisma.admissionOffer.create({
      data: {
        id: ids.offer,
        admissionProductId: ids.product,
        sourceCode: 'MANUAL',
        title: 'Взрослый',
        priceRub: 700,
        active: true,
      },
    });

    const result = await createSupplierAdmissionStubPurchase(
      new URLSearchParams({ supplierId: ids.supplier }),
      ids.product,
      {
        admissionOfferId: ids.offer,
        quantity: 2,
        buyer: {
          email,
          name: 'Smoke Buyer',
          phone: '+79990000000',
        },
        idempotencyKey,
      },
    );

    assert.equal(result.mode, 'STUB');
    assert.equal(result.order.subject.type, 'VENUE_ADMISSION');
    assert.equal(result.order.subject.admissionProductId, ids.product);
    assert.equal(result.order.item.supplierId, ids.supplier);
    assert.equal(result.order.item.offerId, ids.offer);
    assert.equal(result.order.item.quantity, 2);
    assert.equal(result.order.totals.totalKopecks, 140_000);

    const productAfterPurchase = await prisma.admissionProduct.findUnique({
      where: { id: ids.product },
      select: { ticketsVacant: true },
    });
    assert.equal(productAfterPurchase?.ticketsVacant, 3);

    const supplierOrders = await loadSupplierCheckoutPurchaseRows(ids.supplier, new URLSearchParams({ limit: '10' }));
    assert.equal(supplierOrders.items.some((order) => order.publicCode === result.order.publicCode), true);

    await assert.rejects(
      () => createSupplierAdmissionStubPurchase(
        new URLSearchParams({ supplierId: ids.otherSupplier }),
        ids.product,
        { admissionOfferId: ids.offer, quantity: 1, buyer: { email } },
      ),
      (error: unknown) => error instanceof Error &&
        (error as Error & { statusCode?: number }).statusCode === 404,
    );
  } finally {
    if (originalStubCheckout == null) delete process.env.DAIBILET_STUB_CHECKOUT;
    else process.env.DAIBILET_STUB_CHECKOUT = originalStubCheckout;

    await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId: { in: [ids.supplier, ids.otherSupplier] } } });
    await prisma.fulfillmentItem.deleteMany({ where: { order: { buyerEmail: email } } });
    await prisma.payment.deleteMany({ where: { order: { buyerEmail: email } } });
    await prisma.checkoutItem.deleteMany({ where: { admissionProductId: ids.product } });
    await prisma.checkoutOrder.deleteMany({ where: { buyerEmail: email } });
    await prisma.idempotencyKey.deleteMany({ where: { key: idempotencyKey } });
    await prisma.admissionOffer.deleteMany({ where: { admissionProductId: ids.product } });
    await prisma.admissionProduct.deleteMany({ where: { id: ids.product } });
    await prisma.supplier.deleteMany({ where: { id: { in: [ids.supplier, ids.otherSupplier] } } });
    await prisma.venue.deleteMany({ where: { id: ids.venue } });
    await prisma.city.deleteMany({ where: { id: ids.city } });
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
