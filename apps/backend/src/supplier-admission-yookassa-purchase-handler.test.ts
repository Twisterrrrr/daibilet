import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { readYooKassaRuntimeConfig } from './checkout-yookassa.js';
import { createSupplierAdmissionYooKassaPurchase } from './supplier-admission-yookassa-purchase-handler.js';

const now = new Date('2026-07-30T12:00:00.000Z');

test('supplier admission YooKassa smoke creates supplier-scoped pending payment', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    city: `city_supplier_yk_${suffix}`,
    venue: `venue_supplier_yk_${suffix}`,
    supplier: `sup_supplier_yk_${suffix}`,
    otherSupplier: `sup_other_yk_${suffix}`,
    product: `adp_supplier_yk_${suffix}`,
    offer: `ado_supplier_yk_${suffix}`,
  };
  const email = `yookassa-buyer-${suffix}@example.test`;
  const idempotencyKey = `supplier-admission-yookassa-${suffix}`;

  try {
    await prisma.city.create({
      data: {
        id: ids.city,
        slug: `supplier-yookassa-city-${suffix}`,
        title: 'Supplier YooKassa city',
      },
    });
    await prisma.venue.create({
      data: {
        id: ids.venue,
        slug: `supplier-yookassa-venue-${suffix}`,
        title: 'Supplier YooKassa venue',
        cityId: ids.city,
        kind: 'MUSEUM_ART_SPACE',
        pageStatus: 'PUBLISHED',
      },
    });
    await prisma.supplier.createMany({
      data: [
        {
          id: ids.supplier,
          slug: `supplier-yookassa-${suffix}`,
          title: 'Supplier YooKassa',
          status: 'ACTIVE',
          integrationMode: 'INTERNAL_SALES',
          defaultCatalogMode: 'INTERNAL_CHECKOUT',
          defaultCommissionBps: 1000,
        },
        {
          id: ids.otherSupplier,
          slug: `supplier-yookassa-other-${suffix}`,
          title: 'Other Supplier YooKassa',
          status: 'ACTIVE',
          integrationMode: 'INTERNAL_SALES',
          defaultCatalogMode: 'INTERNAL_CHECKOUT',
        },
      ],
    });
    await prisma.admissionProduct.create({
      data: {
        id: ids.product,
        slug: `supplier-yookassa-admission-${suffix}`,
        title: 'Supplier YooKassa admission',
        type: 'MUSEUM_ENTRY',
        status: 'PUBLISHED',
        purchaseFlow: 'PLATFORM',
        managementMode: 'DAIBILET_MANAGED',
        sourceCode: 'MANUAL',
        priceFromRub: 900,
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
        priceRub: 900,
        active: true,
      },
    });

    const fakeFetch = async () => new Response(JSON.stringify({
      id: `pay_supplier_${suffix}`,
      status: 'pending',
      amount: { value: '900.00', currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        confirmation_url: `https://yookassa.test/pay/supplier/${suffix}`,
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const result = await createSupplierAdmissionYooKassaPurchase(
      new URLSearchParams({ supplierId: ids.supplier }),
      ids.product,
      {
        admissionOfferId: ids.offer,
        quantity: 1,
        buyer: {
          email,
          name: 'YooKassa Buyer',
          phone: '+79990000000',
        },
        idempotencyKey,
      },
      {
        config: readYooKassaRuntimeConfig({
          NODE_ENV: 'test',
          DAIBILET_YOOKASSA_CHECKOUT: '1',
          YOOKASSA_SHOP_ID: 'shop_123',
          YOOKASSA_SECRET_KEY: 'test_secret',
          PUBLIC_SITE_URL: 'https://daibilet.ru',
        } as NodeJS.ProcessEnv),
        fetchImpl: fakeFetch,
        idempotencyKey,
      },
    );

    assert.equal(result.mode, 'YOOKASSA');
    assert.equal(result.order.subject.type, 'VENUE_ADMISSION');
    assert.equal(result.order.subject.admissionProductId, ids.product);
    assert.equal(result.order.item.supplierId, ids.supplier);
    assert.equal(result.order.item.offerId, ids.offer);
    assert.equal(result.order.payment.status, 'PENDING');
    assert.equal(result.order.payment.confirmationUrl, `https://yookassa.test/pay/supplier/${suffix}`);

    const productAfterPurchase = await prisma.admissionProduct.findUnique({
      where: { id: ids.product },
      select: { ticketsVacant: true },
    });
    assert.equal(productAfterPurchase?.ticketsVacant, 4);

    await assert.rejects(
      () => createSupplierAdmissionYooKassaPurchase(
        new URLSearchParams({ supplierId: ids.otherSupplier }),
        ids.product,
        { admissionOfferId: ids.offer, quantity: 1, buyer: { email } },
        {
          config: readYooKassaRuntimeConfig({
            NODE_ENV: 'test',
            DAIBILET_YOOKASSA_CHECKOUT: '1',
            YOOKASSA_SHOP_ID: 'shop_123',
            YOOKASSA_SECRET_KEY: 'test_secret',
          } as NodeJS.ProcessEnv),
          fetchImpl: fakeFetch,
          idempotencyKey: `${idempotencyKey}-other`,
        },
      ),
      (error: unknown) => error instanceof Error &&
        (error as Error & { statusCode?: number }).statusCode === 404,
    );
  } finally {
    await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId: { in: [ids.supplier, ids.otherSupplier] } } });
    await prisma.fulfillmentItem.deleteMany({ where: { order: { buyerEmail: email } } });
    await prisma.payment.deleteMany({ where: { order: { buyerEmail: email } } });
    await prisma.checkoutItem.deleteMany({ where: { admissionProductId: ids.product } });
    await prisma.checkoutOrder.deleteMany({ where: { buyerEmail: email } });
    await prisma.idempotencyKey.deleteMany({ where: { key: { in: [idempotencyKey, `${idempotencyKey}-other`] } } });
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
