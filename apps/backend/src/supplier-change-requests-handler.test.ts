import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@daibilet/db';
import { createStubCheckoutOrder } from './checkout-stub.js';
import { applyApprovedEventChangeRequest } from './event-change-request-applier.js';
import { reviewEventChangeRequest } from './event-change-request-review.js';
import { buildSupplierPortalOrdersListDto } from './supplier-portal.dto.js';
import {
  buildSupplierChangeRequestsList,
  createSupplierAdmissionChangeRequest,
  createSupplierEventChangeRequest,
  parseSupplierChangeRequestsListQuery,
} from './supplier-change-requests-handler.js';
import { RequestValidationError } from './validation.js';

test('supplier change requests list query accepts SPA supplier routing keys', () => {
  const spaQuery = parseSupplierChangeRequestsListQuery(new URLSearchParams({
    limit: '50',
    supplier: 'test-museum-supplier',
  }));
  assert.equal(spaQuery.limit, 50);

  const resolvedQuery = parseSupplierChangeRequestsListQuery(new URLSearchParams({
    limit: '50',
    supplierId: 'sup_test',
  }));
  assert.equal(resolvedQuery.limit, 50);

  assert.throws(
    () => parseSupplierChangeRequestsListQuery(new URLSearchParams({ limit: '50', unexpected: '1' })),
    RequestValidationError,
  );
});

test('supplier change request write-flow creates admission and event requests', async (t) => {
  if (!await canReachDatabase()) {
    t.skip('database is not available');
    return;
  }

  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const supplierId = `sup_change_${suffix}`;
  const cityId = `city_change_${suffix}`;
  const venueId = `venue_change_${suffix}`;
  const outsiderVenueId = `venue_outside_${suffix}`;
  const searchParams = new URLSearchParams({ supplierId });
  let checkoutOrderId: string | null = null;

  try {
    await prisma.city.create({
      data: {
        id: cityId,
        slug: `change-city-${suffix}`,
        title: 'Тестовый город',
      },
    });
    await prisma.supplier.create({
      data: {
        id: supplierId,
        slug: `change-supplier-${suffix}`,
        title: 'Тестовый поставщик заявок',
        status: 'ACTIVE',
        integrationMode: 'INTERNAL_SALES',
        defaultCatalogMode: 'INTERNAL_CHECKOUT',
      },
    });
    await prisma.venue.createMany({
      data: [
        {
          id: venueId,
          slug: `change-venue-${suffix}`,
          title: 'Тестовый музей',
          cityId,
          pageStatus: 'PUBLISHED',
        },
        {
          id: outsiderVenueId,
          slug: `change-venue-outside-${suffix}`,
          title: 'Чужая площадка',
          cityId,
          pageStatus: 'PUBLISHED',
        },
      ],
    });
    await prisma.supplierVenue.create({
      data: {
        supplierId,
        venueId,
        isPrimary: true,
        isActive: true,
      },
    });

    const admission = await createSupplierAdmissionChangeRequest(searchParams, {
      title: 'Новый входной билет',
      summary: 'Проверить описание и цену',
      admissionProduct: {
        title: 'Билет в музей',
        type: 'MUSEUM_ENTRY',
        venueId,
        validityMode: 'OPEN_DATE',
        validDaysAfterPurchase: 30,
      },
      offers: [{ title: 'Взрослый', priceRub: 500, active: true }],
    });

    assert.equal(admission.request.subject, 'ADMISSION_PRODUCT');
    assert.equal(admission.request.type, 'CREATE');
    assert.equal(admission.request.status, 'SUBMITTED');
    assert.equal(admission.request.event, null);

    await reviewEventChangeRequest({
      requestId: admission.request.id,
      action: 'approve',
      adminComment: 'Smoke approve',
    });
    const applyResult = await applyApprovedEventChangeRequest({
      requestId: admission.request.id,
      actorSiteUserId: null,
    });
    assert.equal(applyResult.status, 'APPLIED');
    assert.ok(applyResult.admissionProductId);

    const product = await prisma.admissionProduct.findUnique({
      where: { id: applyResult.admissionProductId },
      include: { offers: { where: { active: true }, orderBy: { priceRub: 'asc' } } },
    });
    assert.ok(product);
    assert.equal(product.supplierId, supplierId);
    assert.equal(product.venueId, venueId);
    assert.equal(product.status, 'PUBLISHED');
    assert.equal(product.purchaseFlow, 'PLATFORM');
    assert.equal(product.managementMode, 'DAIBILET_MANAGED');
    assert.equal(product.priceFromRub, 500);
    assert.equal(product.offers.length, 1);

    const previousStubFlag = process.env.DAIBILET_STUB_CHECKOUT;
    process.env.DAIBILET_STUB_CHECKOUT = '1';
    let checkout: Awaited<ReturnType<typeof createStubCheckoutOrder>>;
    try {
      checkout = await createStubCheckoutOrder({
        subjectType: 'VENUE_ADMISSION',
        admissionProductId: product.id,
        admissionOfferId: product.offers[0]?.id || null,
        quantity: 1,
        buyer: {
          email: 'buyer-change-smoke@example.test',
          name: 'Smoke Buyer',
          phone: '+79990000000',
        },
        idempotencyKey: `supplier-change-${suffix}`,
      });
    } finally {
      if (previousStubFlag === undefined) {
        delete process.env.DAIBILET_STUB_CHECKOUT;
      } else {
        process.env.DAIBILET_STUB_CHECKOUT = previousStubFlag;
      }
    }
    assert.equal(checkout.order.subject.type, 'VENUE_ADMISSION');
    assert.equal(checkout.order.subject.admissionProductId, product.id);
    checkoutOrderId = checkout.order.id;

    const orders = await buildSupplierPortalOrdersListDto(new URLSearchParams({
      supplierId,
      q: checkout.order.publicCode,
      limit: '10',
    }));
    assert.equal(orders.total, 1);
    assert.equal(orders.items[0]?.publicCode, checkout.order.publicCode);
    assert.equal(orders.items[0]?.admissionProductId, product.id);

    const event = await createSupplierEventChangeRequest(searchParams, {
      title: 'Новое событие',
      summary: 'Нужна публикация после проверки',
      event: {
        title: 'Ночь в музее',
        kind: 'OPEN_DATE',
        venueId,
        description: 'Открытая дата для тестового события',
      },
      schedule: {
        mode: 'OPEN_DATE',
        openDate: { validDays: 30 },
      },
      offers: [{ title: 'Билет', priceRub: 700, active: true }],
    });

    assert.equal(event.request.subject, 'EVENT');
    assert.equal(event.request.type, 'CREATE');
    assert.equal(event.request.status, 'SUBMITTED');

    const admissionList = await buildSupplierChangeRequestsList(searchParams, {
      subject: 'ADMISSION_PRODUCT',
      limit: 10,
      offset: 0,
    });
    assert.equal(admissionList.total, 1);
    assert.equal(admissionList.items[0]?.title, 'Новый входной билет');

    await assert.rejects(
      () => createSupplierEventChangeRequest(searchParams, {
        title: 'Чужое событие',
        event: {
          title: 'Чужая площадка',
          kind: 'OPEN_DATE',
          venueId: outsiderVenueId,
        },
      }),
      /Площадка не привязана/,
    );
  } finally {
    await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } });
    await prisma.fulfillmentItem.deleteMany({
      where: { order: { items: { some: { admissionProduct: { supplierId } } } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { items: { some: { admissionProduct: { supplierId } } } } },
    });
    await prisma.checkoutItem.deleteMany({ where: { admissionProduct: { supplierId } } });
    if (checkoutOrderId) await prisma.checkoutOrder.deleteMany({ where: { id: checkoutOrderId } });
    await prisma.idempotencyKey.deleteMany({ where: { key: `supplier-change-${suffix}` } });
    await prisma.eventChangeRequest.deleteMany({ where: { supplierId } });
    await prisma.admissionOffer.deleteMany({ where: { admissionProduct: { supplierId } } });
    await prisma.admissionProduct.deleteMany({ where: { supplierId } });
    await prisma.supplierVenue.deleteMany({ where: { supplierId } });
    await prisma.venue.deleteMany({ where: { id: { in: [venueId, outsiderVenueId] } } });
    await prisma.supplier.deleteMany({ where: { id: supplierId } });
    await prisma.city.deleteMany({ where: { id: cityId } });
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
